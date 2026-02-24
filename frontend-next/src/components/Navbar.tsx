"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, getUsername, logout } from "@/lib/api";
import { LockIcon, MenuIcon, XIcon, ArrowRightIcon } from "@/components/Icons";

export default function Navbar() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) setUsername(getUsername());

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/workspace", label: "Workspace" },
    { href: "/drive", label: "Drive" },
    { href: "/chat", label: "Chat" },
    { href: "/vault", label: "Vault" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[rgba(5,5,8,0.9)] backdrop-blur-xl border-b border-white/[0.06]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white shadow-[var(--shadow-glow)] group-hover:shadow-[0_0_28px_rgba(6,182,212,0.35)] transition-shadow duration-300">
            <LockIcon className="w-4 h-4" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white/80 group-hover:text-white transition-colors font-[var(--font-display)]">
            VaultLock
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                isActive(link.href)
                  ? "text-white bg-white/[0.08]"
                  : "text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {username ? (
            <>
              <span className="hidden md:block text-[12px] text-white/30 font-mono">{username}</span>
              <button
                onClick={logout}
                className="text-[12px] px-4 py-2 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="text-[12px] px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold hover:opacity-90 shadow-[var(--shadow-glow)] transition-all flex items-center gap-2"
            >
              Launch App
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          )}

          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-white/50"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-[rgba(5,5,8,0.97)] backdrop-blur-xl border-b border-white/[0.06] px-6 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 rounded-lg text-[13px] font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-white/[0.08] text-white"
                  : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
