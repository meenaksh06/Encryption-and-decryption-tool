"use client";

import { useState, useEffect } from "react";
import { CheckIcon, XCircleIcon, InfoIcon } from "@/components/Icons";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}

export default function Toast({ message, type = "info", onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      class: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
      Icon: CheckIcon,
    },
    error: {
      class: "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
      Icon: XCircleIcon,
    },
    info: {
      class: "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
      Icon: InfoIcon,
    },
  };

  const { class: typeClass, Icon } = config[type];

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] glass-card px-5 py-3.5 flex items-center gap-3 shadow-2xl transition-all duration-300 ${typeClass} ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium text-[var(--color-text)]">{message}</span>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  };

  const ToastComponent = toast ? (
    <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
  ) : null;

  return { showToast, ToastComponent };
}
