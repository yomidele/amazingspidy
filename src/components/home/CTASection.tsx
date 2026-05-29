import { forwardRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";

const CTASection = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();

  const benefits = [
    "Secure & transparent platform",
    "Expert guidance at every step",
    "Real-time tracking & updates",
    "Dedicated support team",
  ];

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#0a0a1a] py-24 text-white sm:py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora-mesh absolute inset-0 opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a0a1a_75%)]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-2xl sm:p-14"
        >
          <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#a78bfa] to-transparent" />

          <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            Ready to{" "}
            <span className="bg-gradient-to-r from-[#a78bfa] via-[#60a5fa] to-[#4ade80] bg-clip-text text-transparent">
              get started?
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/65 sm:text-lg">
            Join thousands of members who trust us with their financial goals and travel aspirations.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {benefits.map((b, i) => (
              <motion.div
                key={b}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 backdrop-blur-xl"
              >
                <CheckCircle className="h-3.5 w-3.5 text-[#4ade80]" />
                <span className="text-xs font-medium text-white/80 sm:text-sm">{b}</span>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/login/contribution")}
              data-cursor="hover"
              className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full px-7 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#a78bfa] via-[#60a5fa] to-[#4ade80]" />
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#a78bfa] via-[#60a5fa] to-[#4ade80] opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-70" />
              <span className="relative z-10 flex items-center gap-2">
                Join Amana Contribution
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </button>
            <button
              onClick={() => navigate("/teemah-travels")}
              data-cursor="hover"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-7 text-sm font-semibold text-white backdrop-blur-xl transition-colors hover:bg-white/[0.08]"
            >
              Explore Teemah Travels
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
});

CTASection.displayName = "CTASection";

export default CTASection;
