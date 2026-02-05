import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
const ClassicHeroSection = () => {
  const navigate = useNavigate();
  const trustBadges = ["Trusted by 500+ members", "98% visa success rate", "Secure & transparent"];
  const stats = [{
    value: "500+",
    label: "Active Members"
  }, {
    value: "£2M+",
    label: "Contributions Managed"
  }, {
    value: "98%",
    label: "Visa Success Rate"
  }];
  return <section className="relative min-h-[100dvh] flex items-center bg-background overflow-hidden">
      {/* Subtle background accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-contribution/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-travel/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10 pt-20 sm:pt-24 lg:pt-0">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.1
        }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted border border-border mb-6">
            <Shield className="w-4 h-4 text-travel" />
            <span className="text-sm font-medium text-muted-foreground">
              Your Trusted Multi-Service Platform
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.2
        }} className="font-heading text-foreground mb-4 sm:mb-6 leading-tight text-center">
            <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">
              Building Financial Security.
            </span>
            <span className="block gradient-text-travel text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mt-2">
              Enabling Global Dreams.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.3
        }} className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            AMANA MARKET brings together community contribution management and
            professional travel consulting services—all in one trusted platform.
          </motion.p>

          {/* CTA Button */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.4
        }} className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8">
            <Button size="xl" onClick={() => {
            const servicesSection = document.getElementById('services-section');
            servicesSection?.scrollIntoView({
              behavior: 'smooth'
            });
          }} className="bg-primary text-primary-foreground hover:bg-primary/90 group">
              Explore Our Services
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.5
        }} className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-12">
            {trustBadges.map(badge => <div key={badge} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-travel" />
                <span className="text-sm text-muted-foreground">{badge}</span>
              </div>)}
          </motion.div>

          {/* Stats */}
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.6
        }} className="grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto pt-8 border-t border-border">
            {stats.map(stat => <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>)}
          </motion.div>

          {/* Admin Access - subtle */}
          <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.8
        }} className="mt-8">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login/admin")} className="text-muted-foreground hover:text-foreground">
              <Shield className="w-4 h-4 mr-2" />
              Admin Portal
            </Button>
          </motion.div>
        </div>
      </div>
    </section>;
};
export default ClassicHeroSection;