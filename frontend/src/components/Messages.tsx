import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Paperclip, X, Download, Image as ImageIcon, FileText, Phone, Video, MoreVertical, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import apiService from "../services/api";
import socketService from "../services/socket";

interface Message {
  _id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  senderPicture?: string;
  content: string;
  messageType: 'text' | 'file' | 'image';
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  createdAt: string;
  isRead: boolean;
}

interface HelpRequest {
  _id: string;
  title: string;
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
  status: "open" | "in_progress" | "completed";
}

interface MessagesProps {
  request: HelpRequest;
  onClose: () => void;
}

const Messages: React.FC<MessagesProps> = ({ request, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<{ [key: string]: Date }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Safety check for incomplete request data
  if (!request || !request.requester) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">!</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Invalid Request</h3>
              <span className="text-xs text-gray-400">Request data is incomplete</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-2">Unable to load chat</p>
            <p className="text-sm text-gray-500">Request data is missing or invalid</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine user roles and names - FIXED: Each user sees the other person's name
  const isRequester = user?.id === request.requester._id;
  const isHelper = user?.id === request.helper?._id;
  const otherUser = isRequester ? request.helper : request.requester;
  const currentUserName = isRequester ? request.requester.name : (request.helper?.name || "Helper");
  const otherUserName = otherUser?.name || (isRequester ? "Helper" : "Requester");

  useEffect(() => {
    if (!user?.id || !request?._id || !request?.requester) return;

    // Connect to socket and join room
    socketService.connect(user.id);
    socketService.joinRoom(request._id);
    setIsConnected(true);

    // Load existing messages
    loadMessages();

    // Set up real-time listeners
    socketService.onMessage((message: Message) => {
      if (message.requestId === request._id) {
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.find(m => m._id === message._id);
          if (exists) return prev;
          
          // Play notification sound for messages from other users
          if (message.senderId !== user?.id) {
            // Create a simple notification sound
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore errors if audio fails
          }
          
          return [...prev, message];
        });
      }
    });

    socketService.onTyping((data) => {
      if (data.requestId === request._id && data.userId !== user.id) {
        setTypingUsers(prev => {
          if (data.isTyping && !prev.includes(data.userName)) {
            return [...prev, data.userName];
          } else if (!data.isTyping) {
            return prev.filter(name => name !== data.userName);
          }
          return prev;
        });
      }
    });

    socketService.onConnectionStatus((status) => {
      setIsConnected(status);
    });

    // Update last seen when user is active
    const updateLastSeen = () => {
      if (user?.id) {
        setLastSeen(prev => ({
          ...prev,
          [user.id]: new Date()
        }));
      }
    };

    // Update last seen every 30 seconds when user is active
    const lastSeenInterval = setInterval(updateLastSeen, 30000);

    return () => {
      socketService.leaveRoom(request._id);
      socketService.offMessage();
      socketService.offTyping();
      socketService.offConnectionStatus();
      clearInterval(lastSeenInterval);
    };
  }, [user?.id, request._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getMessages(request._id);
      setMessages(response);
    } catch (error) {
      console.error("Failed to load messages:", error);
      setError("Failed to load messages. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return;

    try {
      const messageData = {
        requestId: request._id,
        content: newMessage.trim(),
        senderName: currentUserName
      };

      // Send via socket
      socketService.sendMessage(messageData);
      
      // Clear input and stop typing
      setNewMessage("");
      socketService.stopTyping(request._id, currentUserName);
      
      // Mark messages as read
      apiService.markMessagesAsRead(request._id).catch(console.error);
      
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      
      // Add a small delay to prevent rapid successive uploads
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('requestId', request._id);
      
      const response = await apiService.uploadFile(formData);
      
      const messageData = {
        requestId: request._id,
        content: response.fileUrl,
        messageType: file.type.startsWith('image/') ? 'image' : 'file',
        fileName: file.name,
        fileSize: file.size,
        senderName: currentUserName
      };

      socketService.sendMessage(messageData);
      
      toast({
        title: "File Sent",
        description: `${file.name} has been sent successfully.`,
      });
      
    } catch (error) {
      console.error("Failed to upload file:", error);
      
      // Show specific error messages
      let errorMessage = "Failed to upload file";
      if (error.message.includes("Too many requests")) {
        errorMessage = "Upload limit reached. Please wait a moment before trying again.";
      } else if (error.message.includes("file size")) {
        errorMessage = "File is too large. Maximum size is 10MB.";
      } else if (error.message.includes("file type")) {
        errorMessage = "File type not supported. Please use images, PDFs, or documents.";
      } else {
        errorMessage = error.message || "Failed to upload file";
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (e.target.value.trim()) {
      if (!isTyping) {
        setIsTyping(true);
        socketService.startTyping(request._id, currentUserName);
      }
    } else {
      if (isTyping) {
        setIsTyping(false);
        socketService.stopTyping(request._id, currentUserName);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.senderId === user?.id;
    const messageTime = formatTime(message.createdAt);

    return (
      <div
        key={message._id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-6`}
      >
        <div className={`flex max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isOwnMessage && (
            <Avatar className="h-8 w-8 mr-3 ring-2 ring-purple-500/20">
              <AvatarImage src={message.senderPicture} />
              <AvatarFallback className="text-xs bg-gradient-to-r from-purple-500 to-pink-500">
                {message.senderName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
            {!isOwnMessage && (
              <span className="text-xs text-purple-300 mb-1 font-medium">{message.senderName}</span>
            )}
            
            <div
              className={`rounded-2xl px-4 py-3 max-w-xs lg:max-w-md break-words shadow-lg ${
                isOwnMessage
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                  : 'bg-slate-700/50 backdrop-blur-sm text-white border border-slate-600/50'
              }`}
            >
              {message.messageType === 'text' && (
                <p className="text-sm leading-relaxed">{message.content}</p>
              )}
              
              {message.messageType === 'image' && (
                <div>
                  <img 
                    src={message.content} 
                    alt="Shared image" 
                    className="max-w-full rounded-lg cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => window.open(message.content, '_blank')}
                  />
                  {message.fileName && (
                    <p className="text-xs mt-2 opacity-75">{message.fileName}</p>
                  )}
                </div>
              )}
              
              {message.messageType === 'file' && (
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{message.fileName}</p>
                    <p className="text-xs opacity-75">{formatFileSize(message.fileSize || 0)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(message.content, '_blank')}
                    className="p-2 hover:bg-white/10"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">{messageTime}</span>
              {isOwnMessage && (
                <div className="flex items-center gap-1">
                  {message.isRead ? (
                    <div className="w-4 h-4 text-blue-400">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="w-4 h-4 text-gray-400">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Header - Creative Design */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-purple-500/30">
              <AvatarImage src={otherUser?.picture} />
              <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">
                {otherUserName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">{otherUserName}</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-300">
                {isConnected ? 'Online' : 'Connecting...'}
              </span>
              {!isConnected && (
                <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700/50">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700/50">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700/50">
            <MoreVertical className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-red-500/20">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent to-slate-900/20">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            <span className="ml-3 text-gray-300">Loading messages...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-400 mb-3">{error}</p>
              <Button onClick={loadMessages} variant="outline" size="sm" className="bg-slate-700/50">
                Retry
              </Button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-purple-400" />
              </div>
              <p className="text-gray-300 mb-2 text-lg font-medium">No messages yet</p>
              <p className="text-sm text-gray-500">Start the conversation with {otherUserName}!</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            
            {typingUsers.length > 0 && (
              <div className="flex justify-start mb-4">
                <div className="flex items-center space-x-3 bg-slate-700/50 backdrop-blur-sm rounded-2xl px-4 py-3 border border-slate-600/50">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-purple-300 font-medium">
                    {typingUsers.join(', ')} is typing...
                  </span>
                </div>
              </div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Creative Design */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !isConnected}
            className="p-3 hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all duration-200"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </Button>
          
          <div className="flex-1 relative">
            <Input
              value={newMessage}
              onChange={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? `Message ${otherUserName}...` : "Connecting to server..."}
              className="bg-slate-700/50 border-slate-600/50 text-white placeholder-gray-400 rounded-full px-4 py-3 backdrop-blur-sm focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              disabled={uploading || !isConnected}
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || uploading || !isConnected}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white rounded-full p-3 transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
        
        {/* Connection Status Message */}
        {!isConnected && (
          <div className="text-center py-3 mt-3">
            <div className="inline-flex items-center space-x-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <p className="text-xs text-yellow-300 font-medium">
                🔄 Connecting to chat server... Please wait
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages; 