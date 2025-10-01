import React, { useState, useEffect } from "react";
import { Dialog, DialogContentWithoutClose, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Messages from "./Messages";
import apiService from "../services/api";

interface HelpRequest {
  _id: string;
  title: string;
  status: "open" | "in_progress" | "completed";
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
}

interface ChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string | null;
}

const ChatDialog: React.FC<ChatDialogProps> = ({ isOpen, onClose, requestId }) => {
  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && requestId) {
      loadRequest();
    }
  }, [isOpen, requestId]);

  const loadRequest = async () => {
    if (!requestId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getRequestById(requestId);
      setRequest(data);
    } catch (error) {
      setError("Failed to load request or you don't have access to it.");
      setRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRequest(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContentWithoutClose
        className="max-w-4xl max-h-[90vh] bg-slate-900 border-slate-700 p-0"
        aria-describedby="chat-dialog-description"
      >
        <DialogHeader>
          <DialogTitle>Help Request Chat</DialogTitle>
        </DialogHeader>
        <div id="chat-dialog-description" style={{ display: 'none' }}>
          This dialog allows you to chat about your help request and use the HelpBot AI assistant.
        </div>
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="ml-2 text-slate-400">Loading chat...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-slate-400">
              <p>{error}</p>
            </div>
          ) : request ? (
            <>
              <Messages request={request} onClose={handleClose} />
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <p>Request not found or you don't have access to it.</p>
            </div>
          )}
        </div>
      </DialogContentWithoutClose>
    </Dialog>
  );
};

export default ChatDialog; 