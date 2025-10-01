import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";

interface GoogleAuthProps {
  onSuccess?: () => void;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const decodeJWTToken = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error decoding JWT token:", error);
      return null;
    }
  };

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    setIsLoading(true);

    try {
      if (credentialResponse.credential) {
        const userInfo = decodeJWTToken(credentialResponse.credential);

        if (userInfo) {
          const googleUser = {
            id: userInfo.sub,
            name: userInfo.name,
            email: userInfo.email,
            picture: userInfo.picture,
          };

          await login(googleUser);
          onSuccess?.();
        }
      }
    } catch (error) {
      console.error("Google sign-in failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = () => {
    console.error("Google Login Failed");
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center">
      {isLoading ? (
        <div className="flex items-center gap-2 text-white">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400"></div>
          <span>Signing in...</span>
        </div>
      ) : (
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          theme="filled_blue"
          size="large"
          text="signin_with"
          shape="rectangular"
        />
      )}
    </div>
  );
};

export default GoogleAuth;
