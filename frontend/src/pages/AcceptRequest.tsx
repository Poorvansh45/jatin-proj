import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Navigation from "../components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { MapPin, Clock, DollarSign, User, MessageCircle, Send, CheckCircle } from "lucide-react";
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

interface Category {
  _id: string;
  name: string;
  description: string;
  icon: string;
}

const AcceptRequest = () => {
  const { user } = useAuth();
  const { showMessageNotification, showSuccessNotification, showErrorNotification } = useCustomToast();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<HelpRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showMessagesDialog, setShowMessagesDialog] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    urgency: "all",
    remote: "all",
    status: "all",
  });

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Check backend health first
        console.log("🏥 Checking backend health...");
        await apiService.healthCheck();
        
        // Load data
        await loadRequests();
        await loadCategories();
      } catch (error) {
        console.error("❌ Failed to initialize data:", error);
        toast({
          title: "Connection Error",
          description: "Cannot connect to server. Please check if the backend is running.",
          variant: "destructive",
        });
      }
    };
    
    initializeData();
    
    // Initialize socket connection if user is logged in
    if (user?.id) {
      socketService.connect(user.id);
      
      // Test socket connection
      setTimeout(async () => {
        try {
          const result = await socketService.testConnection();
          console.log("Socket connection test result:", result);
        } catch (error) {
          console.error("Socket connection test failed:", error);
        }
      }, 2000);
      
      // Set up notification listener
      socketService.onNotification((notification) => {
        console.log("🔔 Received notification:", notification);
        showMessageNotification("New Message", notification.message);
        
        // If this is a request acceptance notification, refresh requests
        if (notification.type === "request_accepted") {
          console.log("🎉 Request was accepted by someone!");
          loadRequests();
        }
      });

      // Listen for request acceptance events
      socketService.onMessage((message) => {
        if (message.messageType === 'system' && message.message.includes('accepted')) {
          console.log("🎉 System message: Request accepted!");
          showSuccessNotification("Request Accepted!", "Your request has been accepted! Opening conversation...");
          
          // Find the accepted request and open conversation
          const acceptedRequest = requests.find(req => req._id === message.request);
          if (acceptedRequest) {
            setTimeout(() => {
              setSelectedRequest(acceptedRequest);
              setShowMessagesDialog(true);
            }, 1500);
          }
        }
      });

      // Listen for request completion events
      if (socketService.socket) {
        socketService.socket.on("request_status_updated", (data) => {
          console.log("🔄 Request status updated:", data);
          if (data.status === 'completed') {
            showSuccessNotification("Request Completed!", `"${data.requestTitle}" has been marked as completed.`);
            loadRequests(); // Refresh to remove completed request from AcceptRequest page
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

  useEffect(() => {
    filterRequests();
  }, [requests, filters]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      console.log("🔍 Loading requests...");
      console.log("Current user:", user);
      console.log("Auth token:", localStorage.getItem("authToken"));
      
      // Load open requests (for accepting) - only requests NOT created by current user
      const openRequests = await apiService.getRequests({ status: "open" });
      console.log("Open requests:", openRequests);
      const availableRequests = openRequests.filter(
        (req: HelpRequest) => req.requester._id !== user?.id
      );
      
      // Load in_progress requests where current user is the helper (accepted requests)
      const inProgressRequests = await apiService.getRequests({ status: "in_progress" });
      console.log("In progress requests:", inProgressRequests);
      const myAcceptedRequests = inProgressRequests.filter(
        (req: HelpRequest) => req.helper?._id === user?.id // I am the helper
      );
      
      // Combine both lists - only show requests available for accepting + requests I've accepted
      const allRequests = [...availableRequests, ...myAcceptedRequests];
      console.log("All requests:", allRequests);
      setRequests(allRequests);
    } catch (error) {
      console.error("Failed to load requests:", error);
      console.error("Error details:", error.response?.data || error.message);
      showErrorNotification("Error", "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    // Filter out requests with missing required data
    filtered = filtered.filter(req => 
      req.requester && req.category && req.requester.name && req.category.name
    );

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          req.title.toLowerCase().includes(searchLower) ||
          req.description.toLowerCase().includes(searchLower) ||
          req.skillsNeeded.some((skill) =>
            skill.toLowerCase().includes(searchLower)
          )
      );
    }

    if (filters.category && filters.category !== "all") {
      filtered = filtered.filter(
        (req) => req.category._id === filters.category
      );
    }

    if (filters.urgency && filters.urgency !== "all") {
      filtered = filtered.filter((req) => req.urgency === filters.urgency);
    }

    if (filters.remote && filters.remote !== "all") {
      if (filters.remote === "remote") {
        filtered = filtered.filter((req) => req.isRemote);
      } else if (filters.remote === "local") {
        filtered = filtered.filter((req) => !req.isRemote);
      }
    }

    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter((req) => req.status === filters.status);
    }

    setFilteredRequests(filtered);
  };

  const handleAcceptRequest = async (request: HelpRequest) => {
    try {
      await apiService.acceptRequest(request._id);
      
      showSuccessNotification("Request Accepted!", `You've accepted "${request.title}". You can now message ${request.requester.name}.`);

      // Emit request accepted event to notify both users
      if (socketService.getConnectionStatus().isConnected) {
        socketService.socket?.emit("request_accepted", {
          requestId: request._id,
          helperId: user?.id,
          requesterId: request.requester._id,
          requestTitle: request.title
        });
      }

      // Automatically open the full conversation dialog for the accepted request
      setSelectedRequest(request);
      setShowMessagesDialog(true);

      loadRequests();
    } catch (error) {
      console.error("Failed to accept request:", error);
      showErrorNotification("Error", "Failed to accept request");
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedRequest) return;

    try {
      const messageData = {
        requestId: selectedRequest._id,
        content: messageText.trim(),
        senderName: user?.name || "Unknown"
      };

      // Send via socket
      socketService.sendMessage(messageData);
      
      toast({
        title: "Message Sent",
        description: `Your message has been sent to ${selectedRequest.requester.name}.`,
      });

      setMessageText("");
      setShowMessageDialog(false);
      
      // Open the full conversation
      setSelectedRequest(selectedRequest);
      setShowMessagesDialog(true);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const openMessages = (request: HelpRequest) => {
    setSelectedRequest(request);
    setShowMessagesDialog(true);
  };

  const handleCompleteRequest = async (request: HelpRequest) => {
    try {
      await apiService.completeRequest(request._id);
      
      showSuccessNotification("Request Completed!", `"${request.title}" has been marked as completed.`);

      // Refresh the requests list
      loadRequests();
    } catch (error) {
      console.error("Failed to complete request:", error);
      showErrorNotification("Error", "Failed to complete request");
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
            <h1 className="text-3xl font-bold text-white mb-2">
              Help Others
          </h1>
            <p className="text-gray-300">
              Browse available help requests and manage your accepted requests
          </p>
        </div>

          {/* Filters */}
          <Card className="mb-6 bg-gray-900 border-gray-700">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Input
                  placeholder="Search requests..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />

                <Select
                  value={filters.category}
                  onValueChange={(value) =>
                    setFilters({ ...filters, category: value })
                  }>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.urgency}
                  onValueChange={(value) =>
                    setFilters({ ...filters, urgency: value })
                  }>
                  <SelectTrigger>
                    <SelectValue placeholder="All urgency levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All urgency levels</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.remote}
                  onValueChange={(value) =>
                    setFilters({ ...filters, remote: value })
                  }>
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    <SelectItem value="remote">Remote only</SelectItem>
                    <SelectItem value="local">Local only</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters({ ...filters, status: value })
                  }>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            </CardContent>
          </Card>

          {/* Requests Grid */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
              <p className="mt-2 text-gray-300">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="text-center py-12">
                <p className="text-gray-300 mb-4">
                  No help requests available for accepting at the moment.
                </p>
                <Button onClick={loadRequests} variant="outline">
                  Refresh
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Available Requests Section */}
              {filteredRequests.filter(req => req.status === 'open').length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Available Requests</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRequests.filter(req => req.status === 'open').map((request) => (
                <Card key={request._id} className="hover:shadow-lg transition-shadow bg-gray-900 border-gray-700">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {request.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{request.category?.name || 'Unknown Category'}</Badge>
                          <Badge className={getUrgencyColor(request.urgency)}>
                            {request.urgency}
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

                    {request.skillsNeeded.length > 0 && (
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
                        Posted {formatDate(request.createdAt)}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleAcceptRequest(request)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                        Accept Request
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowMessageDialog(true);
                        }}
                        className="border-slate-600 text-white hover:bg-slate-700">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Accepted Requests Section */}
              {filteredRequests.filter(req => req.status === 'in_progress' && req.helper?._id === user?.id).length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">Your Accepted Requests</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRequests.filter(req => req.status === 'in_progress' && req.helper?._id === user?.id).map((request) => (
                      <Card key={request._id} className="hover:shadow-lg transition-shadow bg-gray-900 border-gray-700">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-2">
                                {request.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{request.category?.name || 'Unknown Category'}</Badge>
                                <Badge className={getUrgencyColor(request.urgency)}>
                                  {request.urgency}
                                </Badge>
                                <Badge className="bg-blue-100 text-blue-800">
                                  In Progress
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

                          {request.skillsNeeded.length > 0 && (
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
                              Posted {formatDate(request.createdAt)}
                            </div>
                          </div>

                          
                          
                        </CardContent>
                        <CardFooter className="w-full ">
                        <div className="flex gap-2">
                            <Button
                              onClick={() => openMessages(request)}
                              
                              className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600">
                              <MessageCircle className="h-4 w-4" />
                              Chat with Requester
                            </Button>
                            <Button
                              
                              onClick={() => handleCompleteRequest(request)}
                              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                              <CheckCircle className="h-4 w-4" />
                              Complete Request
                            </Button>
        
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
      </div>

      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Message {selectedRequest?.requester?.name || 'User'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-white">Initial Message</label>
              <textarea
                className="w-full mt-1 p-3 bg-slate-700 border-slate-600 rounded-md text-white placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none"
                rows={4}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Introduce yourself and ask about their request..."
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSendMessage} 
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                disabled={!messageText.trim()}
              >
                <Send className="h-4 w-4 mr-2" />
                Send & Open Chat
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

      {/* Messages Dialog */}
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

export default AcceptRequest;
