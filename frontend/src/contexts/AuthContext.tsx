import React, { createContext, useContext, useState, useEffect } from "react";
import apiService from "../services/api";
import socketService from "../services/socket";

interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
  bio?: string;
  skills?: string[];
  rating?: number;
  totalReviews?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (googleUser: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  retryConnection: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log("🔐 Initializing auth...");
        const token = localStorage.getItem("authToken");
        console.log("Stored token:", token ? "exists" : "not found");
        
        if (token) {
          try {
            console.log("🔍 Validating token...");
            apiService.setToken(token);
            const userData = await apiService.getProfile();
            console.log("✅ User data loaded:", userData);
            setUser(userData);

            // Connect to socket if available
            socketService.connect(userData.id);
          } catch (error) {
            console.error("❌ Token validation failed:", error);
            
            // Only remove token if it's an authentication error, not a network error
            if (error.message.includes("401") || error.message.includes("Unauthorized") || error.message.includes("Token")) {
              console.log("🔒 Authentication error - removing token");
              localStorage.removeItem("authToken");
            } else {
              console.log("🌐 Network error - keeping token for retry");
              // Keep the token and user data for retry when backend comes back online
              if (retryCount < 3) {
                console.log(`🔄 Retrying in 5 seconds... (${retryCount + 1}/3)`);
                setTimeout(() => {
                  setRetryCount(prev => prev + 1);
                }, 5000);
              } else {
                console.log("❌ Max retries reached - user will need to refresh manually");
              }
            }
          }
        } else {
          console.log("ℹ️ No token found, user not authenticated");
        }
      } catch (error) {
        console.error("❌ Auth initialization failed:", error);
      } finally {
        setLoading(false);
        console.log("🏁 Auth initialization complete");
      }
    };

    initializeAuth();
  }, [retryCount]);

  const login = async (googleUser: any) => {
    try {
      setLoading(true);

      const response = await apiService.loginWithGoogle({
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.id,
        picture: googleUser.picture,
      });

      setUser(response.user);

      // Connect to socket if available
      socketService.connect(response.user.id);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    apiService.logout();
    socketService.disconnect();
  };

  const updateProfile = async (userData: Partial<User>) => {
    try {
      const updatedUser = await apiService.updateProfile(userData);
      setUser(updatedUser);
    } catch (error) {
      console.error("Profile update failed:", error);
      throw error;
    }
  };

  const retryConnection = () => {
    setRetryCount(0);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading,
    updateProfile,
    retryConnection,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
