import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  const navigate = useNavigate();

  const trustPoints = [
    "Trusted by 500+ members",
    "98% visa success rate",
    "Secure & transparent",
  ];

  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 bg-white">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border mb-8"
          >
            <Shield className="w-4 h-4 text-travel" />
            <span className="text-sm font-medium text-muted-foreground">
              Your Trusted Multi-Service Platform
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight"
          >
            Building Financial Security.{" "}
            <span className="text-travel">Enabling Global Dreams.</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            AMANA MARKET brings together community contribution management and 
            professional travel consulting services—all in one trusted platform.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <Button
              variant="default"
              size="xl"
              onClick={() => {
                const servicesSection = document.getElementById("services");
                servicesSection?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
            >
              Explore Our Services
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Trust Points */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-6"
          >
            {trustPoints.map((point) => (
              <div
                key={point}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <CheckCircle className="w-5 h-5 text-travel" />
                <span className="text-sm font-medium">{point}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16 md:mt-24 grid grid-cols-3 gap-8 max-w-3xl mx-auto"
        >
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
              500+
            </div>
            <div className="text-sm text-muted-foreground">Active Members</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
              £2M+
            </div>
            <div className="text-sm text-muted-foreground">Contributions Managed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
              98%
            </div>
            <div className="text-sm text-muted-foreground">Visa Success Rate</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
