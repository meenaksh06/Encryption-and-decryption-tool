"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "bordered" | "dashed";
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const variantStyles = {
  default: "glass-card",
  elevated: "glass-card shadow-xl",
  bordered: "glass-card border-2",
  dashed: "glass-card border-dashed border-2",
};

export default function Card({
  children,
  className = "",
  variant = "default",
  padding = "md",
  hoverable = false,
}: CardProps) {
  return (
    <div
      className={`
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hoverable ? "hover:border-[#4B154D]/20 hover:shadow-lg transition-all duration-300" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

interface CardSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function CardSection({ title, children, className = "" }: CardSectionProps) {
  return (
    <div className={className}>
      {title && (
        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
          {title}
        </h4>
      )}
      {children}
    </div>
  );
}



