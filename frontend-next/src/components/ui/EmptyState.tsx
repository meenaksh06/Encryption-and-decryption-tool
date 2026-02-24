"use client";

import { ReactNode } from "react";
import Button from "./Button";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-8 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F9F7FA] to-[#E6F8F5] border border-[#E8E6EA] flex items-center justify-center text-[#4B154D] mb-6">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}



