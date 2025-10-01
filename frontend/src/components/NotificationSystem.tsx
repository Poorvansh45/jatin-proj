import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Bell, MessageCircle, CheckCircle, X, File } from "lucide-react";
import socketService from "../services/socket";
import apiService from "../services/api";

interface Notification {
  id: string;
  type: 'message_received' | 'file_received' | 'request_accepted' | 'request_completed';
  message: string;
  requestId: string;
  requestTitle?: string;
  timestamp: Date;
  isRead: boolean;
}

interface NotificationSystemProps {
  onOpenChat: (requestId: string) => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ onOpenChat }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setupNotificationListeners();
      loadUnreadCount();
    }

    return () => {
      socketService.offNotification();
    };
  }, [user]);

  const setupNotificationListeners = () => {
    socketService.onNotification((notification) => {
      console.log("🔔 Received notification:", notification);
      
      const newNotification: Notification = {
        id: `notification_${Date.now()}`,
        type: notification.type,
        message: notification.message,
        requestId: notification.requestId,
        requestTitle: notification.requestTitle,
        timestamp: new Date(),
        isRead: false
      };

      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast notification
      toast({
        title: getNotificationTitle(notification.type),
        description: notification.message,
        action: notification.requestId ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onOpenChat(notification.requestId);
              setIsOpen(false);
            }}
          >
            Open Chat
          </Button>
        ) : undefined,
      });
    });
  };

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'message_received':
        return 'New Message';
      case 'file_received':
        return 'New File';
      case 'request_accepted':
        return 'Request Accepted';
      case 'request_completed':
        return 'Request Completed';
      default:
        return 'Notification';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message_received':
        return <MessageCircle className="h-4 w-4" />;
      case 'file_received':
        return <File className="h-4 w-4" />;
      case 'request_accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'request_completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await apiService.getUnreadMessageCount();
      setUnreadCount(response.count);
    } catch (error) {
      console.error("Failed to load unread count:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, isRead: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    try {
      await apiService.markAllMessagesAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white hover:bg-slate-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <Card className="absolute right-0 top-12 w-80 bg-slate-800 border-slate-700 shadow-xl z-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Mark all read
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b border-slate-700 hover:bg-slate-700/50 transition-colors ${
                        !notification.isRead ? 'bg-slate-700/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 ${!notification.isRead ? 'text-cyan-400' : 'text-slate-400'}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className={`text-sm font-medium ${
                              !notification.isRead ? 'text-white' : 'text-slate-300'
                            }`}>
                              {getNotificationTitle(notification.type)}
                            </p>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-500">
                                {formatTime(notification.timestamp)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeNotification(notification.id)}
                                className="h-4 w-4 p-0 text-slate-500 hover:text-red-400"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-sm text-slate-400 mb-2">
                            {notification.message}
                          </p>
                          
                          {notification.requestId && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  onOpenChat(notification.requestId);
                                  markAsRead(notification.id);
                                  setIsOpen(false);
                                }}
                                className="text-xs bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20"
                              >
                                Open Chat
                              </Button>
                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-xs text-slate-500 hover:text-slate-300"
                                >
                                  Mark read
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationSystem; 