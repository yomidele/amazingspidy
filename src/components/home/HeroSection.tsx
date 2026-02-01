import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Users, Plane, Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: "var(--gradient-hero)" }}
      >
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-contribution/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-travel/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-foreground/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10 pt-20 sm:pt-24 lg:pt-0">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-20 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-6"
            >
              <Shield className="w-4 h-4 text-travel" />
              <span className="text-sm font-medium text-primary-foreground/90">
                Trusted by 500+ Members
              </span>
            </motion.div>

            <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 sm:mb-6 leading-tight">
              Welcome to{" "}
              <span className="gradient-text-contribution">AMANA MARKET</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-primary-foreground/70 mb-6 sm:mb-8 max-w-xl mx-auto lg:mx-0">
              Your trusted platform for Amana Market Contribution management and
              Teemah Travels consultation services.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Button
                variant="contribution"
                size="lg"
                onClick={() => navigate("/login/contribution")}
                className="group w-full sm:w-auto text-sm sm:text-base"
              >
                Amana Contribution
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="hero-outline"
                size="lg"
                onClick={() => navigate("/teemah-travels")}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Teemah Travels
              </Button>
            </div>

            {/* Admin Access Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login/admin")}
                className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin Portal
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-3 gap-3 sm:gap-6 mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-primary-foreground/10"
            >
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground">
                  500+
                </div>
                <div className="text-xs sm:text-sm text-primary-foreground/60">
                  Active Members
                </div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground">
                  £2M+
                </div>
                <div className="text-xs sm:text-sm text-primary-foreground/60">
                  Contributions
                </div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground">
                  98%
                </div>
                <div className="text-xs sm:text-sm text-primary-foreground/60">
                  Visa Success
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Floating Cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative h-[500px]">
              {/* Contribution Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="absolute top-0 left-0 w-72 glass rounded-2xl p-6 shadow-xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-contribution-light flex items-center justify-center">
                    <Users className="w-6 h-6 text-contribution" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Amana Contribution</h3>
                    <p className="text-sm text-muted-foreground">This Month</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">
                  $5,000
                </div>
                <div className="flex items-center gap-2 text-sm text-success">
                  <TrendingUp className="w-4 h-4" />
                  <span>+12% from last month</span>
                </div>
              </motion.div>

              {/* Travel Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute top-32 right-0 w-72 glass rounded-2xl p-6 shadow-xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-travel-light flex items-center justify-center">
                    <Plane className="w-6 h-6 text-travel" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Teemah Travels</h3>
                    <p className="text-sm text-muted-foreground">Visa Status</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-foreground">75%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-travel to-teal-400 rounded-full"
                      style={{ width: "75%" }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Loan Balance Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="absolute bottom-0 left-16 w-64 glass rounded-2xl p-6 shadow-xl"
              >
                <div className="text-sm text-muted-foreground mb-2">
                  Outstanding Loan
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  $1,200
                </div>
                <div className="text-sm text-contribution">
                  Auto-deduct on next payout
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
