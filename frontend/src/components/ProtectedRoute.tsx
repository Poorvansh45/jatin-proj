import { useAuth } from "../contexts/AuthContext";
import GoogleAuth from "./GoogleAuth";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 px-6">
        <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 text-center">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">
              <span className="text-white">Skill</span>
              <span className="text-cyan-400">Bridge</span>
            </h1>
            <p className="text-slate-300">Please sign in to continue</p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              Authentication Required
            </h2>
            <p className="text-slate-400 text-sm">
              You need to sign in with your Google account to access this
              feature.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-center">
              <GoogleAuth />
            </div>

            <div className="text-xs text-slate-500">
              By signing in, you agree to our terms of service and privacy
              policy.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
