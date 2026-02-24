"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      iconRight,
      showPasswordToggle = false,
      type = "text",
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const isPassword = type === "password";
    const actualType = isPassword && showPassword ? "text" : type;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            className={`
              w-full px-4 py-3 rounded-xl
              bg-white 
              border text-sm text-gray-900 
              placeholder-gray-400
              outline-none transition-all duration-200
              focus:ring-2 focus:ring-[#4B154D]/10
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? "pl-10" : ""}
              ${iconRight || (isPassword && showPasswordToggle) ? "pr-10" : ""}
              ${
                error
                  ? "border-red-300 focus:border-red-400"
                  : "border-gray-200 focus:border-[var(--color-primary)]"
              }
              ${className}
            `}
            {...props}
          />
          {isPassword && showPasswordToggle ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          ) : iconRight ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {iconRight}
            </div>
          ) : null}
        </div>
        {error && (
          <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-2 text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;




