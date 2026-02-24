"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getToken } from "@/lib/api";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  requireAuth?: boolean;
}

export default function DashboardLayout({
  children,
  title,
  description,
  actions,
  showSearch,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  requireAuth = true,
}: DashboardLayoutProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (requireAuth) {
      const token = getToken();
      if (!token) {
        router.replace("/auth");
        return;
      }
    }
    // Using a timeout to avoid the setState in effect warning
    const timeout = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timeout);
  }, [requireAuth, router]);

  if (requireAuth && !mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <Sidebar collapsed={collapsed} onToggle={setCollapsed} />

      <div
        className={`
          transition-all duration-300 ease-in-out
          ${collapsed ? "ml-[72px]" : "ml-[240px]"}
        `}
      >
        <Topbar
          title={title}
          description={description}
          actions={actions}
          showSearch={showSearch}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
        />

        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}


