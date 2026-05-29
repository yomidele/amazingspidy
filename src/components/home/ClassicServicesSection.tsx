import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users, Wallet, CreditCard, BarChart3, Plane, GraduationCap,
  FileCheck, MessageSquare, ArrowRight, TrendingUp, ShieldCheck,
  PiggyBank, Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ClassicServicesSection = () => {
  const navigate = useNavigate();

  const contributionFeatures = [
    { icon: Users, title: "Group Contributions", description: "Join or create contribution groups with rotating beneficiaries each month." },
    { icon: Wallet, title: "Soft Loans", description: "Access flexible loans with automatic deductions from your beneficiary payouts." },
    { icon: CreditCard, title: "Easy Payments", description: "Track your monthly contributions and view detailed payment history." },
    { icon: BarChart3, title: "Real-time Reports", description: "Access comprehensive reports on contributions, loans, and payouts." },
  ];

  const travelFeatures = [
    { icon: Plane, title: "Visa Consultation", description: "Expert guidance for visa applications with high success rates." },
    { icon: FileCheck, title: "Refusal Reviews", description: "Professional analysis of visa refusals with strategic reapplication advice." },
    { icon: GraduationCap, title: "Academic Support", description: "Dissertation structuring, assignment reviews, and thesis coaching." },
    { icon: MessageSquare, title: "Live Reviews", description: "Share your experience and read reviews from our satisfied clients." },
  ];

  const investorFeatures = [
    { icon: PiggyBank, title: "Secure Investments", description: "Invest your capital with competitive returns and full transparency." },
    { icon: Percent, title: "Attractive Returns", description: "Earn interest on your investment with flexible duration options." },
    { icon: ShieldCheck, title: "Protected Capital", description: "Your investments are tracked and managed with full accountability." },
    { icon: BarChart3, title: "Investor Dashboard", description: "Monitor your portfolio, track payments, and view earnings in real-time." },
  ];

  const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10 sm:mb-16">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            Three Powerful Services, One Platform
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            Whether you're building financial security, growing your wealth through investments,
            or chasing global dreams, AMANA MARKET has you covered.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="rounded-3xl overflow-hidden shadow-xl">
            <div className="bg-gradient-to-br from-contribution/10 via-contribution/5 to-transparent p-5 sm:p-8 lg:p-10 border border-contribution/20 rounded-3xl">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-contribution to-purple-400 flex items-center justify-center shadow-contribution">
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Amana Market Contribution</h3>
                  <p className="text-sm text-muted-foreground">Community savings & loans</p>
                </div>
              </div>
              <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid gap-3 sm:gap-4 mb-6 sm:mb-8">
                {contributionFeatures.map((f) => (
                  <motion.div key={f.title} variants={item} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-card/50 hover:bg-card transition-colors">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-contribution-light flex items-center justify-center shrink-0">
                      <f.icon className="w-4 h-4 sm:w-5 sm:h-5 text-contribution" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm sm:text-base text-foreground">{f.title}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">{f.description}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              <Button variant="contribution" size="lg" className="w-full group text-sm sm:text-base" onClick={() => navigate("/login/contribution")}>
                Join Amana Contribution
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="rounded-3xl overflow-hidden shadow-xl">
            <div className="bg-gradient-to-br from-travel/10 via-travel/5 to-transparent p-5 sm:p-8 lg:p-10 border border-travel/20 rounded-3xl">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-travel to-teal-400 flex items-center justify-center shadow-travel">
                  <Plane className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Teemah Travels</h3>
                  <p className="text-sm text-muted-foreground">Visa & education consulting</p>
                </div>
              </div>
              <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid gap-3 sm:gap-4 mb-6 sm:mb-8">
                {travelFeatures.map((f) => (
                  <motion.div key={f.title} variants={item} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-card/50 hover:bg-card transition-colors">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-travel-light flex items-center justify-center shrink-0">
                      <f.icon className="w-4 h-4 sm:w-5 sm:h-5 text-travel" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm sm:text-base text-foreground">{f.title}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">{f.description}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              <Button variant="travel" size="lg" className="w-full group text-sm sm:text-base" onClick={() => navigate("/teemah-travels")}>
                Explore Teemah Travels
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-3xl overflow-hidden shadow-xl">
            <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-black p-5 sm:p-8 lg:p-10 border border-gray-800 rounded-3xl text-white">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-white">Invest With Us</h3>
                  <p className="text-sm text-white/60">Grow your wealth securely</p>
                </div>
              </div>
              <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid gap-3 sm:gap-4 mb-6 sm:mb-8">
                {investorFeatures.map((f) => (
                  <motion.div key={f.title} variants={item} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <f.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm sm:text-base text-white">{f.title}</h4>
                      <p className="text-xs sm:text-sm text-white/50">{f.description}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              <Button size="lg" className="w-full group text-sm sm:text-base bg-white text-black hover:bg-white/90" onClick={() => navigate("/become-investor")}>
                Become an Investor
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ClassicServicesSection;
