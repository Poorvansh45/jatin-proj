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
  DialogContentWithoutClose,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useCustomToast } from "@/hooks/use-custom-toast";
import { MapPin, Clock, DollarSign, User, MessageCircle, CheckCircle, Send } from "lucide-react";
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

const MyHelpRequests = () => {
  const { user } = useAuth();
  const { showMessageNotification, showSuccessNotification, showErrorNotification } = useCustomToast();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [showMessagesDialog, setShowMessagesDialog] = useState(false);

  useEffect(() => {
    loadMyHelpRequests();
    
    // Initialize socket connection if user is logged in
    if (user?.id) {
      socketService.connect(user.id);
      
      // Set up notification listener for new messages
      socketService.onNotification((notification) => {
        console.log("🔔 Helper received notification:", notification);
        showMessageNotification("New Message", notification.message);
        
        // Refresh requests to show updated status
        loadMyHelpRequests();
      });

      // Listen for request status changes
      socketService.onMessage((message) => {
        if (message.messageType === 'system' && message.message.includes('completed')) {
          console.log("✅ Request was completed!");
          showSuccessNotification("Request Completed!", "The request has been marked as completed.");
          loadMyHelpRequests();
        }
      });

      // Listen for direct request status updates
      if (socketService.socket) {
        socketService.socket.on("request_status_updated", (data) => {
          console.log("🔄 Request status updated:", data);
          if (data.helperId === user?.id && data.status === 'completed') {
            showSuccessNotification("Request Completed!", `"${data.requestTitle}" has been marked as completed.`);
            loadMyHelpRequests();
          }
        });
      }
    }
    
    // Cleanup on unmount
    return () => {
      socketService.offNotification();
      socketService.offMessage();
      if (socketService.socket) {
        socketService.socket.off("request_status_updated");
      }
    };
  }, [user]);

  const loadMyHelpRequests = async () => {
    try {
      setLoading(true);
      
      // Load both in_progress and completed requests where current user is the helper
      const inProgressRequests = await apiService.getRequests({ status: "in_progress" });
      const completedRequests = await apiService.getRequests({ status: "completed" });
      
      console.log("In progress requests:", inProgressRequests);
      console.log("Completed requests:", completedRequests);
      
      // Filter requests where current user is the helper and ensure helper data exists
      const myHelpRequests = [...inProgressRequests, ...completedRequests].filter((req: HelpRequest) => {
        // Check if request has helper data and current user is the helper
        return req.helper && req.helper._id && req.helper._id === user?.id;
      });
      
      console.log("My help requests:", myHelpRequests);
      setRequests(myHelpRequests);
      
    } catch (error) {
      console.error("Failed to load help requests:", error);
      showErrorNotification("Error", "Failed to load your help requests");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRequest = async (request: HelpRequest) => {
    // Safety check - ensure request has required data
    if (!request.helper || !request.requester) {
      showErrorNotification("Error", "Cannot complete request - request data is incomplete");
      return;
    }
    
    try {
      await apiService.completeRequest(request._id);
      
      showSuccessNotification("Request Completed!", `"${request.title}" has been marked as completed.`);

      loadMyHelpRequests();
    } catch (error) {
      console.error("Failed to complete request:", error);
      showErrorNotification("Error", "Failed to complete request");
    }
  };

  const openMessages = (request: HelpRequest) => {
    // Safety check - ensure request has required data
    if (!request.helper || !request.requester) {
      showErrorNotification("Error", "Cannot open chat - request data is incomplete");
      return;
    }
    
    setSelectedRequest(request);
    setShowMessagesDialog(true);
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
            <h1 className="text-3xl font-bold text-white mb-2">
              My Help Requests
            </h1>
            <p className="text-gray-300">
              Requests you've accepted and helped with (both active and completed)
            </p>
          </div>

          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                <span className="ml-2 text-gray-300">Loading your help requests...</span>
              </div>
            ) : requests.length === 0 ? (
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="text-center py-12">
                  <p className="text-gray-300 mb-4">
                    You haven't accepted any help requests yet.
                  </p>
                  <Button onClick={() => window.location.href = '/accept-request'} variant="outline">
                    Browse Available Requests
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests
                  .filter((request) => request.helper && request.requester && request.helper.name && request.requester.name) // Filter out incomplete requests
                  .map((request) => {
                  const isHelper = user?.id === request.helper?._id;
                  
                  return (
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
                              <Badge className={request.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                                {request.status === 'completed' ? 'Completed' : 'In Progress'}
                              </Badge>
                            </div>
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={request.requester?.picture} />
                            <AvatarFallback>
                              {request.requester?.name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
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

                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>by {request.requester?.name}</span>
                          </div>

                          <div className="text-xs text-gray-400">
                            Accepted {formatDate(request.acceptedAt || request.createdAt)}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          {request.status === 'completed' ? (
                            <Button
                              variant="outline"
                              className="flex-1 border-green-600 text-green-400 cursor-not-allowed"
                              disabled
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Completed
                            </Button>
                          ) : (
                            <>
                              <Button
                                onClick={() => openMessages(request)}
                                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Chat with Requester
                              </Button>
                              {isHelper && (
                                <Button
                                  onClick={() => handleCompleteRequest(request)}
                                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Complete
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
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
    </div>
  );
};

export default MyHelpRequests; 