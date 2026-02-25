"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Lock,
  Unlock,
  Trash2,
  ShieldAlert,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, Button, Badge, LoadingState, EmptyState, ErrorState } from "@/components/ui";
import { getToken } from "@/lib/api";

const API = "http://localhost:8080";

interface AuditLog {
  id: number;
  timestamp: string;
  action: string;
  ip: string;
  status: "SUCCESS" | "REJECTED" | "FAILURE";
  filename?: string;
  reason?: string;
  sizeBytes?: number;
  sha256?: string;
  passes?: number;
  bytesOverwritten?: number;
  savedToDrive?: boolean;
}

interface AuditStats {
  total: number;
  byAction: Record<string, number>;
  byStatus: Record<string, number>;
  last24Hours: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const actionIcons: Record<string, React.ReactNode> = {
  ENCRYPT: <Lock className="w-4 h-4" />,
  DECRYPT: <Unlock className="w-4 h-4" />,
  SECURE_DELETE: <Trash2 className="w-4 h-4" />,
  RATE_LIMIT: <ShieldAlert className="w-4 h-4" />,
};

const actionColors: Record<string, string> = {
  ENCRYPT: "text-[var(--color-primary)]",
  DECRYPT: "text-[#00BFA6]",
  SECURE_DELETE: "text-red-400",
  RATE_LIMIT: "text-[#5C1B60]",
};

const statusBadge: Record<string, { variant: "success" | "warning" | "danger"; label: string }> = {
  SUCCESS: { variant: "success", label: "Success" },
  REJECTED: { variant: "warning", label: "Rejected" },
  FAILURE: { variant: "danger", label: "Failed" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatBytes(bytes: number) {
  if (!bytes) return "-";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export default function ActivityPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/auth");
      return;
    }
    setToken(t);
  }, [router]);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("limit", String(pagination.limit));
      if (actionFilter) params.set("action", actionFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`${API}/audit/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        router.replace("/auth");
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch logs");

      const data = await res.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [token, pagination.page, pagination.limit, actionFilter, statusFilter, router]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/audit/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      // Stats are optional, don't show error
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchLogs();
      fetchStats();
    }
  }, [token, fetchLogs, fetchStats]);

  const handleExport = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/audit/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vaultlock-audit-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Handle silently
    }
  };

  if (!token) return null;

  return (
    <DashboardLayout
      title="Activity Log"
      description="Monitor all encryption and security events"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => {
              fetchLogs();
              fetchStats();
            }}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExport}
          >
            Export
          </Button>
        </div>
      }
    >
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <div className="text-3xl font-black text-black">{stats.total}</div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1">Total Events</div>
          </Card>
          <Card>
            <div className="text-3xl font-black text-[var(--color-primary)]">
              {stats.byAction?.ENCRYPT || 0}
            </div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1">Encryptions</div>
          </Card>
          <Card>
            <div className="text-3xl font-black text-[#00BFA6]">
              {stats.byAction?.DECRYPT || 0}
            </div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1">Decryptions</div>
          </Card>
          <Card>
            <div className="text-3xl font-black text-[#00BFA6]">{stats.last24Hours}</div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1">Last 24 Hours</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Filter className="w-4 h-4" />
            <span>Filter:</span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-sm text-white outline-none focus:border-[var(--color-primary)]"
          >
            <option value="">All Actions</option>
            <option value="ENCRYPT">Encrypt</option>
            <option value="DECRYPT">Decrypt</option>
            <option value="SECURE_DELETE">Secure Delete</option>
            <option value="RATE_LIMIT">Rate Limit</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-sm text-white outline-none focus:border-[var(--color-primary)]"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="REJECTED">Rejected</option>
            <option value="FAILURE">Failure</option>
          </select>
          {(actionFilter || statusFilter) && (
            <button
              onClick={() => {
                setActionFilter("");
                setStatusFilter("");
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="text-xs text-[var(--color-text-dim)] hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </Card>

      {/* Logs Table */}
      <Card padding="none">
        {loading ? (
          <LoadingState message="Loading activity logs..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLogs} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Activity className="w-8 h-8" />}
            title="No activity yet"
            description="Your encryption and security events will appear here."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">
                      Action
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">
                      Details
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-[var(--color-border)]/30 last:border-0 hover:bg-[var(--color-surface-hover)]/30 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <span className="text-sm text-[var(--color-text-black)]">
                          {formatDate(log.timestamp)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className={actionColors[log.action] || "text-black"}>
                            {actionIcons[log.action] || <Activity className="w-4 h-4" />}
                          </span>
                          <span className="text-sm font-medium">{log.action}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={statusBadge[log.status]?.variant || "default"}>
                          {statusBadge[log.status]?.label || log.status}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm">
                          {log.filename && (
                            <div className="text-black truncate max-w-[200px]">{log.filename}</div>
                          )}
                          {log.sizeBytes && (
                            <div className="text-xs text-[var(--color-text-dim)]">
                              {formatBytes(log.sizeBytes)}
                            </div>
                          )}
                          {log.reason && (
                            <div className="text-xs text-[var(--color-danger)]">{log.reason}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <code className="text-xs font-mono text-[var(--color-text-dim)]">
                          {log.ip}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)]/50">
              <span className="text-sm text-[var(--color-text-dim)]">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} entries
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<ChevronLeft className="w-4 h-4" />}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <span className="px-3 py-1 text-sm text-[var(--color-text-muted)]">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  iconRight={<ChevronRight className="w-4 h-4" />}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}



