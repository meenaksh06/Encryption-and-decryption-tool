"use client";

import { motion } from "framer-motion";
import { LockIcon } from "@/components/Icons";

type HeroSplineProps = {
  /** Set in .env as NEXT_PUBLIC_SPLINE_SCENE or pass here. Unused when Spline is disabled; shows animated fallback. */
  sceneUrl?: string | null;
  className?: string;
};

/**
 * Hero section with animated lock visual. Spline 3D is disabled to avoid
 * @splinetool/react-spline export resolution issues with Next/Webpack.
 * Set NEXT_PUBLIC_SPLINE_SCENE and re-enable the Spline import below to use 3D.
 */
export default function HeroSpline({ className = "" }: HeroSplineProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--color-surface)] ${className}`}
      style={{ minHeight: 340 }}
    >
      <div className="absolute inset-0">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 w-96 h-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-primary)]/20"
          style={{ filter: "blur(60px)" }}
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-[var(--color-accent)]/15"
          style={{ filter: "blur(50px)" }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-36 h-36 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm flex items-center justify-center shadow-[var(--shadow-glow)]"
        >
          <LockIcon className="w-14 h-14 text-[var(--color-primary)]/80" />
        </motion.div>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_0%,var(--color-surface)_65%)]" />
    </div>
  );
}
