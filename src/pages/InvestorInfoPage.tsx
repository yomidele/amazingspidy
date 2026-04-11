import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Shield,
  BarChart3,
  PiggyBank,
  Users,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const benefits = [
  {
    icon: TrendingUp,
    title: "Competitive Returns",
    description:
      "Earn attractive interest rates on your investment with transparent tracking of your portfolio performance.",
  },
  {
    icon: Shield,
    title: "Secured Investment",
    description:
      "Your capital is backed by a well-managed contribution pool with strong repayment records and risk mitigation.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Dashboard",
    description:
      "Monitor your investments, track returns, and view payment history through a dedicated investor dashboard.",
  },
  {
    icon: PiggyBank,
    title: "Flexible Terms",
    description:
      "Choose investment durations and amounts that suit your financial goals with customisable terms.",
  },
  {
    icon: Users,
    title: "Community Impact",
    description:
      "Your investment directly supports members of the Amana Market community, enabling loans and growth.",
  },
  {
    icon: CheckCircle2,
    title: "Transparent Reporting",
    description:
      "Receive detailed statements showing exactly how your funds are allocated and returns generated.",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Submit Your Application",
    description: "Fill in the form below with your details and investment interest.",
  },
  {
    step: "2",
    title: "Admin Review",
    description: "Our team reviews your application and contacts you to discuss terms.",
  },
  {
    step: "3",
    title: "Account Activation",
    description: "Once approved, your investor account is created with your chosen terms.",
  },
  {
    step: "4",
    title: "Start Earning",
    description: "Fund your investment and start tracking returns on your personal dashboard.",
  },
];

const faqs = [
  {
    q: "What is the minimum investment amount?",
    a: "The minimum investment amount varies depending on the current pool and terms. Our team will discuss the specifics during the review process.",
  },
  {
    q: "How are returns calculated?",
    a: "Returns are based on the agreed interest rate and duration. You'll see a clear breakdown of expected returns before committing.",
  },
  {
    q: "Can I withdraw my investment early?",
    a: "Early withdrawal policies are discussed during onboarding. In general, investments are tied to the agreed duration for optimal returns.",
  },
  {
    q: "How often do I receive payments?",
    a: "Payment schedules are agreed upon during setup — typically monthly or at the end of the investment term.",
  },
];

const InvestorInfoPage = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Please fill in your name and email.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("investor_requests" as any)
        .insert({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          message: form.message.trim() || null,
        } as any);
      if (error) throw error;
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (err: any) {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 50%, hsl(var(--accent)/0.6) 100%)" }}>
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <TrendingUp className="w-4 h-4 text-emerald-300" />
              <span className="text-sm font-medium text-white/90">
                Investment Opportunity
              </span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Grow Your Wealth with{" "}
              <span className="text-emerald-300">Amana Market</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              Join our investor programme and earn competitive returns while
              supporting a thriving contribution community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => {
                  setShowForm(true);
                  document.getElementById("apply-section")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Become an Investor
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                onClick={() => navigate("/login/investor")}
              >
                <LogIn className="w-5 h-5 mr-2" />
                Investor Login
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Why Invest with Us?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We offer a transparent, secure, and rewarding investment experience.
            </p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow border-border/50">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                      <b.icon className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h3 className="font-semibold text-foreground text-lg mb-2">{b.title}</h3>
                    <p className="text-muted-foreground text-sm">{b.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
          </motion.div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-border/50 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-foreground pr-4">{faq.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-muted-foreground text-sm">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Section */}
      <section id="apply-section" className="py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Ready to Invest?
            </h2>
            <p className="text-muted-foreground">
              Submit your application and our team will get back to you.
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => setShowForm(true)}
            >
              Become an Investor
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/login/investor")}
            >
              <LogIn className="w-5 h-5 mr-2" />
              Existing Investor? Login
            </Button>
          </div>

          <AnimatePresence>
            {showForm && !submitted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input
                          id="full_name"
                          value={form.full_name}
                          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="Enter your phone number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="message">Why do you want to invest? (Optional)</Label>
                        <Textarea
                          id="message"
                          value={form.message}
                          onChange={(e) => setForm({ ...form, message: e.target.value })}
                          placeholder="Tell us about your investment goals..."
                          rows={4}
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                      >
                        {submitting ? "Submitting..." : "Submit Application"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {submitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Application Submitted!
                  </h3>
                  <p className="text-muted-foreground">
                    Thank you for your interest. Our team will review your application
                    and contact you shortly.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default InvestorInfoPage;
