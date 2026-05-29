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
  TrendingUp,
  ShieldCheck,
  PiggyBank,
  Percent,
  LucideIcon,
} from "lucide-react";

const ServicesSection = () => {
  const navigate = useNavigate();

  const services = [
    {
      key: "contribution",
      title: "Amana Contribution",
      subtitle: "Community savings & loans",
      icon: Users,
      gradient: "from-[#a78bfa] to-[#60a5fa]",
      cta: "Join Amana Contribution",
      to: "/login/contribution",
      features: [
        { icon: Users, title: "Group Contributions", description: "Rotating beneficiaries each month." },
        { icon: Wallet, title: "Soft Loans", description: "Flexible loans, auto-deducted from payouts." },
        { icon: CreditCard, title: "Easy Payments", description: "Track contributions & history seamlessly." },
        { icon: BarChart3, title: "Real-time Reports", description: "Insights on contributions and loans." },
      ],
    },
    {
      key: "travel",
      title: "Teemah Travels",
      subtitle: "Visa & education consulting",
      icon: Plane,
      gradient: "from-[#4ade80] to-[#60a5fa]",
      cta: "Explore Teemah Travels",
      to: "/teemah-travels",
      features: [
        { icon: Plane, title: "Visa Consultation", description: "Expert guidance with high success rates." },
        { icon: FileCheck, title: "Refusal Reviews", description: "Strategic reapplication analysis." },
        { icon: GraduationCap, title: "Academic Support", description: "Dissertation & thesis coaching." },
        { icon: MessageSquare, title: "Live Reviews", description: "Real stories from our clients." },
      ],
    },
    {
      key: "investor",
      title: "Invest With Us",
      subtitle: "Grow your wealth securely",
      icon: TrendingUp,
      gradient: "from-[#f0abfc] to-[#a78bfa]",
      cta: "Become an Investor",
      to: "/become-investor",
      features: [
        { icon: PiggyBank, title: "Secure Investments", description: "Competitive returns, full transparency." },
        { icon: Percent, title: "Attractive Returns", description: "Flexible durations, real yields." },
        { icon: ShieldCheck, title: "Protected Capital", description: "Tracked with full accountability." },
        { icon: BarChart3, title: "Investor Dashboard", description: "Monitor portfolio in real time." },
      ],
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#0a0a1a] py-24 text-white sm:py-32">
      {/* Aurora bg */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="aurora-mesh absolute inset-0" />
      </div>

      <div className="container relative z-10 mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-16 max-w-3xl text-center sm:mb-20"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-wider text-white/70 backdrop-blur-xl">
            What we do
          </span>
          <h2 className="mt-5 font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            Three powerful services,{" "}
            <span className="bg-gradient-to-r from-[#a78bfa] via-[#60a5fa] to-[#4ade80] bg-clip-text text-transparent">
              one premium platform.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/60 sm:text-lg">
            Whether you're building financial security, growing wealth through
            investments, or chasing global dreams — AMANA MARKET has you covered.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {services.map((s, i) => (
            <ServiceCard key={s.key} {...s} index={i} onClick={() => navigate(s.to)} />
          ))}
        </div>
      </div>
    </section>
  );
};

const ServiceCard = ({
  title,
  subtitle,
  icon: Icon,
  gradient,
  cta,
  features,
  onClick,
  index,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  cta: string;
  features: { icon: LucideIcon; title: string; description: string }[];
  onClick: () => void;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.7, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -8 }}
    className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl transition-all duration-500 hover:border-white/20 hover:bg-white/[0.06] sm:p-8"
    data-cursor="hover"
  >
    {/* Hover glow */}
    <div
      className={`pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-br ${gradient} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20`}
    />
    {/* Top accent line */}
    <div
      className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${gradient} opacity-40 transition-opacity duration-500 group-hover:opacity-100`}
    />

    <div className="relative">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-[0_10px_30px_-10px_rgba(167,139,250,0.6)]`}
        >
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div>
          <h3 className="font-heading text-xl font-bold text-white sm:text-2xl">{title}</h3>
          <p className="text-sm text-white/55">{subtitle}</p>
        </div>
      </div>

      <ul className="mt-6 grid gap-2">
        {features.map((f) => (
          <li
            key={f.title}
            className="group/item flex items-start gap-3 rounded-xl border border-transparent p-3 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] transition-colors group-hover/item:bg-white/10">
              <f.icon className="h-4 w-4 text-white/80" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{f.title}</div>
              <div className="text-xs text-white/55">{f.description}</div>
            </div>
          </li>
        ))}
      </ul>

      <button
        onClick={onClick}
        data-cursor="hover"
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r ${gradient} px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-[0_20px_40px_-10px_rgba(167,139,250,0.6)]`}
      >
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </button>
    </div>
  </motion.div>
);

export default ServicesSection;
