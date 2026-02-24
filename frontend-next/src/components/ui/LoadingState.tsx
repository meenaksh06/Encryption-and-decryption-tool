"use client";

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  variant?: "spinner" | "skeleton" | "dots";
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function LoadingState({
  variant = "spinner",
  message,
  className = "",
  size = "md",
}: LoadingStateProps) {
  const sizeStyles = {
    sm: { spinner: "w-4 h-4", container: "py-8" },
    md: { spinner: "w-6 h-6", container: "py-16" },
    lg: { spinner: "w-8 h-8", container: "py-24" },
  };

  if (variant === "dots") {
    return (
      <div className={`flex items-center justify-center ${sizeStyles[size].container} ${className}`}>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[var(--color-primary)]"
              style={{
                animation: "pulse 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </div>
        {message && (
          <p className="text-sm text-[var(--color-text-muted)] ml-4">{message}</p>
        )}
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="h-4 bg-[var(--color-surface-hover)] rounded shimmer w-3/4" />
        <div className="h-4 bg-[var(--color-surface-hover)] rounded shimmer w-1/2" />
        <div className="h-4 bg-[var(--color-surface-hover)] rounded shimmer w-5/6" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${sizeStyles[size].container} ${className}`}>
      <Loader2 className={`${sizeStyles[size].spinner} text-[var(--color-primary)] animate-spin`} />
      {message && (
        <p className="text-sm text-gray-500 mt-4">{message}</p>
      )}
    </div>
  );
}

// Skeleton variants for different use cases
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`glass-card p-6 space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded shimmer w-1/3" />
          <div className="h-3 bg-gray-100 rounded shimmer w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded shimmer" />
        <div className="h-3 bg-gray-100 rounded shimmer w-4/5" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
          <div className="w-8 h-8 rounded-lg bg-gray-100 shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded shimmer w-1/4" />
            <div className="h-3 bg-gray-100 rounded shimmer w-1/2" />
          </div>
          <div className="w-20 h-8 rounded-lg bg-gray-100 shimmer" />
        </div>
      ))}
    </div>
  );
}


