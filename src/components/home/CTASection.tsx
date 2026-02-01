import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const CTASection = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();

  const benefits = [
    "Secure & transparent platform",
    "Expert guidance at every step",
    "Real-time tracking & updates",
    "Dedicated support team",
  ];

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-contribution/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-travel/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/70 mb-8 max-w-2xl mx-auto">
            Join thousands of members who trust us with their financial goals
            and travel aspirations.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {benefits.map((benefit) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20"
              >
                <CheckCircle className="w-4 h-4 text-travel" />
                <span className="text-sm font-medium text-primary-foreground/90">
                  {benefit}
                </span>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="contribution"
              size="xl"
              onClick={() => navigate("/login/contribution")}
              className="group"
            >
              Start Contributing
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="travel"
              size="xl"
              onClick={() => navigate("/login/travel")}
              className="group"
            >
              Book Consultation
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

CTASection.displayName = "CTASection";

export default CTASection;
