import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Navigation from "../components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogContentWithoutClose,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { MapPin, Clock, DollarSign, User, MessageCircle, CheckCircle, XCircle, Send } from "lucide-react";
import apiService from "../services/api";
import socketService from "../services/socket";
import Messages from "../components/Messages";

interface HelpRequest {
  _id: string;
  title: string;
  description: string;
  category: {
    _id: string;
    name: string;
    description: string;
    icon: string;
  };
  requester: {
    _id: string;
    name: string;
    email: string;
    picture?: string;
  };
  helper?: {
    _id: string;
    name: string;
    email: string;
    picture?: string;
  };
  skillsNeeded: string[];
  urgency: "low" | "medium" | "high";
  estimatedDuration: string;
  location: string;
  isRemote: boolean;
  budgetMin?: number;
  budgetMax?: number;
  status: "open" | "in_progress" | "completed";
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

const MyRequests = () => {
  const { user } = useAuth();
  const { showMessageNotification, showSuccessNotification, showErrorNotification } = useCustomToast();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [previousRequests, setPreviousRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showMessagesDialog, setShowMessagesDialog] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);

  useEffect(() => {
    loadMyRequests();
    
    // Initialize socket connection if user is logged in
    if (user?.id) {
      socketService.connect(user.id);
      
      // Set up notification listener for new messages
      socketService.onNotification((notification) => {
        console.log("🔔 Requester received notification:", notification);
        showMessageNotification("New Message", notification.message);
        
        // Increment new message count
        setNewMessageCount(prev => prev + 1);
        
        // Refresh requests to show updated status
        loadMyRequests();
      });

      // Listen for request status changes (when someone accepts the request)
      socketService.onMessage((message) => {
        // Check if this is a system message about request acceptance
        if (message.messageType === 'system' && message.message.includes('accepted')) {
          console.log("🎉 Request was accepted by someone!");
          showSuccessNotification("Request Accepted!", "Someone has accepted your request. You can now start messaging!");
          
          // Refresh requests and potentially open message dialog
          loadMyRequests();
        }
      });

      // Listen for direct request acceptance events
      if (socketService.socket) {
        socketService.socket.on("request_accepted", (data) => {
          console.log("🎉 Direct request acceptance event:", data);
          if (data.requesterId === user?.id) {
            showSuccessNotification("Request Accepted!", `Your request "${data.requestTitle}" has been accepted! Opening conversation...`);
            // Refresh requests to get updated data
            loadMyRequests();
          }
        });
      }

      // Listen for request status updates
      socketService.socket?.on("request_status_updated", (data) => {
        console.log("🔄 Request status updated:", data);
        if (data.requesterId === user?.id && data.status === 'in_progress') {
          showSuccessNotification("Request Accepted!", `Your request "${data.requestTitle}" has been accepted! Opening conversation...`);
          loadMyRequests();
        }
        // Listen for request completion
        if (data.requesterId === user?.id && data.status === 'completed') {
          showSuccessNotification("Request Completed!", `Your request "${data.requestTitle}" has been marked as completed by ${data.completedByName || 'the helper'}.`);
          loadMyRequests();
        }
      });
    }
    
    // Cleanup on unmount
    return () => {
      socketService.offNotification();
      socketService.offMessage();
      if (socketService.socket) {
        socketService.socket.off("request_accepted");
        socketService.socket.off("request_status_updated");
      }
    };
  }, [user]);

  const loadMyRequests = async () => {
    try {
      setLoading(true);
      const data = await apiService.getRequests();
      // Filter requests by current user's ID - show ALL requests (open, in_progress, completed)
      const myRequests = data.filter(
        (req: HelpRequest) => req.requester._id === user?.id
      );
      
      console.log("📋 Current requests:", myRequests.map(r => ({ id: r._id, title: r.title, status: r.status, helper: r.helper?.name })));
      console.log("📋 Previous requests:", previousRequests.map(r => ({ id: r._id, title: r.title, status: r.status, helper: r.helper?.name })));
      
      // Check if any request was just accepted (status changed to in_progress)
      const newlyAcceptedRequest = myRequests.find(req => 
        req.status === 'in_progress' && req.helper && 
        !previousRequests.find(existingReq => 
          existingReq._id === req._id && existingReq.status === 'in_progress' && existingReq.helper
        )
      );
      
      console.log("🎯 Newly accepted request:", newlyAcceptedRequest);
      
      // Update previous requests for next comparison
      setPreviousRequests(requests);
      setRequests(myRequests);
      
      // Automatically open message dialog for newly accepted request
      if (newlyAcceptedRequest) {
        console.log("🎉 Auto-opening message dialog for newly accepted request:", newlyAcceptedRequest.title);
        showSuccessNotification("Request Accepted!", `Your request "${newlyAcceptedRequest.title}" has been accepted! Opening conversation...`);
        setTimeout(() => {
          setSelectedRequest(newlyAcceptedRequest);
          setShowMessagesDialog(true);
        }, 1000); // Small delay to ensure UI is ready
      }
      
    } catch (error) {
      console.error("Failed to load requests:", error);
      showErrorNotification("Error", "Failed to load your requests");
    } finally {
      setLoading(false);
    }
  };



  const openMessages = (request: HelpRequest) => {
    // Safety check - ensure request has required data
    if (!request.requester) {
      showErrorNotification("Error", "Cannot open chat - request data is incomplete");
      return;
    }
    
    setSelectedRequest(request);
    setShowMessagesDialog(true);
  };

  const openMessageDialog = (request: HelpRequest) => {
    setSelectedRequest(request);
    setShowMessageDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return "No budget specified";
    if (min && max) return `$${min} - $${max}`;
    if (min) return `From $${min}`;
    if (max) return `Up to $${max}`;
    return "No budget specified";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  My Requests
                </h1>
                <p className="text-gray-300">
                  All requests you've created (open, in progress, and completed)
                </p>
              </div>
              {newMessageCount > 0 && (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="animate-pulse bg-gradient-to-r from-red-500 to-pink-500 rounded-full p-1">
                      <Badge className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 text-sm font-semibold border-0 shadow-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                          {newMessageCount} new message{newMessageCount > 1 ? 's' : ''}
                        </div>
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setNewMessageCount(0)}
                    className="border-slate-600 text-white hover:bg-slate-700 transition-all duration-200 hover:scale-105"
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
              <p className="mt-2 text-gray-300">Loading your requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="text-center py-12">
                <p className="text-gray-300 mb-4">
                  You haven't created any help requests yet.
                </p>
                <Button onClick={() => window.location.href = '/send-request'} variant="outline">
                  Create Your First Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requests.map((request) => (
                <Card key={request._id} className="hover:shadow-lg transition-shadow bg-gray-900 border-gray-700">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2 text-white">
                          {request.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{request.category?.name || 'Unknown Category'}</Badge>
                          <Badge className={getUrgencyColor(request.urgency)}>
                            {request.urgency}
                          </Badge>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <p className="text-gray-300 mb-4 line-clamp-3">
                      {request.description}
                    </p>

                    {request.skillsNeeded && request.skillsNeeded.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-200 mb-2">
                          Skills needed:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {request.skillsNeeded.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 text-sm text-gray-300">
                      {request.estimatedDuration && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{request.estimatedDuration}</span>
                        </div>
                      )}

                      {request.location && !request.isRemote && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{request.location}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>{formatBudget(request.budgetMin, request.budgetMax)}</span>
                      </div>

                      <div className="text-xs text-gray-400">
                        Posted {formatDate(request.createdAt)}
                      </div>

                      {request.helper && request.helper.name && (
                        <div className="flex items-center gap-2 mt-3 p-2 bg-gray-800 rounded">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={request.helper.picture} />
                            <AvatarFallback>
                              {request.helper.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-300">
                            Helper: {request.helper.name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      {request.status === "open" && (
                        <Button
                          variant="outline"
                          className="flex-1 border-slate-600 text-slate-400 cursor-not-allowed"
                          disabled
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Waiting for Helper
                        </Button>
                      )}
                      
                      {request.status === "in_progress" && request.helper && (
                        <Button
                          onClick={() => openMessages(request)}
                          className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Chat with Helper
                        </Button>
                      )}
                      
                      {request.status === "completed" && (
                        <Button
                          variant="outline"
                          className="flex-1 border-green-600 text-green-400 cursor-not-allowed"
                          disabled
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Completed
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages Dialog - Full Conversation */}
      <Dialog open={showMessagesDialog} onOpenChange={setShowMessagesDialog}>
        <DialogContentWithoutClose className="max-w-4xl max-h-[80vh] overflow-y-auto bg-transparent border-none p-0">
          {selectedRequest && (
            <Messages 
              request={selectedRequest} 
              onClose={() => setShowMessagesDialog(false)} 
            />
          )}
        </DialogContentWithoutClose>
      </Dialog>

      {/* Message Dialog - Quick Message */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Quick Message
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white">Message</label>
              <textarea
                className="w-full mt-1 p-3 bg-slate-700 border-slate-600 rounded-md text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
                rows={4}
                placeholder="Type your message here..."
              />
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowMessageDialog(false)}
                className="border-slate-600 text-white hover:bg-slate-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyRequests; 