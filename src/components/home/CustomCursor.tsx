import { useEffect, useRef, useState } from "react";

const isTouch = () =>
  typeof window !== "undefined" &&
  (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window);

const CustomCursor = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (isTouch()) return;
    setEnabled(true);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      }
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive = target?.closest("a, button, [role='button'], input, textarea, select, [data-cursor='hover']");
      setHover(!!interactive);
    };

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-1.5 w-1.5 rounded-full bg-white mix-blend-difference"
        aria-hidden
      />
      <div
        ref={ringRef}
        className={`pointer-events-none fixed left-0 top-0 z-[9998] rounded-full border border-white/40 mix-blend-difference transition-[width,height,opacity] duration-300 ease-out ${
          hover ? "h-14 w-14 opacity-100" : "h-9 w-9 opacity-70"
        }`}
        aria-hidden
      />
    </>
  );
};

export default CustomCursor;
