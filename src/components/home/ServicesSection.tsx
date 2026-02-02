import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, Plane, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const ServicesSection = () => {
  const navigate = useNavigate();

  const services = [
    {
      icon: Users,
      title: "Amana Market Contribution",
      description:
        "Join community contribution groups with rotating monthly payouts. Access soft loans with automatic deductions and track your contributions in real-time.",
      features: ["Group Contributions", "Soft Loans", "Real-time Tracking", "Monthly Payouts"],
      buttonText: "View Contribution Services",
      buttonVariant: "contribution" as const,
      href: "/login/contribution",
      iconBg: "bg-contribution/10",
      iconColor: "text-contribution",
    },
    {
      icon: Plane,
      title: "Teemah Travels",
      description:
        "Expert visa consultation with high success rates. Professional guidance for applications, refusal reviews, and comprehensive academic support services.",
      features: ["Visa Consultation", "Refusal Reviews", "Academic Support", "Expert Guidance"],
      buttonText: "View Travel Services",
      buttonVariant: "travel" as const,
      href: "/teemah-travels",
      iconBg: "bg-travel/10",
      iconColor: "text-travel",
    },
  ];

  return (
    <section id="services" className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Our Services
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Two powerful services designed to help you achieve your financial and travel goals.
          </p>
        </motion.div>

        {/* Service Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full border border-border bg-white shadow-sm hover:shadow-lg transition-shadow duration-300 rounded-2xl overflow-hidden">
                <CardContent className="p-8">
                  {/* Icon */}
                  <div className={`w-14 h-14 rounded-xl ${service.iconBg} flex items-center justify-center mb-6`}>
                    <service.icon className={`w-7 h-7 ${service.iconColor}`} />
                  </div>

                  {/* Title */}
                  <h3 className="font-heading text-2xl font-bold text-foreground mb-3">
                    {service.title}
                  </h3>

                  {/* Description */}
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Features List */}
                  <ul className="space-y-2 mb-8">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-travel" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    variant={service.buttonVariant}
                    size="lg"
                    className="w-full group"
                    onClick={() => navigate(service.href)}
                  >
                    {service.buttonText}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
