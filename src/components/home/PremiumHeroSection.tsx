import { lazy, Suspense, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, Sparkles, TrendingUp, Plane, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const AuroraScene = lazy(() => import("@/components/three/AuroraScene"));

const isLowEnd = () => {
  if (typeof navigator === "undefined") return false;
  // @ts-expect-error - non-standard
  const mem = navigator.deviceMemory as number | undefined;
  const cores = navigator.hardwareConcurrency || 4;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches;
  return (mem !== undefined && mem <= 4) || cores <= 4 || coarse;
};

const PremiumHeroSection = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [mount3D, setMount3D] = useState(false);

  useEffect(() => {
    if (reduce) return;
    // Defer 3D mount to keep LCP fast
    const t = setTimeout(() => setMount3D(true), isLowEnd() ? 1200 : 250);
    return () => clearTimeout(t);
  }, [reduce]);

  const stats = [
    { value: "500+", label: "Active Members" },
    { value: "£2M+", label: "Contributions" },
    { value: "98%", label: "Visa Success" },
  ];

  return (
    <section className="relative min-h-[100dvh] overflow-hidden bg-[#0a0a1a] text-white">
      {/* Aurora gradient backdrop */}
      <div className="absolute inset-0 -z-10">
        <div className="aurora-mesh absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(167,139,250,0.25),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(74,222,128,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(96,165,250,0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(10,10,26,0.6)_70%,#0a0a1a_100%)]" />
        {/* Grain */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence baseFrequency=%220.9%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.6%22/></svg>')]" />
      </div>

      {/* 3D scene */}
      <div className="absolute inset-0 -z-[5]">
        {mount3D && (
          <Suspense fallback={null}>
            <AuroraScene />
          </Suspense>
        )}
      </div>

      <div className="container relative z-10 mx-auto flex min-h-[100dvh] flex-col justify-center px-4 pt-24 pb-16 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 backdrop-blur-xl"
              data-cursor="hover"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#a78bfa]" />
              <span className="text-xs font-medium tracking-wide text-white/80">
                Trusted by 500+ members worldwide
              </span>
            </motion.div>

            <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <RevealLine delay={0.2}>Building financial</RevealLine>
              <RevealLine delay={0.3}>
                <span className="bg-gradient-to-r from-[#a78bfa] via-[#60a5fa] to-[#4ade80] bg-clip-text text-transparent">
                  security & global dreams.
                </span>
              </RevealLine>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mx-auto mt-6 max-w-xl text-base text-white/65 sm:text-lg lg:mx-0"
            >
              AMANA MARKET unifies community contribution management, investor
              opportunities, and elite travel consulting in one premium
              platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start"
            >
              <MagneticButton onClick={() => navigate("/login/contribution")}>
                <span className="relative z-10 flex items-center gap-2">
                  Amana Contribution
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </MagneticButton>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigate("/teemah-travels")}
                className="group h-12 rounded-full border border-white/15 bg-white/[0.03] px-6 text-white backdrop-blur-xl hover:bg-white/[0.08] hover:text-white"
                data-cursor="hover"
              >
                Teemah Travels
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-5 flex justify-center lg:justify-start"
            >
              <button
                onClick={() => navigate("/login/admin")}
                className="group flex items-center gap-1.5 text-xs text-white/40 transition-colors hover:text-white/80"
                data-cursor="hover"
              >
                <Shield className="h-3 w-3" />
                Admin Portal
                <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 sm:gap-8 sm:pt-8"
            >
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.08 }}
                  className="text-center lg:text-left"
                >
                  <div className="bg-gradient-to-br from-white to-white/60 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl">
                    {s.value}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-wider text-white/45 sm:text-xs">
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Floating glass cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative hidden h-[520px] lg:block"
          >
            <FloatCard
              delay={0.5}
              className="absolute left-0 top-0 w-72"
              accent="from-[#a78bfa] to-[#60a5fa]"
              icon={<Users className="h-5 w-5 text-white" />}
              title="Amana Contribution"
              subtitle="This Month"
              value="£5,000"
              footer={
                <span className="flex items-center gap-1 text-xs text-[#4ade80]">
                  <TrendingUp className="h-3.5 w-3.5" /> +12% vs last month
                </span>
              }
            />
            <FloatCard
              delay={0.65}
              className="absolute right-0 top-36 w-72"
              accent="from-[#4ade80] to-[#60a5fa]"
              icon={<Plane className="h-5 w-5 text-white" />}
              title="Visa Application"
              subtitle="Active Case"
              value="75%"
              footer={
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#4ade80] to-[#60a5fa]" />
                </div>
              }
            />
            <FloatCard
              delay={0.8}
              className="absolute bottom-0 left-16 w-64"
              accent="from-[#f0abfc] to-[#a78bfa]"
              icon={<TrendingUp className="h-5 w-5 text-white" />}
              title="Investor Returns"
              subtitle="YTD"
              value="+18.4%"
              footer={<span className="text-xs text-white/50">Capital protected</span>}
            />
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute inset-x-0 bottom-6 flex justify-center"
        >
          <div className="flex h-9 w-5 items-start justify-center rounded-full border border-white/20 p-1">
            <motion.span
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="block h-1.5 w-1 rounded-full bg-white/70"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const RevealLine = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <span className="block overflow-hidden">
    <motion.span
      initial={{ y: "110%" }}
      animate={{ y: "0%" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className="block"
    >
      {children}
    </motion.span>
  </span>
);

const MagneticButton = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => {
  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    e.currentTarget.style.transform = `translate(${x * 0.18}px, ${y * 0.25}px)`;
  };
  const reset = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "translate(0,0)";
  };
  return (
    <button
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      data-cursor="hover"
      className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full px-7 text-sm font-semibold text-white transition-transform duration-200 ease-out will-change-transform"
    >
      <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#a78bfa] via-[#60a5fa] to-[#4ade80] opacity-90 transition-opacity group-hover:opacity-100" />
      <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#a78bfa] via-[#60a5fa] to-[#4ade80] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-70" />
      <span className="absolute inset-[1.5px] rounded-full bg-[#0a0a1a]/30 backdrop-blur-md" />
      {children}
    </button>
  );
};

const FloatCard = ({
  delay,
  className,
  accent,
  icon,
  title,
  subtitle,
  value,
  footer,
}: {
  delay: number;
  className: string;
  accent: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: string;
  footer: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -6, rotateX: 4, rotateY: -4 }}
    style={{ transformStyle: "preserve-3d" }}
    className={`${className} group rounded-2xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-shadow hover:shadow-[0_30px_80px_-20px_rgba(167,139,250,0.45)]`}
    data-cursor="hover"
  >
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} shadow-lg`}>
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-white/50">{subtitle}</div>
      </div>
    </div>
    <div className="mt-4 bg-gradient-to-br from-white to-white/70 bg-clip-text text-3xl font-bold text-transparent">
      {value}
    </div>
    <div className="mt-2">{footer}</div>
  </motion.div>
);

export default PremiumHeroSection;
