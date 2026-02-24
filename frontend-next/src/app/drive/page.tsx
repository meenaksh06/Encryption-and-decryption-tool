"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  HardDrive,
  Download,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  FileText,
  FileIcon,
  FolderOpen,
  Lock,
  Check,
  X,
  Shield,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, Button, LoadingState, EmptyState, ErrorState } from "@/components/ui";
import { getToken, formatBytes } from "@/lib/api";
import { useToast } from "@/components/Toast";

const API = "http://localhost:8080";

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return <ImageIcon className="w-5 h-5 text-[#5C1B60]" />;
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext))
    return <Video className="w-5 h-5 text-[#4B154D]" />;
  if (["mp3", "wav", "ogg", "flac"].includes(ext))
    return <Music className="w-5 h-5 text-[#00BFA6]" />;
  if (["zip", "tar", "gz", "7z"].includes(ext))
    return <Archive className="w-5 h-5 text-[#009E8A]" />;
  if (["pdf"].includes(ext))
    return <FileText className="w-5 h-5 text-red-400" />;
  if (["doc", "docx", "txt", "md"].includes(ext))
    return <FileText className="w-5 h-5 text-blue-400" />;
  if (["xls", "xlsx"].includes(ext))
    return <FileText className="w-5 h-5 text-[#00BFA6]" />;
  return <FileIcon className="w-5 h-5 text-[var(--color-text-dim)]" />;
}

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface DriveFile {
  id: number;
  original_name: string;
  stored_name: string;
  size_bytes: number;
  created_at: number;
}

export default function DrivePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { showToast, ToastComponent } = useToast();

  const loadFiles = useCallback(async (t: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/drive/files`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) {
        router.replace("/auth");
        return;
      }
      if (!res.ok) {
        setError("Failed to load files");
        return;
      }
      const data = await res.json();
      setFiles(data);
    } catch {
      setError("Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/auth");
      return;
    }
    setToken(t);
    loadFiles(t);
  }, [router, loadFiles]);

  const download = async (f: DriveFile) => {
    if (!token) return;
    try {
      const res = await fetch(
        `${API}/drive/download/${encodeURIComponent(f.stored_name)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        showToast("Download failed", "error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.stored_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`Downloaded ${f.original_name}`, "success");
    } catch {
      showToast("Download error", "error");
    }
  };

  const startRename = (f: DriveFile) => {
    setEditingId(f.id);
    setEditVal(f.original_name);
  };

  const confirmRename = async (f: DriveFile) => {
    if (!token || !editVal.trim() || editVal.trim() === f.original_name) {
      setEditingId(null);
      return;
    }
    try {
      const res = await fetch(`${API}/drive/rename/${f.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newName: editVal.trim() }),
      });
      if (res.ok) {
        setFiles((prev) =>
          prev.map((x) =>
            x.id === f.id ? { ...x, original_name: editVal.trim() } : x
          )
        );
        showToast("Renamed successfully", "success");
      } else {
        showToast("Rename failed", "error");
      }
    } catch {
      showToast("Rename error", "error");
    }
    setEditingId(null);
  };

  const deleteFile = async (f: DriveFile) => {
    if (!token) return;
    if (!window.confirm(`Securely delete "${f.original_name}"? This cannot be undone.`))
      return;

    setDeletingId(f.id);
    try {
      const res = await fetch(`${API}/drive/delete/${f.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((x) => x.id !== f.id));
        showToast("File securely deleted", "success");
      } else {
        showToast("Delete failed", "error");
      }
    } catch {
      showToast("Delete error", "error");
    }
    setDeletingId(null);
  };

  const filtered = files.filter(
    (f) =>
      f.original_name.toLowerCase().includes(search.toLowerCase()) ||
      f.stored_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalSize = files.reduce((s, f) => s + f.size_bytes, 0);

  if (!token) return null;

  return (
    <DashboardLayout
      title="Drive"
      description="Your encrypted file storage"
      showSearch
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search files..."
    >
      {ToastComponent}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <div className="text-2xl font-black">{files.length}</div>
              <div className="text-xs text-[var(--color-text-dim)]">Encrypted Files</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Archive className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-black">{formatBytes(totalSize)}</div>
              <div className="text-xs text-[var(--color-text-dim)]">Total Storage</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00BFA6]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#00BFA6]" />
            </div>
            <div>
              <div className="text-2xl font-black gradient-text">AES-256</div>
              <div className="text-xs text-[var(--color-text-dim)]">Encryption</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00BFA6]/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#00BFA6]" />
            </div>
            <div>
              <div className="text-2xl font-black text-[#00BFA6]">Secure</div>
              <div className="text-xs text-[var(--color-text-dim)]">Vault Status</div>
            </div>
          </div>
        </Card>
      </div>

      {/* File table */}
      <Card padding="none">
        {loading ? (
          <LoadingState message="Loading files..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => token && loadFiles(token)} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="w-8 h-8" />}
            title={search ? "No files match your search" : "Your drive is empty"}
            description={
              search
                ? "Try a different search term"
                : "Encrypt files in the Workspace and save them to Drive."
            }
            action={
              !search
                ? { label: "Go to Workspace", onClick: () => router.push("/workspace") }
                : undefined
            }
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]/50">
              <span className="text-sm text-[var(--color-text-dim)]">
                {filtered.length} file{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">
                      Size
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-[var(--color-border)]/30 last:border-0 hover:bg-[var(--color-surface-hover)]/30 transition-colors"
                    >
                      <td className="py-3 px-6">
                        <div className="flex items-start gap-3">
                          {getFileIcon(f.original_name)}
                          <div>
                            {editingId === f.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  className="px-2 py-1 rounded-lg bg-[var(--color-background)] border border-[var(--color-primary)] text-sm text-white outline-none w-48"
                                  value={editVal}
                                  autoFocus
                                  onChange={(e) => setEditVal(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") confirmRename(f);
                                    if (e.key === "Escape") setEditingId(null);
                                  }}
                                />
                                <button
                                  onClick={() => confirmRename(f)}
                                  className="p-1 rounded-lg hover:bg-[#00BFA6]/10 text-[#00BFA6] transition-colors"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 rounded-lg hover:bg-[var(--color-danger)]/10 text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-sm font-medium">{f.original_name}</div>
                            )}
                            <div className="text-[11px] text-[var(--color-text-dim)] mt-0.5 font-mono">
                              {f.stored_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-[var(--color-text-dim)]">
                          {formatBytes(f.size_bytes)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-[var(--color-text-dim)]">
                          {fmtDate(f.created_at)}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<Download className="w-3.5 h-3.5" />}
                            onClick={() => download(f)}
                          >
                            Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Pencil className="w-3.5 h-3.5" />}
                            onClick={() => startRename(f)}
                          >
                            Rename
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            onClick={() => deleteFile(f)}
                            loading={deletingId === f.id}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}








