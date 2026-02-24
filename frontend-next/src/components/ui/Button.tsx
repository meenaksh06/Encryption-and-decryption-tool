"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg shadow-[#4B154D]/20 hover:shadow-[#4B154D]/30 hover:-translate-y-0.5",
  secondary:
    "bg-[#F9F7FA] text-[#1A1A1A] hover:text-[#1A1A1A] hover:bg-[#E8E6EA] border border-[#E8E6EA]",
  ghost:
    "bg-transparent text-[#555555] hover:text-[#1A1A1A] hover:bg-[#F9F7FA]",
  danger:
    "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200",
  success:
    "bg-[#E6F8F5] text-[#009E8A] hover:bg-[#00BFA6]/20 border border-[#00BFA6]/30",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-7 py-3.5 text-base rounded-xl gap-2.5",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconRight,
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-semibold
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
        {iconRight && !loading && (
          <span className="flex-shrink-0">{iconRight}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;



