import { useToast } from '@/hooks/use-toast';

export const useCustomToast = () => {
  const { toast } = useToast();

  const showMessageNotification = (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "default",
      className: "bg-gradient-to-r from-cyan-900/90 to-blue-900/90 border-cyan-500/50 backdrop-blur-sm",
    });
  };

  const showSuccessNotification = (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "default",
      className: "bg-gradient-to-r from-green-900/90 to-emerald-900/90 border-green-500/50 backdrop-blur-sm",
    });
  };

  const showErrorNotification = (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "destructive",
      className: "bg-gradient-to-r from-red-900/90 to-pink-900/90 border-red-500/50 backdrop-blur-sm",
    });
  };

  const showInfoNotification = (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "default",
      className: "bg-gradient-to-r from-slate-900/90 to-gray-900/90 border-slate-500/50 backdrop-blur-sm",
    });
  };

  return {
    showMessageNotification,
    showSuccessNotification,
    showErrorNotification,
    showInfoNotification,
  };
}; 