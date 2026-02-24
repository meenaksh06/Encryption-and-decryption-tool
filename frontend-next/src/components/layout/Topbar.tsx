"use client";

import { ReactNode } from "react";
import { Search, Bell } from "lucide-react";

interface TopbarProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export default function Topbar({
  title,
  description,
  actions,
  showSearch = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
}: TopbarProps) {
  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0 z-30">
      {/* Left: Title */}
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Right: Search + Actions */}
      <div className="flex items-center gap-4">
        {showSearch && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="
                pl-10 pr-4 py-2 w-64
                rounded-xl bg-gray-50
                border border-gray-200
                text-sm text-gray-900 placeholder-gray-400
                outline-none transition-all
                focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[#4B154D]/10
              "
            />
          </div>
        )}

        {/* Notifications placeholder */}
        <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-primary)] rounded-full" />
        </button>

        {/* Actions */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}



