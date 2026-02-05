import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Plane, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface SignupPopupProps {
  showBothOptions?: boolean; // true for homepage, false for Teemah Travels only
}

const SignupPopup = ({ showBothOptions = true }: SignupPopupProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Don't show popup if user is logged in
    if (isLoggedIn) return;

    // Check if popup was already dismissed in this session
    const wasDismissed = sessionStorage.getItem("signup_popup_dismissed");
    if (wasDismissed) return;

    // Show popup 500ms after page loads
    const showTimeout = setTimeout(() => {
      setIsVisible(true);
    }, 500);

    return () => {
      clearTimeout(showTimeout);
    };
  }, [isLoggedIn]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("signup_popup_dismissed", "true");
  };

  const handleSignup = (path: string) => {
    handleDismiss();
    navigate(path);
  };

  if (isLoggedIn) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleDismiss}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md"
          >
            <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Header */}
              <div className="p-6 pb-4 text-center">
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">
                  Join Our Community
                </h3>
                <p className="text-sm text-muted-foreground">
                  Sign up to access exclusive features and services
                </p>
              </div>

              {/* Options */}
              <div className="px-6 pb-6 space-y-3">
                {showBothOptions ? (
                  <>
                    {/* Amana Contribution Option */}
                    <button
                      onClick={() => handleSignup("/login/contribution")}
                      className="w-full p-4 rounded-xl border border-contribution/30 bg-contribution/5 hover:bg-contribution/10 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-contribution to-purple-400 flex items-center justify-center shrink-0">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-foreground">
                            Amana Market Contribution
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Join a savings group & access loans
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-contribution group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                    {/* Teemah Travels Option */}
                    <button
                      onClick={() => handleSignup("/login/travel")}
                      className="w-full p-4 rounded-xl border border-travel/30 bg-travel/5 hover:bg-travel/10 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-travel to-teal-400 flex items-center justify-center shrink-0">
                          <Plane className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-foreground">
                            Teemah Travels
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Visa assistance & travel consultation
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-travel group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  </>
                ) : (
                  /* Only Teemah Travels Option */
                  <Button
                    variant="travel"
                    className="w-full h-auto py-4"
                    onClick={() => handleSignup("/login/travel")}
                  >
                    <div className="flex items-center gap-3">
                      <Plane className="w-5 h-5" />
                      <span>Sign Up for Teemah Travels</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Button>
                )}

                {/* Dismiss link */}
                <button
                  onClick={handleDismiss}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SignupPopup;
