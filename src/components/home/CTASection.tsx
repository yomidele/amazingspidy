import { forwardRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Shield, Users, Headphones } from "lucide-react";

const CTASection = forwardRef<HTMLElement>((_, ref) => {
  const steps = [
    {
      icon: Users,
      title: "Choose Your Service",
      description: "Select from contribution management or travel consulting based on your needs.",
    },
    {
      icon: Shield,
      title: "Create Your Account",
      description: "Sign up securely and access your personalized dashboard instantly.",
    },
    {
      icon: CheckCircle,
      title: "Start Your Journey",
      description: "Begin managing contributions or planning your travel with expert guidance.",
    },
    {
      icon: Headphones,
      title: "Get Ongoing Support",
      description: "Enjoy dedicated support and real-time updates throughout your experience.",
    },
  ];

  return (
    <section ref={ref} className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Getting started with AMANA MARKET is simple. Follow these steps to begin your journey.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              {/* Step Number */}
              <div className="relative inline-block mb-6">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <step.icon className="w-7 h-7 text-travel" />
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  {index + 1}
                </div>
              </div>

              {/* Content */}
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-16 border-t border-border" />

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground mb-6">
            Trusted by hundreds of members worldwide
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5 text-travel" />
              <span className="text-sm font-medium">Secure Platform</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="w-5 h-5 text-travel" />
              <span className="text-sm font-medium">Transparent Processes</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Headphones className="w-5 h-5 text-travel" />
              <span className="text-sm font-medium">24/7 Support</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

CTASection.displayName = "CTASection";

export default CTASection;
