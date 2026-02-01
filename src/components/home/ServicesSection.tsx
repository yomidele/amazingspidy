import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Wallet,
  CreditCard,
  BarChart3,
  Plane,
  GraduationCap,
  FileCheck,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ServicesSection = () => {
  const navigate = useNavigate();

  const contributionFeatures = [
    {
      icon: Users,
      title: "Group Contributions",
      description:
        "Join or create contribution groups with rotating beneficiaries each month.",
    },
    {
      icon: Wallet,
      title: "Soft Loans",
      description:
        "Access flexible loans with automatic deductions from your beneficiary payouts.",
    },
    {
      icon: CreditCard,
      title: "Easy Payments",
      description:
        "Track your monthly contributions and view detailed payment history.",
    },
    {
      icon: BarChart3,
      title: "Real-time Reports",
      description:
        "Access comprehensive reports on contributions, loans, and payouts.",
    },
  ];

  const travelFeatures = [
    {
      icon: Plane,
      title: "Visa Consultation",
      description:
        "Expert guidance for visa applications with high success rates.",
    },
    {
      icon: FileCheck,
      title: "Refusal Reviews",
      description:
        "Professional analysis of visa refusals with strategic reapplication advice.",
    },
    {
      icon: GraduationCap,
      title: "Academic Support",
      description:
        "Dissertation structuring, assignment reviews, and thesis coaching.",
    },
    {
      icon: MessageSquare,
      title: "Live Reviews",
      description:
        "Share your experience and read reviews from our satisfied clients.",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
            Two Powerful Services, One Platform
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you're building financial security or chasing global dreams,
            AMANA MARKET has you covered.
          </p>
        </motion.div>

        {/* Service Cards Grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Amana Market Contribution */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl overflow-hidden shadow-xl"
          >
            <div className="bg-gradient-to-br from-contribution/10 via-contribution/5 to-transparent p-8 lg:p-10 border border-contribution/20 rounded-3xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-contribution to-amber-500 flex items-center justify-center shadow-contribution">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-heading text-2xl font-bold text-foreground">
                    Amana Market Contribution
                  </h3>
                  <p className="text-muted-foreground">
                    Community savings & loans
                  </p>
                </div>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid gap-4 mb-8"
              >
                {contributionFeatures.map((feature) => (
                  <motion.div
                    key={feature.title}
                    variants={itemVariants}
                    className="flex items-start gap-4 p-4 rounded-xl bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-contribution-light flex items-center justify-center shrink-0">
                      <feature.icon className="w-5 h-5 text-contribution" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <Button
                variant="contribution"
                size="lg"
                className="w-full group"
                onClick={() => navigate("/login/contribution")}
              >
                Join Amana Contribution
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>

          {/* Travel & Academic */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl overflow-hidden shadow-xl"
          >
            <div className="bg-gradient-to-br from-travel/10 via-travel/5 to-transparent p-8 lg:p-10 border border-travel/20 rounded-3xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-travel to-teal-400 flex items-center justify-center shadow-travel">
                  <Plane className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-heading text-2xl font-bold text-foreground">
                    Teemah Travels
                  </h3>
                  <p className="text-muted-foreground">
                    Visa & education consulting
                  </p>
                </div>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid gap-4 mb-8"
              >
                {travelFeatures.map((feature) => (
                  <motion.div
                    key={feature.title}
                    variants={itemVariants}
                    className="flex items-start gap-4 p-4 rounded-xl bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-travel-light flex items-center justify-center shrink-0">
                      <feature.icon className="w-5 h-5 text-travel" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <Button
                variant="travel"
                size="lg"
                className="w-full group"
                onClick={() => navigate("/teemah-travels")}
              >
                Explore Teemah Travels
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
