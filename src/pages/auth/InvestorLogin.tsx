import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Mail, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { secureLogin } from "@/lib/secureAuth";
import { setRememberMe } from "@/lib/rememberMe";
import { Checkbox } from "@/components/ui/checkbox";
import RoleChooserModal from "@/components/shared/RoleChooserModal";

const InvestorLogin = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRoleChooser, setShowRoleChooser] = useState(false);
  const [rememberMe, setRememberMeState] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await secureLogin(formData.email, formData.password);
      if (!result.success) throw new Error(result.error);
      setRememberMe(rememberMe);

      const data = result;

      // Check user roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const roleList = roles?.map((r) => r.role) || [];
      const isContributor = roleList.includes("contributor");
      const isInvestor = roleList.includes("investor");

      if (!isInvestor) {
        await supabase.auth.signOut();
        toast.error("You are not registered as an investor. Contact your administrator.");
        return;
      }

      // If user has both roles, show chooser
      if (isContributor && isInvestor) {
        setShowRoleChooser(true);
        return;
      }

      toast.success("Welcome back, Investor!");
      navigate("/investor-dashboard");
    } catch (error: any) {
      toast.error(error.message || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChoice = (role: "contributor" | "investor") => {
    setShowRoleChooser(false);
    if (role === "contributor") {
      navigate("/dashboard/contributor");
    } else {
      navigate("/investor-dashboard");
    }
  };

  return (
    <div className="min-h-screen flex">
      <RoleChooserModal open={showRoleChooser} onChoose={handleRoleChoice} />

      {/* Left Panel */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #111827, #000000)" }}
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-20">
          <Link to="/" className="flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to home</span>
          </Link>

          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>

          <h1 className="font-heading text-4xl xl:text-5xl font-bold text-white mb-6">
            Investor Portal
          </h1>
          <p className="text-xl text-white/80 mb-8 max-w-md">
            Track your investments, monitor returns, and grow your capital with full transparency.
          </p>

          <div className="space-y-4">
            {["Track investments in real-time", "Transparent interest & returns", "Secure & private dashboard"].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-white font-bold">✓</span>
                </div>
                <span className="text-white/90">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full" />
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to home</span>
          </Link>

          <div className="lg:hidden w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-6">
            <TrendingUp className="w-7 h-7 text-gray-900" />
          </div>

          <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Welcome, Investor</h2>
          <p className="text-muted-foreground mb-8">Sign in to access your investment dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="h-12 pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-gray-700 font-medium hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" size="lg" className="w-full bg-gray-900 hover:bg-black text-white" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Contact your administrator if you don't have investor access.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default InvestorLogin;
