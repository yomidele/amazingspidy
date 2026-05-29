import { motion, useScroll, useSpring } from "framer-motion";

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 24, mass: 0.3 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: "0% 50%" }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[9990] h-[2px] bg-gradient-to-r from-[#4ade80] via-[#60a5fa] to-[#a78bfa]"
      aria-hidden
    />
  );
};

export default ScrollProgress;
