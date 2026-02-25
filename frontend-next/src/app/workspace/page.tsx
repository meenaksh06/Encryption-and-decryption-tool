"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Unlock,
  Upload,
  X,
  Copy,
  Check,
  Key,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  FileIcon,
  HardDrive,
  Shield,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardSection, Button, Badge, EmptyState } from "@/components/ui";
import { getToken, formatBytes } from "@/lib/api";
import { useToast } from "@/components/Toast";
import SaveToVaultModal from "@/components/SaveToVaultModal";

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
  savedToVault?: boolean;
}

interface DecryptResult {
  name: string;
  status: "pending" | "decrypting" | "ok" | "error";
  integrity: "pass" | "fail" | null;
  hash: string;
  error?: string;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return <ImageIcon className="w-4 h-4" />;
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext))
    return <Video className="w-4 h-4" />;
  if (["mp3", "wav", "ogg", "flac"].includes(ext))
    return <Music className="w-4 h-4" />;
  if (["zip", "tar", "gz", "7z"].includes(ext))
    return <Archive className="w-4 h-4" />;
  if (["pdf", "doc", "docx", "txt", "md"].includes(ext))
    return <FileText className="w-4 h-4" />;
  return <FileIcon className="w-4 h-4" />;
}

function CopyButton({ text, onCopy }: { text: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      onCopy();
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-0.5 rounded-md bg-[var(--color-surface-hover)] text-[10px] text-[var(--color-text-muted)] hover:text-white transition-colors flex items-center gap-1"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function EncryptPanel({ token }: { token: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [saveToDrive, setSaveToDrive] = useState(true);
  const [results, setResults] = useState<EncryptResult[]>([]);
  const [running, setRunning] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastComponent } = useToast();

  const [vaultModal, setVaultModal] = useState<{
    open: boolean;
    key: string;
    iv: string;
    filename: string;
    sha256: string;
    resultIndex: number;
  }>({ open: false, key: "", iv: "", filename: "", sha256: "", resultIndex: -1 });

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

  const openVaultModal = (result: EncryptResult, index: number) => {
    setVaultModal({
      open: true,
      key: result.key,
      iv: result.iv,
      filename: result.name,
      sha256: result.sha256,
      resultIndex: index,
    });
  };

  const handleVaultSaved = () => {
    setResults((prev) =>
      prev.map((r, idx) =>
        idx === vaultModal.resultIndex ? { ...r, savedToVault: true } : r
      )
    );
    showToast("Key saved to vault", "success");
  };

  const done = results.filter((r) => r.status === "ok").length;
  const total = results.length;

  return (
    <div className="space-y-6">
      {ToastComponent}

      <SaveToVaultModal
        isOpen={vaultModal.open}
        onClose={() => setVaultModal((v) => ({ ...v, open: false }))}
        encryptionKey={vaultModal.key}
        iv={vaultModal.iv}
        filename={vaultModal.filename}
        sha256={vaultModal.sha256}
        onSaved={handleVaultSaved}
      />

      <Card>
        <CardSection title="Select Files to Encrypt">
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
              <Upload className="w-7 h-7 text-[var(--color-primary-hover)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-muted)]">
              Click to select or drag & drop files
            </p>
            <p className="text-xs text-[var(--color-text-dim)] mt-2">
              Documents, images, audio, video, archives — max 100 MB each
            </p>
          </div>
        </CardSection>

        {files.length > 0 && (
          <div className="mt-5 space-y-2">
            {files.map((f) => (
              <div
                key={f.name}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--color-background)]/50 border border-[var(--color-border)]/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[var(--color-text-dim)]">{getFileIcon(f.name)}</span>
                  <span className="text-sm font-medium truncate">{f.name}</span>
                  <span className="text-xs text-[var(--color-text-dim)] flex-shrink-0">
                    {formatBytes(f.size)}
                  </span>
                </div>
                <button
                  onClick={() => remove(f.name)}
                  className="p-1 rounded-lg hover:bg-[var(--color-danger)]/10 text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 mt-6">
          <Button
            onClick={encryptAll}
            disabled={!files.length || running}
            loading={running}
            icon={<Lock className="w-4 h-4" />}
          >
            {running
              ? `Encrypting ${done}/${total}...`
              : `Encrypt ${files.length || ""} File${files.length !== 1 ? "s" : ""}`}
          </Button>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={saveToDrive}
              onChange={(e) => setSaveToDrive(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--color-primary)]"
            />
            <HardDrive className="w-4 h-4" />
            Save to Drive
          </label>
          {files.length > 0 && !running && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFiles([]); setResults([]); }}
            >
              Clear all
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10">
          <Shield className="w-4 h-4 text-[var(--color-primary)]" />
          <p className="text-xs text-[var(--color-text-muted)]">
            Each file is encrypted independently with a unique AES-256 key and IV.
          </p>
        </div>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardSection title="Encryption Results">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">File</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Private Key</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">IV</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--color-text-dim)] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-[var(--color-border)]/50 last:border-0">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--color-text-dim)]">{getFileIcon(r.name)}</span>
                          <div>
                            <div className="font-medium">{r.name}</div>
                            <div className="text-xs text-[var(--color-text-dim)]">{formatBytes(r.size)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            r.status === "ok" ? "success" : r.status === "error" ? "danger" : "warning"
                          }
                          dot
                        >
                          {r.status === "ok" ? "Done" : r.status === "error" ? "Error" : "Encrypting"}
                        </Badge>
                        {r.error && (
                          <div className="text-xs text-red-400 mt-1">{r.error}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {r.key && (
                          <div className="flex items-center gap-2">
                            <code className="text-[10px] font-mono text-cyan-400">{r.key.slice(0, 16)}...</code>
                            <CopyButton text={r.key} onCopy={() => showToast("Key copied!", "success")} />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {r.iv && (
                          <div className="flex items-center gap-2">
                            <code className="text-[10px] font-mono text-cyan-400">{r.iv.slice(0, 16)}...</code>
                            <CopyButton text={r.iv} onCopy={() => showToast("IV copied!", "success")} />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {r.status === "ok" && (
                          <Button
                            variant={r.savedToVault ? "success" : "secondary"}
                            size="sm"
                            icon={r.savedToVault ? <Check className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                            onClick={() => !r.savedToVault && openVaultModal(r, i)}
                            disabled={r.savedToVault}
                          >
                            {r.savedToVault ? "Saved" : "Save to Vault"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 mt-4 px-4 py-3 rounded-xl bg-[#00BFA6]/5 border border-[#00BFA6]/15">
              <AlertTriangle className="w-4 h-4 text-[#009E8A]" />
              <p className="text-xs text-[#009E8A]">
                Save your keys — they are NOT stored on the server. Without the key and IV you cannot decrypt your files.
              </p>
            </div>
          </CardSection>
        </Card>
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

      <Card>
        <CardSection title="Select Encrypted Files (.enc)">
          <div
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
              drag
                ? "border-[#00BFA6] bg-[#00BFA6]/5"
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
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#00BFA6]/20 to-[#4B154D]/15 flex items-center justify-center mb-4">
              <Unlock className="w-7 h-7 text-[#00BFA6]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-muted)]">
              Click to select or drag & drop .enc files
            </p>
          </div>
        </CardSection>

        {files.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-[var(--color-text-dim)] mb-4">
              Enter the key and IV for each file. SHA-256 is optional (for integrity check).
            </p>
            <div className="space-y-3">
              {files.map((f) => (
                <div
                  key={f.name}
                  className="p-4 rounded-xl bg-[var(--color-background)]/50 border border-[var(--color-border)]/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#00BFA6]" />
                      <span className="text-sm font-medium truncate">{f.name}</span>
                    </div>
                    <button
                      onClick={() => remove(f.name)}
                      className="p-1 rounded-lg hover:bg-[var(--color-danger)]/10 text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      className="px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-black outline-none focus:border-[var(--color-primary)] transition-colors"
                      placeholder="64-char hex key"
                      value={credentials[f.name]?.key || ""}
                      onChange={(e) => setCred(f.name, "key", e.target.value)}
                    />
                    <input
                      className="px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-black outline-none focus:border-[var(--color-primary)] transition-colors"
                      placeholder="32-char hex IV"
                      value={credentials[f.name]?.iv || ""}
                      onChange={(e) => setCred(f.name, "iv", e.target.value)}
                    />
                    <input
                      className="px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-xs font-mono text-black outline-none focus:border-[var(--color-primary)] transition-colors"
                      placeholder="SHA-256 (optional)"
                      value={credentials[f.name]?.hash || ""}
                      onChange={(e) => setCred(f.name, "hash", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 mt-6">
          <Button
            onClick={decryptAll}
            disabled={!files.length || running}
            loading={running}
            icon={<Unlock className="w-4 h-4" />}
            className="bg-gradient-to-r from-[#00BFA6] to-[#009E8A] shadow-[#00BFA6]/20 hover:shadow-[#00BFA6]/30"
          >
            {running
              ? `Decrypting ${done}/${total}...`
              : `Decrypt ${files.length || ""} File${files.length !== 1 ? "s" : ""}`}
          </Button>
          {files.length > 0 && !running && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setFiles([]); setCredentials({}); setResults([]); }}
            >
              Clear all
            </Button>
          )}
        </div>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardSection title="Decryption Results">
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
                      <Badge
                        variant={
                          r.status === "ok" ? "success" : r.status === "error" ? "danger" : "warning"
                        }
                        dot
                      >
                        {r.status === "ok" ? "Done" : r.status === "error" ? "Error" : "Decrypting"}
                      </Badge>
                      {r.error && <div className="text-xs text-red-400 mt-1">{r.error}</div>}
                    </td>
                    <td className="py-3 px-3">
                      {r.integrity === "pass" && (
                        <Badge variant="success" dot>Verified</Badge>
                      )}
                      {r.integrity === "fail" && (
                        <Badge variant="danger" dot>Tampered</Badge>
                      )}
                      {r.integrity === null && r.status === "ok" && (
                        <span className="text-[var(--color-text-dim)] text-xs">No hash provided</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {r.hash && <code className="text-[10px] font-mono text-cyan-400">{r.hash.slice(0, 20)}...</code>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardSection>
        </Card>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"encrypt" | "decrypt">("encrypt");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/auth");
      return;
    }
    setToken(t);
  }, [router]);

  if (!token) return null;

  return (
    <DashboardLayout
      title="Workspace"
      description="Encrypt or decrypt files with AES-256 encryption"
    >
      <div className="flex rounded-xl bg-[var(--color-surface)] p-1 border border-[var(--color-border)] w-fit mb-8">
        <button
          onClick={() => setTab("encrypt")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
            tab === "encrypt"
              ? "bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg"
              : "text-[var(--color-text-muted)] hover:text-white"
          }`}
        >
          <Lock className="w-4 h-4" />
          Encrypt
        </button>
        <button
          onClick={() => setTab("decrypt")}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
            tab === "decrypt"
              ? "bg-gradient-to-r from-[#00BFA6] to-[#009E8A] text-white shadow-lg"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          <Unlock className="w-4 h-4" />
          Decrypt
        </button>
      </div>

      {tab === "encrypt" ? (
        <EncryptPanel token={token} />
      ) : (
        <DecryptPanel token={token} />
      )}
    </DashboardLayout>
  );
}







