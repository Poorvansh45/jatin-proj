import React from 'react';
import { CheckCircle, MessageCircle, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomToastProps {
  title: string;
  description: string;
  type?: 'success' | 'error' | 'info' | 'message';
  onClose?: () => void;
}

const CustomToast: React.FC<CustomToastProps> = ({ 
  title, 
  description, 
  type = 'info',
  onClose 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'message':
        return <MessageCircle className="h-5 w-5 text-cyan-400" />;
      default:
        return <MessageCircle className="h-5 w-5 text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-900/90 to-emerald-900/90 border-green-500/50';
      case 'error':
        return 'bg-gradient-to-r from-red-900/90 to-pink-900/90 border-red-500/50';
      case 'message':
        return 'bg-gradient-to-r from-cyan-900/90 to-blue-900/90 border-cyan-500/50';
      default:
        return 'bg-gradient-to-r from-slate-900/90 to-gray-900/90 border-slate-500/50';
    }
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border backdrop-blur-sm shadow-xl",
      "animate-in slide-in-from-top-2 duration-300",
      getBgColor()
    )}>
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
      
      <div className="relative p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white mb-1">
              {title}
            </h4>
            <p className="text-sm text-gray-300 leading-relaxed">
              {description}
            </p>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="mt-3 h-1 bg-black/20 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full animate-pulse",
              type === 'success' && "bg-gradient-to-r from-green-400 to-emerald-400",
              type === 'error' && "bg-gradient-to-r from-red-400 to-pink-400",
              type === 'message' && "bg-gradient-to-r from-cyan-400 to-blue-400",
              type === 'info' && "bg-gradient-to-r from-blue-400 to-indigo-400"
            )}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default CustomToast; 