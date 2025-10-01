import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import apiService from '../services/api';

const BackendStatus: React.FC = () => {
  const { retryConnection } = useAuth();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isRetrying, setIsRetrying] = useState(false);

  const checkBackendStatus = async () => {
    try {
      setBackendStatus('checking');
      await apiService.healthCheck();
      setBackendStatus('online');
    } catch (error) {
      setBackendStatus('offline');
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    retryConnection();
    await checkBackendStatus();
    setIsRetrying(false);
  };

  useEffect(() => {
    checkBackendStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (backendStatus === 'online') {
    return null; // Don't show anything when backend is online
  }

  return (
    <Card className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md ${
      backendStatus === 'offline' ? 'bg-red-900 border-red-700' : 'bg-yellow-900 border-yellow-700'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {backendStatus === 'checking' ? (
            <RefreshCw className="h-4 w-4 animate-spin text-yellow-400" />
          ) : backendStatus === 'offline' ? (
            <WifiOff className="h-4 w-4 text-red-400" />
          ) : (
            <Wifi className="h-4 w-4 text-green-400" />
          )}
          <span className="text-white text-sm">
            {backendStatus === 'checking' && 'Checking backend connection...'}
            {backendStatus === 'offline' && 'Backend server is offline. Some features may not work.'}
          </span>
        </div>
        {backendStatus === 'offline' && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry Connection
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default BackendStatus; 