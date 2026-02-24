"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/Toast";
import { getToken, getUsername, formatBytes } from "@/lib/api";
import { useRouter } from "next/navigation";

const API = "http://localhost:8080";

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "🖼️";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "🎬";
  if (["mp3", "wav", "ogg", "flac"].includes(ext)) return "🎵";
  if (["zip", "tar", "gz", "7z"].includes(ext)) return "📦";
  if (["pdf"].includes(ext)) return "📄";
  if (["doc", "docx"].includes(ext)) return "📝";
  if (["xls", "xlsx"].includes(ext)) return "📊";
  return "📁";
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
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/auth");
      return;
    }
    setToken(t);
    loadFiles(t);
  }, [router]);

  const loadFiles = async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/drive/files`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) {
        router.replace("/auth");
        return;
      }
      const data = await res.json();
      setFiles(data);
    } catch {
      showToast("Failed to load files", "error");
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen">
      <Navbar />
      {ToastComponent}

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Drive</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Your encrypted file storage
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-5">
            <div className="text-2xl font-black">{files.length}</div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1">
              Encrypted Files
            </div>
          </div>
          <div className="glass-card p-5">
            <div className="text-2xl font-black">{formatBytes(totalSize)}</div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1">
              Total Storage
            </div>
          </div>
          <div className="glass-card p-5">
            <div className="text-2xl font-black gradient-text">AES-256</div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1">
              Encryption Standard
            </div>
          </div>
          <div className="glass-card p-5">
            <div className="text-2xl font-black text-emerald-400">Secure</div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1">
              Vault Status
            </div>
          </div>
        </div>

        {/* File table */}
        <div className="glass-card overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]/50">
            <span className="text-sm text-[var(--color-text-dim)]">
              {filtered.length} file{filtered.length !== 1 ? "s" : ""}
            </span>
            <div className="relative">
              <svg
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                className="pl-9 pr-4 py-2 rounded-xl bg-[var(--color-background)]/80 border border-[var(--color-border)] text-sm text-white outline-none focus:border-[var(--color-primary)] transition-colors w-56"
                placeholder="Search files…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-[var(--color-text-dim)]">
              <div className="animate-spin w-6 h-6 mx-auto border-2 border-[var(--color-primary)] border-t-transparent rounded-full mb-3" />
              <p className="text-sm">Loading files…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-4">🗄️</div>
              <p className="text-sm font-medium text-[var(--color-text-muted)]">
                {search ? "No files match your search" : "Your drive is empty"}
              </p>
              {!search && (
                <p className="text-xs text-[var(--color-text-dim)] mt-2">
                  Encrypt files in the Workspace and save them to Drive.
                </p>
              )}
            </div>
          ) : (
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
                          <span className="text-lg mt-0.5">{fileIcon(f.original_name)}</span>
                          <div>
                            {editingId === f.id ? (
                              <input
                                className="px-2 py-1 rounded-lg bg-[var(--color-background)] border border-[var(--color-primary)] text-sm text-white outline-none w-48"
                                value={editVal}
                                autoFocus
                                onChange={(e) => setEditVal(e.target.value)}
                                onBlur={() => confirmRename(f)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") confirmRename(f);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                              />
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
                          <button
                            onClick={() => download(f)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary-hover)] text-xs font-semibold hover:bg-[var(--color-primary)]/20 transition-colors"
                          >
                            ⬇ Download
                          </button>
                          <button
                            onClick={() => startRename(f)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] text-xs font-semibold hover:text-white transition-colors"
                          >
                            ✏ Rename
                          </button>
                          <button
                            disabled={deletingId === f.id}
                            onClick={() => deleteFile(f)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--color-danger)]/10 text-red-400 text-xs font-semibold hover:bg-[var(--color-danger)]/20 transition-colors disabled:opacity-50"
                          >
                            {deletingId === f.id ? "Deleting…" : "🗑 Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
