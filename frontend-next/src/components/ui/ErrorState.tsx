"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Button from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-8 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 mb-6">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">
        {message}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="w-4 h-4" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
}


