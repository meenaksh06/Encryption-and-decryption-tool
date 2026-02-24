"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type LoaderProps = {
  onComplete?: () => void;
  minDuration?: number;
};

export default function Loader({ onComplete, minDuration = 1200 }: LoaderProps) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const duration = minDuration;
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - t, 2);
      setProgress(easeOut * 100);

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setExiting(true);
        const timeout = setTimeout(() => onComplete?.(), 450);
        return () => clearTimeout(timeout);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [minDuration, onComplete]);

  return (
    <AnimatePresence mode="wait">
      {!exiting && (
        <motion.div
          key="loader"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-background)]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        >
          <motion.div
            className="w-full max-w-[220px]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="h-[2px] bg-white/[0.08] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]"
                style={{ width: `${progress}%` }}
                transition={{ type: "tween", duration: 0.12 }}
              />
            </div>
          </motion.div>
          <motion.p
            className="mt-4 text-[11px] font-medium tracking-[0.2em] uppercase text-white/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            Loading
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
