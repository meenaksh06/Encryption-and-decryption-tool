"use client";

import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import FloatingIcons from "@/components/FloatingIcons";
import { LockIcon, HashIcon, TrashIcon, CloudIcon, KeyIcon, ChatIcon, ShieldIcon, ChevronDownIcon } from "@/components/Icons";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const mouseX = useMotionValue(-500);
  const mouseY = useMotionValue(-500);
  const springX = useSpring(mouseX, { stiffness: 80, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 80, damping: 20 });
  const glowX = useTransform(springX, (v) => v - 350);
  const glowY = useTransform(springY, (v) => v - 350);
  const featuresInView = useInView(featuresRef, { once: true, amount: 0.15 });
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.3 });

  useEffect(() => setMounted(true), []);

  const handleLoaderComplete = () => setLoading(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <div className="min-h-screen">
      {loading && <Loader minDuration={1400} onComplete={handleLoaderComplete} />}

      <motion.div
        className={`min-h-screen ${!loading ? "page-reveal" : "opacity-0 pointer-events-none"}`}
        initial={false}
      >
        <Navbar />

        {/* Hero: split layout + Spline */}
        <section
          ref={heroRef}
          onMouseMove={handleMouseMove}
          className="relative min-h-screen flex items-center overflow-hidden grid-bg"
        >
          <motion.div
            className="pointer-events-none absolute top-0 left-0 w-[700px] h-[700px] rounded-full opacity-50"
            style={{
              x: glowX,
              y: glowY,
              background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, rgba(139,92,246,0.04) 35%, transparent 65%)",
            }}
          />
          <div className="absolute top-[15%] right-[10%] w-72 h-72 bg-[var(--color-primary)]/[0.06] rounded-full blur-[100px] pointer-events-none animate-glow-pulse" />
          <div className="absolute bottom-[20%] left-[8%] w-56 h-56 bg-[var(--color-accent)]/[0.05] rounded-full blur-[80px] pointer-events-none animate-float-slow" />

          <div className="max-w-6xl mx-auto px-6 pt-28 pb-16 w-full relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div
                variants={container}
                initial="hidden"
                animate={mounted ? "show" : "hidden"}
                className="max-w-xl"
              >
                <motion.div variants={item}>
                  <motion.span
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[11px] font-medium tracking-widest uppercase text-[var(--color-primary)]"
                    whileHover={{ scale: 1.02, borderColor: "rgba(75,21,77,0.3)" }}
                  >
                    Free & Open Source
                  </motion.span>
                </motion.div>
                <motion.h1
                  variants={item}
                  className="text-[clamp(42px,7vw,72px)] font-black leading-[0.98] tracking-[-0.04em] mt-6 font-[var(--font-display)] text-[var(--color-text)]"
                >
                  Encrypt files.
                  <br />
                  <span className="gradient-text">Verify integrity.</span>
                  <br />
                  Stay in control.
                </motion.h1>
                <motion.p
                  variants={item}
                  className="mt-6 text-[15px] text-[var(--color-text-muted)] leading-relaxed"
                >
                  AES-256 encryption, SHA-256 hashing, secure deletion, and an encrypted vault — all from one workspace.
                </motion.p>
                <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      href="/workspace"
                      className="group inline-flex items-center gap-2 px-7 py-3 rounded-[var(--radius-button)] bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold text-sm shadow-[var(--shadow-glow)] hover:opacity-90 transition-all duration-300"
                    >
                      Open Workspace
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      href="/auth"
                      className="inline-flex px-7 py-3 rounded-[var(--radius-button)] border border-[var(--color-border)] text-[var(--color-text-muted)] font-medium text-sm hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/30 transition-all duration-300"
                    >
                      Create Account
                    </Link>
                  </motion.div>
                </motion.div>
                <motion.div
                  variants={item}
                  className="mt-14 flex flex-wrap items-center gap-5 text-[11px] text-[var(--color-text-dim)] font-mono"
                >
                  {["AES-256", "SHA-256", "Secure Delete", "Cloud Drive", "Key Vault", "Encrypted Chat"].map((t) => (
                    <motion.span
                      key={t}
                      className="hover:text-[var(--color-primary)] transition-colors cursor-default"
                      whileHover={{ scale: 1.05 }}
                    >
                      {t}
                    </motion.span>
                  ))}
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={mounted ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="hidden lg:flex items-center justify-center"
              >
                <FloatingIcons />
              </motion.div>
            </div>
          </div>

          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[var(--color-text-dim)]"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDownIcon className="w-5 h-5" />
          </motion.div>
        </section>

        {/* Features */}
        <section id="features" ref={featuresRef} className="relative py-28 border-t border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-alt)]">
          <div className="max-w-5xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={featuresInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="mb-16"
            >
              <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-[var(--color-text-muted)] mb-3">Capabilities</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-[-0.03em] leading-[1.1] max-w-xl font-[var(--font-display)] text-[var(--color-text)]">
              Built for <span className="gradient-text">real security</span>
            </h2>
              <p className="text-[15px] text-[var(--color-text-muted)] leading-relaxed max-w-md mt-4">
                Zero-trust design: keys stay with you, integrity is verifiable, deletion is permanent.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="lg:col-span-8 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8 transition-shadow duration-300 hover:border-[var(--color-primary)]/20 hover:shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-[var(--color-primary-muted)] border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)]"
                    whileHover={{ rotate: [0, -5, 5, 0], scale: 1.05 }}
                    transition={{ duration: 0.4 }}
                  >
                    <LockIcon className="w-5 h-5" />
                  </motion.div>
                  <div>
                    <p className="text-[10px] font-medium tracking-widest uppercase text-[var(--color-text-muted)]">Encryption</p>
                    <h3 className="text-lg font-bold text-[var(--color-text)]">AES-256</h3>
                  </div>
                </div>
                <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed mb-5 max-w-md">
                  Unique 256-bit key and IV per file. Keys are never stored on the server.
                </p>
                <pre className="rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] p-4 font-mono text-[11px] leading-[1.7] text-[var(--color-text-muted)] overflow-x-auto">
                  <span className="text-[var(--color-text-dim)]">$</span> vaultlock encrypt report.pdf{"\n"}
                  <span className="text-[var(--color-text-dim)]">→ Key:</span> <span className="text-[var(--color-primary)]">7a3f…d921</span>{"\n"}
                  <span className="text-[var(--color-text-dim)]">→ Out:</span> <span className="text-[var(--color-primary)]">report.pdf.enc</span>{"\n"}
                  <span className="text-[var(--color-accent)]">Encrypted in 12ms</span>
                </pre>
              </motion.div>
              <div className="lg:col-span-4 flex flex-col gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  whileHover={{ y: -4 }}
                  className="flex-1 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-shadow duration-300 hover:border-[var(--color-primary)]/20 hover:shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <HashIcon className="w-4 h-4 text-[var(--color-accent)]" />
                    <p className="text-[10px] font-medium tracking-widest uppercase text-[var(--color-text-muted)]">Integrity</p>
                  </div>
                  <h3 className="text-base font-bold text-[var(--color-text)] mb-1">SHA-256</h3>
                  <code className="text-[11px] font-mono text-[var(--color-text-dim)] block truncate">a94f8c2b…e7d1</code>
                  <p className="text-[10px] text-[var(--color-accent)] mt-2">Hashes match</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  whileHover={{ y: -4 }}
                  className="flex-1 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-shadow duration-300 hover:border-[var(--color-primary)]/20 hover:shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TrashIcon className="w-4 h-4 text-[var(--color-danger)]" />
                    <p className="text-[10px] font-medium tracking-widest uppercase text-[var(--color-text-muted)]">Deletion</p>
                  </div>
                  <h3 className="text-base font-bold text-[var(--color-text)] mb-1">Secure Erase</h3>
                  <p className="text-[12px] text-[var(--color-text-muted)]">3-pass overwrite, recoverability to zero.</p>
                </motion.div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {[
                { Icon: CloudIcon, label: "Storage", title: "Cloud Drive", desc: "Encrypted files from one dashboard. Upload, download, organize.", detail: "quarterly-report.pdf · 2.4 MB" },
                { Icon: KeyIcon, label: "Zero Knowledge", title: "Key Vault", desc: "Keys encrypted with your password. PBKDF2, AES-GCM. Server never sees plaintext.", detail: "310k iterations" },
                { Icon: ChatIcon, label: "Messaging", title: "Encrypted Chat", desc: "Messages to other users. Contacts and conversations in one workspace.", detail: "End-to-end encrypted" },
              ].map((row, i) => (
                <motion.div
                  key={row.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-shadow duration-300 hover:border-[var(--color-primary)]/20 hover:shadow-[var(--shadow-card)] group"
                >
                  <motion.div whileHover={{ scale: 1.1, rotate: 5 }}>
                    <row.Icon className="w-5 h-5 text-[var(--color-primary)] mb-4 group-hover:text-[var(--color-primary-hover)] transition-colors" />
                  </motion.div>
                  <p className="text-[10px] font-medium tracking-widest uppercase text-[var(--color-text-muted)] mb-1">{row.label}</p>
                  <h3 className="text-base font-bold text-[var(--color-text)] mb-2">{row.title}</h3>
                  <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">{row.desc}</p>
                  <p className="text-[10px] font-mono text-[var(--color-text-dim)] mt-3">{row.detail}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={featuresInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.35 }}
                whileHover={{ x: 4 }}
                className="md:col-span-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex items-center gap-5 transition-shadow duration-300 hover:border-[var(--color-primary)]/20 hover:shadow-[var(--shadow-card)]"
              >
                <motion.div
                  className="w-12 h-12 rounded-xl bg-[var(--color-primary-muted)] border border-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <span className="text-xl font-black tracking-tighter">∞</span>
                </motion.div>
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text)]">Multi-File</h3>
                  <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">Unlimited files, each with unique keys.</p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={featuresInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 }}
                whileHover={{ x: -4 }}
                className="md:col-span-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 transition-shadow duration-300 hover:border-[var(--color-primary)]/20 hover:shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center gap-2">
                  <ShieldIcon className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />
                  <h3 className="text-sm font-bold text-[var(--color-text)]">Rate limiting</h3>
                </div>
                <div className="flex flex-wrap gap-4 text-[11px] font-mono text-[var(--color-text-dim)]">
                  <span><span className="text-[var(--color-primary)]">50</span>/15m enc</span>
                  <span><span className="text-[var(--color-primary)]">30</span>/15m dec</span>
                  <span><span className="text-[var(--color-primary)]">200</span>/15m total</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          ref={ctaRef}
          className="relative py-32 border-t border-[var(--color-border)] grid-bg overflow-hidden"
        >
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--color-primary)]/[0.06] rounded-full blur-[120px] pointer-events-none"
            animate={ctaInView ? { scale: [0.9, 1.1, 1], opacity: [0.3, 0.6, 0.4] } : {}}
            transition={{ duration: 2, ease: "easeOut" }}
          />
          <motion.div
            className="max-w-3xl mx-auto px-6 text-center relative z-10"
            initial={{ opacity: 0, y: 30 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-[52px] font-black tracking-[-0.03em] leading-tight mb-5 font-[var(--font-display)] text-[var(--color-text)]">
              Ready to take control
              <br />
              <span className="gradient-text">of your data?</span>
            </h2>
            <p className="text-[15px] text-[var(--color-text-muted)] mb-10 max-w-sm mx-auto">
              No credit card. No setup. Just encryption.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/workspace"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-[var(--radius-button)] bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold text-sm shadow-[var(--shadow-glow)] hover:opacity-90 transition-all duration-300"
                >
                  Get Started Free
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center px-8 py-3.5 rounded-[var(--radius-button)] border border-[var(--color-border)] text-[var(--color-text-muted)] font-medium text-sm hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] hover:border-[var(--color-primary)]/30 transition-all"
                >
                  Sign In
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <motion.footer
          className="border-t border-[var(--color-border)] py-8 bg-[var(--color-surface)]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <LockIcon className="w-3 h-3 text-white" />
              </motion.div>
              <span className="text-[13px] font-semibold text-[var(--color-text)]">VaultLock</span>
            </div>
            <p className="text-[11px] text-[var(--color-text-dim)]">©{new Date().getFullYear()} VaultLock</p>
          </div>
        </motion.footer>
      </motion.div>
    </div>
  );
}
