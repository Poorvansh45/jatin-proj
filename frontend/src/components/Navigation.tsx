import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import GoogleAuth from "./GoogleAuth";
import { Menu, X, User, LogOut } from "lucide-react";

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { href: "/", label: "Home", type: "route" },
    { href: "#how-it-works", label: "How It Works", type: "scroll" },
    { href: "#about", label: "About", type: "scroll" },
    { href: "#contact", label: "Contact", type: "scroll" },
  ];

  const authenticatedNavItems = [
    { href: "/send-request", label: "Send Request", type: "route" },
    { href: "/accept-request", label: "Accept Request", type: "route" },
    { href: "/my-requests", label: "My Requests", type: "route" },
    { href: "/my-help-requests", label: "My Help Requests", type: "route" },
  ];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleNavigation = (href: string, type: string) => {
    if (type === "route") {
      navigate(href);
    } else {
      // For scroll navigation, first navigate to home if not already there
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          const element = document.querySelector(href);
          if (element) {
            element.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      } else {
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
    setIsMobileMenuOpen(false);
  };

  const handleAuthAction = (action: string) => {
    if (action === "login") {
      setShowAuthModal(true);
    } else {
      logout();
      navigate("/");
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg' 
          : 'bg-slate-900/80 backdrop-blur-md border-b border-slate-800'
      }` }>
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => navigate("/")}>
              <h1 className="text-xl sm:text-2xl font-bold">
                <span className="text-white">Skill</span>
                <span className="text-cyan-400">Bridge</span>
              </h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item.href, item.type)}
                  className="text-slate-300 hover:text-cyan-400 transition-colors font-medium text-sm">
                  {item.label}
                </button>
              ))}

              {isAuthenticated &&
                authenticatedNavItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleNavigation(item.href, item.type)}
                    className="text-slate-300 hover:text-cyan-400 transition-colors font-medium text-sm">
                    {item.label}
                  </button>
                ))}
            </div>

            {/* Desktop Auth Section */}
            <div className="hidden lg:flex items-center space-x-6">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    {user?.picture ? (
                      <img
                        src={user.picture}
                        alt={user?.name}
                        className="w-8 h-8 rounded-full border-2 border-cyan-400 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-cyan-400 bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <span className="text-white font-medium text-sm hidden xl:block">
                      {user?.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAuthAction("logout")}
                    className="text-slate-300 hover:text-red-400 transition-colors font-medium text-sm flex items-center gap-1">
                    <LogOut className="w-4 h-4" />
                    <span className="hidden xl:inline">Logout</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleAuthAction("login")}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all font-medium text-sm">
                  Sign In
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-slate-300 hover:text-white transition-colors p-2">
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Mobile Menu */}
          <div className="fixed top-16 left-0 right-0 bg-slate-900 border-b border-slate-800 shadow-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col space-y-1">
                {/* Navigation Items */}
                <div className="space-y-1">
                  {navItems.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => handleNavigation(item.href, item.type)}
                      className="w-full text-left text-slate-300 hover:text-cyan-400 transition-colors font-medium py-3 px-4 rounded-lg hover:bg-slate-800">
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Authenticated Navigation Items */}
                {isAuthenticated && (
                  <div className="space-y-1 border-t border-slate-700 pt-4">
                    {authenticatedNavItems.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => handleNavigation(item.href, item.type)}
                        className="w-full text-left text-slate-300 hover:text-cyan-400 transition-colors font-medium py-3 px-4 rounded-lg hover:bg-slate-800">
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Auth Section */}
                <div className="border-t border-slate-700 pt-4 mt-4">
                  {isAuthenticated ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 px-4 py-2">
                        {user?.picture ? (
                          <img
                            src={user.picture}
                            alt={user?.name}
                            className="w-10 h-10 rounded-full border-2 border-cyan-400 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full border-2 border-cyan-400 bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                            {user?.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-white font-medium">{user?.name}</p>
                          <p className="text-slate-400 text-sm">{user?.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAuthAction("logout")}
                        className="w-full text-left text-red-400 hover:text-red-300 transition-colors font-medium py-3 px-4 rounded-lg hover:bg-slate-800 flex items-center gap-2">
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="px-4">
                      <button
                        onClick={() => handleAuthAction("login")}
                        className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white px-4 py-3 rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all font-medium">
                        Sign In with Google
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAuthModal(false)}
          />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Sign In to SkillBridge
              </h3>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center mb-6">
              <p className="text-slate-300 mb-6">
                Sign in with your Google account to send and accept help requests.
              </p>

              <GoogleAuth onSuccess={() => setShowAuthModal(false)} />
            </div>

            <div className="text-xs text-slate-500 text-center">
              By signing in, you agree to our terms of service and privacy policy.
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
