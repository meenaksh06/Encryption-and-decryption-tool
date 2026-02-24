"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Lock,
  FolderLock,
  HardDrive,
  MessageSquare,
  Key,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
} from "lucide-react";
import { getUsername, logout } from "@/lib/api";

const navItems = [
  { href: "/", icon: Home, label: "Home", authRequired: false },
  { href: "/workspace", icon: Lock, label: "Workspace", authRequired: true },
  { href: "/drive", icon: HardDrive, label: "Drive", authRequired: true },
  { href: "/vault", icon: Key, label: "Vault", authRequired: true },
  { href: "/chat", icon: MessageSquare, label: "Chat", authRequired: true },
  { href: "/activity", icon: Activity, label: "Activity", authRequired: true },
];

const bottomNavItems = [
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  useEffect(() => {
    // Using a timeout to avoid the setState in effect warning
    const timeout = setTimeout(() => setUsername(getUsername()), 0);
    return () => clearTimeout(timeout);
  }, []);

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onToggle?.(newState);
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen z-40
        flex flex-col
        bg-white/95 backdrop-blur-xl
        border-r border-gray-200
        transition-all duration-300 ease-in-out
        shadow-sm
        ${isCollapsed ? "w-[72px]" : "w-[240px]"}
      `}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white shadow-[var(--shadow-glow)] flex-shrink-0">
            <FolderLock className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <span className="text-[15px] font-bold tracking-tight text-gray-800">
              VaultLock
            </span>
          )}
        </Link>
        <button
          onClick={toggleCollapsed}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-200 group
                    ${
                      active
                        ? "bg-gradient-to-r from-[#F9F7FA] to-[#E6F8F5] text-gray-900 border border-[#4B154D]/15"
                        : "text-gray-500 hover:text-gray-900 hover:bg-[#F9F7FA]"
                    }
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      active ? "text-[var(--color-primary)]" : "group-hover:text-gray-700"
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="text-[13px] font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Divider */}
        <div className="my-4 mx-3 border-t border-gray-100" />

        {/* Bottom Navigation */}
        <ul className="space-y-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl
                    transition-all duration-200 group
                    ${
                      active
                        ? "bg-gradient-to-r from-[#F9F7FA] to-[#E6F8F5] text-gray-900 border border-[#4B154D]/15"
                        : "text-gray-500 hover:text-gray-900 hover:bg-[#F9F7FA]"
                    }
                  `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      active ? "text-[var(--color-primary)]" : "group-hover:text-gray-700"
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="text-[13px] font-medium">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-gray-100">
        <div
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50/50
            ${isCollapsed ? "justify-center" : ""}
          `}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
            {username?.[0]?.toUpperCase() || "U"}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-800 truncate">
                {username || "User"}
              </p>
              <p className="text-[11px] text-gray-400">Free Plan</p>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}






