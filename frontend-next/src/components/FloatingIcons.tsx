"use client";

import { useEffect, useState } from "react";

const icons = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    label: "AES-256",
    color: "from-[var(--color-primary)]/20 to-[var(--color-accent)]/20",
    border: "border-[var(--color-primary)]/20",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    label: "SHA-256",
    color: "from-[var(--color-success)]/20 to-[var(--color-primary)]/20",
    border: "border-[var(--color-success)]/20",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m0-3l-3-3m0 0l-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-7.5a2.25 2.25 0 012.25-2.25H12" />
      </svg>
    ),
    label: "File Guard",
    color: "from-[var(--color-warning)]/20 to-amber-500/20",
    border: "border-[var(--color-warning)]/20",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ),
    label: "Secure Delete",
    color: "from-[var(--color-danger)]/20 to-pink-500/20",
    border: "border-[var(--color-danger)]/20",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
      </svg>
    ),
    label: "Cloud Drive",
    color: "from-[var(--color-primary)]/20 to-blue-500/20",
    border: "border-[var(--color-primary)]/20",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    label: "Rate Limit",
    color: "from-[var(--color-warning)]/20 to-lime-500/20",
    border: "border-[var(--color-warning)]/20",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75" />
      </svg>
    ),
    label: "Integrity",
    color: "from-[var(--color-accent)]/20 to-fuchsia-500/20",
    border: "border-[var(--color-accent)]/20",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
    label: "Encryption",
    color: "from-[var(--color-primary)]/20 to-[var(--color-accent)]/20",
    border: "border-[var(--color-primary)]/20",
  },
];

export default function FloatingIcons() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-[340px] h-[340px] md:w-[480px] md:h-[480px]">
      {/* Orbit rings */}
      <div className="absolute inset-0 rounded-full border border-[var(--color-border)]/30 animate-[spin_40s_linear_infinite]" />
      <div className="absolute inset-6 md:inset-10 rounded-full border border-[var(--color-border)]/20 animate-[spin_30s_linear_infinite_reverse]" />
      <div className="absolute inset-12 md:inset-20 rounded-full border border-[var(--color-border)]/10" />

      {/* Central icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center shadow-[var(--shadow-glow)] animate-pulse-glow">
          <svg
            className="w-8 h-8 md:w-10 md:h-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
      </div>

      {/* Floating icons in orbit */}
      {icons.map((item, i) => {
        const angle = (i / icons.length) * 360;
        const radius = 42; // percentage from center
        const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
        const y = 50 + radius * Math.sin((angle * Math.PI) / 180);

        return (
          <div
            key={i}
            className={`absolute transition-all duration-1000 ${
              mounted ? "opacity-100 scale-100" : "opacity-0 scale-50"
            }`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
              transitionDelay: `${i * 100}ms`,
            }}
          >
            <div
              className={`group relative w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${item.color} border ${item.border} flex items-center justify-center cursor-default hover:scale-110 transition-transform duration-300`}
              style={{
                animation: `float ${5 + i * 0.5}s ease-in-out ${i * 0.3}s infinite`,
              }}
            >
              <div className="text-white/80">{item.icon}</div>

              {/* Tooltip */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-white text-[var(--color-background)] text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {item.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
