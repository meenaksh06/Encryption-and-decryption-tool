"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/Toast";
import { getToken, formatBytes } from "@/lib/api";
import { useRouter } from "next/navigation";

const API = "http://localhost:8080";

const ALLOWED_EXT = new Set([
  ".txt",".csv",".json",".xml",".pdf",".jpg",".jpeg",".png",".gif",".webp",
  ".svg",".mp4",".mov",".avi",".mkv",".webm",".mp3",".wav",".ogg",".flac",
  ".zip",".tar",".gz",".7z",".doc",".docx",".xls",".xlsx",".ppt",".pptx",
  ".odt",".ods",".odp",".md",
]);

interface EncryptResult {
  name: string;
  size: number;
  status: "pending" | "encrypting" | "ok" | "error";
  key: string;
  iv: string;
  sha256: string;
  encName: string;
  error?: string;
}

interface DecryptResult {
  name: string;
  status: "pending" | "decrypting" | "ok" | "error";
  integrity: "pass" | "fail" | null;
  hash: string;
  error?: string;
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function EncryptPanel({ token }: { token: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [saveToDrive, setSaveToDrive] = useState(true);
  const [results, setResults] = useState<EncryptResult[]>([]);
  const [running, setRunning] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastComponent } = useToast();

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter((f) => {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      return ALLOWED_EXT.has(ext);
    });
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !names.has(f.name))];
    });
  };

  const remove = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setResults((prev) => prev.filter((r) => r.name !== name));
  };

  const encryptAll = async () => {
    if (!files.length) return;
    setRunning(true);
    const initial: EncryptResult[] = files.map((f) => ({
      name: f.name,
      size: f.size,
      status: "encrypting",
      key: "",
      iv: "",
      sha256: "",
      encName: "",
    }));
    setResults(initial);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const buf = await f.arrayBuffer();
        const res = await fetch(`${API}/encrypt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "x-filename": f.name,
            "x-save-to-drive": String(saveToDrive),
            Authorization: `Bearer ${token}`,
          },
          body: buf,
        });

        if (!res.ok) {
          const err = await res.json();
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: "error", error: err.error } : r
            )
          );
          continue;
        }

        const key = res.headers.get("X-Private-Key") || "";
        const iv = res.headers.get("X-IV") || "";
        const sha256 = res.headers.get("X-SHA256") || "";
        const encName = res.headers.get("X-Encrypted-Filename") || f.name + ".enc";

        // Auto-download the encrypted file
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = encName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "ok", key, iv, sha256, encName } : r
          )
        );
      } catch {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "error", error: "Network error" } : r
          )
        );
      }
    }
    setRunning(false);
    showToast("Encryption complete!", "success");
  };

  const done = results.filter((r) => r.status === "ok").length;
  const total = results.length;

  return (
    <div className="space-y-6">
      {ToastComponent}

      {/* Drop zone */}
      <div className="glass-card p-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-5">
          Select Files to Encrypt
        </h3>
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
            drag
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
              : "border-[var(--color-border)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-hover)]/30"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-[var(--color-primary-hover)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--color-text-muted)]">
            Click to select or drag & drop files
          </p>
          <p className="text-xs text-[var(--color-text-dim)] mt-2">
            Documents, images, audio, video, archives — max 100 MB each
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-5 space-y-2">
            {files.map((f) => (
              <div
                key={f.name}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--color-background)]/50 border border-[var(--color-border)]/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg className="w-4 h-4 text-[var(--color-text-dim)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="text-sm font-medium truncate">{f.name}</span>
                  <span className="text-xs text-[var(--color-text-dim)] flex-shrink-0">
                    {formatBytes(f.size)}
                  </span>
                </div>
                <button
                  onClick={() => remove(f.name)}
                  className="p-1 rounded-lg hover:bg-[var(--color-danger)]/10 text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-4 mt-6">
          <button
            onClick={encryptAll}
            disabled={!files.length || running}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white text-sm font-semibold shadow-lg shadow-[var(--color-primary)]/20 hover:shadow-[var(--color-primary)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-0.5 disabled:hover:translate-y-0"
          >
            {running
              ? `Encrypting ${done}/${total}...`
              : `Encrypt ${files.length || ""} File${files.length !== 1 ? "s" : ""}`}
          </button>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={saveToDrive}
              onChange={(e) => setSaveToDrive(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--color-primary)]"
            />
            Save to Drive
          </label>
          {files.length > 0 && !running && (
            <button
              onClick={() => { setFiles([]); setResults([]); }}
              className="px-4 py-2 rounded-xl bg-[var(--color-surface-hover)] text-sm text-[var(--color-text-muted)] hover:text-white transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-dim)] mt-4">
          Each file is encrypted independently with a unique AES-256 key and IV.
        </p>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="glass-card p-8">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-5">
            Encryption Results
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">File</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Private Key</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">IV</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">SHA-256</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)]/50 last:border-0">
                    <td className="py-3 px-3">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-[var(--color-text-dim)]">{formatBytes(r.size)}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        r.status === "ok"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : r.status === "error"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {r.status === "ok" ? "✓ Done" : r.status === "error" ? "✗ Error" : "⟳ Encrypting"}
                      </span>
                      {r.error && (
                        <div className="text-xs text-red-400 mt-1">{r.error}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {r.key && (
                        <div className="flex items-center gap-2">
                          <code className="text-[10px] font-mono text-cyan-400">{r.key.slice(0, 16)}…</code>
                          <button
                            onClick={() => { copyText(r.key); showToast("Key copied!", "success"); }}
                            className="px-2 py-0.5 rounded-md bg-[var(--color-surface-hover)] text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors"
                          >
                            copy
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {r.iv && (
                        <div className="flex items-center gap-2">
                          <code className="text-[10px] font-mono text-cyan-400">{r.iv.slice(0, 16)}…</code>
                          <button
                            onClick={() => { copyText(r.iv); showToast("IV copied!", "success"); }}
                            className="px-2 py-0.5 rounded-md bg-[var(--color-surface-hover)] text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors"
                          >
                            copy
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {r.sha256 && (
                        <div className="flex items-center gap-2">
                          <code className="text-[10px] font-mono text-cyan-400">{r.sha256.slice(0, 16)}…</code>
                          <button
                            onClick={() => { copyText(r.sha256); showToast("Hash copied!", "success"); }}
                            className="px-2 py-0.5 rounded-md bg-[var(--color-surface-hover)] text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors"
                          >
                            copy
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-amber-400/70 mt-4">
            ⚠ Save your keys — they are NOT stored on the server. Without the key and IV you cannot decrypt your files.
          </p>
        </div>
      )}
    </div>
  );
}

function DecryptPanel({ token }: { token: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [credentials, setCredentials] = useState<Record<string, { key: string; iv: string; hash: string }>>({});
  const [results, setResults] = useState<DecryptResult[]>([]);
  const [running, setRunning] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastComponent } = useToast();

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter((f) => f.name.endsWith(".enc"));
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !names.has(f.name))];
    });
  };

  const setCred = (name: string, field: "key" | "iv" | "hash", val: string) => {
    setCredentials((prev) => ({
      ...prev,
      [name]: { ...(prev[name] || { key: "", iv: "", hash: "" }), [field]: val },
    }));
  };

  const remove = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setCredentials((prev) => {
      const c = { ...prev };
      delete c[name];
      return c;
    });
    setResults((prev) => prev.filter((r) => r.name !== name));
  };

  const decryptAll = async () => {
    if (!files.length) return;
    setRunning(true);
    const initial: DecryptResult[] = files.map((f) => ({
      name: f.name,
      status: "decrypting",
      integrity: null,
      hash: "",
    }));
    setResults(initial);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const cred = credentials[f.name] || { key: "", iv: "", hash: "" };
      const key = cred.key.trim();
      const iv = cred.iv.trim();
      const expectedHash = cred.hash.trim();

      if (!key || !iv) {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "error", error: "Key and IV are required" } : r
          )
        );
        continue;
      }
      if (key.length !== 64 || iv.length !== 32) {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "error", error: "Key must be 64 hex chars, IV 32 hex chars" } : r
          )
        );
        continue;
      }

      try {
        const originalName = f.name.replace(/\.\d+-[a-f0-9]+\.enc$/, "");
        const buf = await f.arrayBuffer();
        const res = await fetch(`${API}/decrypt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "x-private-key": key,
            "x-iv": iv,
            "x-filename": originalName || "decrypted_file",
            Authorization: `Bearer ${token}`,
          },
          body: buf,
        });

        if (!res.ok) {
          const err = await res.json();
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: "error", error: err.error } : r
            )
          );
          continue;
        }

        const decryptedHash = res.headers.get("X-Decrypted-SHA256") || "";
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = originalName || "decrypted_file";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        let integrity: "pass" | "fail" | null = null;
        if (expectedHash && decryptedHash) {
          integrity = expectedHash.toLowerCase() === decryptedHash.toLowerCase() ? "pass" : "fail";
        }

        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "ok", integrity, hash: decryptedHash } : r
          )
        );
      } catch {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "error", error: "Network error" } : r
          )
        );
      }
    }
    setRunning(false);
    showToast("Decryption complete!", "success");
  };

  const done = results.filter((r) => r.status === "ok").length;
  const total = results.length;

  return (
    <div className="space-y-6">
      {ToastComponent}

      <div className="glass-card p-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-5">
          Select Encrypted Files (.enc)
        </h3>
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
            drag
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
              : "border-[var(--color-border)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-hover)]/30"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".enc"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--color-text-muted)]">
            Click to select or drag & drop .enc files
          </p>
        </div>

        {/* Credential inputs */}
        {files.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-[var(--color-text-dim)] mb-4">
              Enter the key and IV for each file. SHA-256 is optional (for integrity check).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 px-2 text-xs font-semibold text-[var(--color-text-dim)]">File</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-[var(--color-text-dim)]">Private Key (64 hex)</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-[var(--color-text-dim)]">IV (32 hex)</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-[var(--color-text-dim)]">SHA-256 (optional)</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.name} className="border-b border-[var(--color-border)]/50 last:border-0">
                      <td className="py-2 px-2">
                        <div className="text-xs font-medium truncate max-w-[120px]">{f.name}</div>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)]/80 border border-[var(--color-border)] text-xs font-mono text-white outline-none focus:border-[var(--color-primary)] transition-colors"
                          placeholder="64-char hex key"
                          value={credentials[f.name]?.key || ""}
                          onChange={(e) => setCred(f.name, "key", e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)]/80 border border-[var(--color-border)] text-xs font-mono text-white outline-none focus:border-[var(--color-primary)] transition-colors"
                          placeholder="32-char hex IV"
                          value={credentials[f.name]?.iv || ""}
                          onChange={(e) => setCred(f.name, "iv", e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)]/80 border border-[var(--color-border)] text-xs font-mono text-white outline-none focus:border-[var(--color-primary)] transition-colors"
                          placeholder="64-char SHA-256"
                          value={credentials[f.name]?.hash || ""}
                          onChange={(e) => setCred(f.name, "hash", e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => remove(f.name)}
                          className="p-1 rounded-lg hover:bg-[var(--color-danger)]/10 text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 mt-6">
          <button
            onClick={decryptAll}
            disabled={!files.length || running}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-0.5 disabled:hover:translate-y-0"
          >
            {running
              ? `Decrypting ${done}/${total}...`
              : `Decrypt ${files.length || ""} File${files.length !== 1 ? "s" : ""}`}
          </button>
          {files.length > 0 && !running && (
            <button
              onClick={() => { setFiles([]); setCredentials({}); setResults([]); }}
              className="px-4 py-2 rounded-xl bg-[var(--color-surface-hover)] text-sm text-[var(--color-text-muted)] hover:text-white transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Decryption Results */}
      {results.length > 0 && (
        <div className="glass-card p-8">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-5">
            Decryption Results
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">File</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Integrity</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">SHA-256</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b border-[var(--color-border)]/50 last:border-0">
                  <td className="py-3 px-3 font-medium">{r.name}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      r.status === "ok"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : r.status === "error"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {r.status === "ok" ? "✓ Done" : r.status === "error" ? "✗ Error" : "⟳ Decrypting"}
                    </span>
                    {r.error && <div className="text-xs text-red-400 mt-1">{r.error}</div>}
                  </td>
                  <td className="py-3 px-3">
                    {r.integrity === "pass" && <span className="text-emerald-400 text-xs font-semibold">✓ Verified</span>}
                    {r.integrity === "fail" && <span className="text-red-400 text-xs font-semibold">✗ Tampered</span>}
                    {r.integrity === null && r.status === "ok" && (
                      <span className="text-[var(--color-text-dim)] text-xs">No hash provided</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {r.hash && <code className="text-[10px] font-mono text-cyan-400">{r.hash.slice(0, 20)}…</code>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"encrypt" | "decrypt">("encrypt");
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/auth");
      return;
    }
    setToken(t);
    setMounted(true);
  }, [router]);

  if (!token || !mounted) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-tight">Workspace</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Encrypt or decrypt multiple files at once
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-[var(--color-surface)] p-1 border border-[var(--color-border)] w-fit mb-8">
          <button
            onClick={() => setTab("encrypt")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
              tab === "encrypt"
                ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg"
                : "text-[var(--color-text-muted)] hover:text-white"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Encrypt
          </button>
          <button
            onClick={() => setTab("decrypt")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
              tab === "decrypt"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                : "text-[var(--color-text-muted)] hover:text-white"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Decrypt
          </button>
        </div>

        {/* Panel */}
        {tab === "encrypt" ? (
          <EncryptPanel token={token} />
        ) : (
          <DecryptPanel token={token} />
        )}
      </div>
    </div>
  );
}
