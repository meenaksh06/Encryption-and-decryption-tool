"use client";

import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "primary";
  size?: "sm" | "md";
  className?: string;
  dot?: boolean;
}

const variantStyles = {
  default: "bg-[#F9F7FA] text-[#555555]",
  success: "bg-[#E6F8F5] text-[#009E8A]",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
  info: "bg-blue-50 text-blue-600",
  primary: "bg-[#4B154D]/10 text-[#4B154D]",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
};

const dotColors = {
  default: "bg-[#555555]",
  success: "bg-[#00BFA6]",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  primary: "bg-[#4B154D]",
};

export default function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}



