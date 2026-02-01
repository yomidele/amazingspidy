import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Mail, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ContributionLogin = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard/contributor");
      } else {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: formData.fullName,
              role: "contributor",
            },
          },
        });
        if (error) throw error;
        toast.success("Please check your email to verify your account.");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: "var(--gradient-contribution)" }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-20">
          <Link
            to="/"
            className="flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to home</span>
          </Link>

          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8">
            <Users className="w-8 h-8 text-white" />
          </div>

          <h1 className="font-heading text-4xl xl:text-5xl font-bold text-white mb-6">
            Contribution System
          </h1>
          <p className="text-xl text-white/80 mb-8 max-w-md">
            Join our trusted community of contributors. Build wealth together
            through monthly contributions and flexible soft loans.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
              <span className="text-white/90">Rotating monthly payouts</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
              <span className="text-white/90">Flexible soft loans</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
              <span className="text-white/90">Transparent tracking</span>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full" />
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Link
            to="/"
            className="lg:hidden flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to home</span>
          </Link>

          <div className="lg:hidden w-14 h-14 rounded-xl bg-contribution-light flex items-center justify-center mb-6">
            <Users className="w-7 h-7 text-contribution" />
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
            {isLogin ? "Welcome back, Contributor" : "Join as a Contributor"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isLogin
              ? "Sign in to access your contribution dashboard"
              : "Create an account to start contributing"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  required={!isLogin}
                  className="h-12"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  className="h-12 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  className="h-12 pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-contribution hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <Button
              type="submit"
              variant="contribution"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isLogin
                ? "Sign In"
                : "Create Account"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-contribution font-semibold hover:underline"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>

          <div className="mt-8 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Looking for travel services?{" "}
              <Link
                to="/login/travel"
                className="text-travel font-semibold hover:underline"
              >
                Login here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContributionLogin;
