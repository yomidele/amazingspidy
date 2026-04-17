import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/password-reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: anonKey },
          body: JSON.stringify({
            email,
            redirectTo: `${window.location.origin}/reset-password`,
          }),
        }
      );

      const data = await res.json();

      if (res.status === 429) {
        toast.error(data.error || "Please wait before trying again.");
        return;
      }

      setSent(true);
      toast.success("If this email exists, a reset link has been sent.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
          <KeyRound className="w-7 h-7 text-primary" />
        </div>

        <h1 className="font-heading text-2xl font-bold mb-2">Forgot password?</h1>
        <p className="text-muted-foreground mb-8">
          Enter your email and we'll send you a secure link to reset your password.
          The link expires in 30 minutes.
        </p>

        {sent ? (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm">
                If an account exists for <strong>{email}</strong>, a password reset
                link has been sent. Check your inbox (and spam folder).
              </p>
            </div>
            <Link to="/login/contribution">
              <Button variant="outline" className="w-full">
                Back to login
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-10"
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
