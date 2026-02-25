"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Copy,
  Shield,
  Download,
  Clock,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardSection, Button, Input, EmptyState } from "@/components/ui";
import { getToken } from "@/lib/api";
import { useToast } from "@/components/Toast";

const API = "http://localhost:8080";

/* ── WebCrypto helpers ── */
function u8ToB64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToU8(b64: string) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveKey(password: string, saltB64: string) {
  const enc = new TextEncoder().encode(password);
  const baseKey = await crypto.subtle.importKey("raw", enc, "PBKDF2", false, ["deriveKey"]);
  const salt = b64ToU8(saltB64);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptEntry(vaultKey: CryptoKey, payload: Record<string, string>) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(JSON.stringify(payload));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, vaultKey, enc);
  return { encrypted_data: u8ToB64(new Uint8Array(ct)), enc_iv: u8ToB64(iv) };
}

async function decryptEntry(vaultKey: CryptoKey, encB64: string, ivB64: string) {
  const ct = b64ToU8(encB64);
  const iv = b64ToU8(ivB64);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, vaultKey, ct);
  return JSON.parse(new TextDecoder().decode(plain));
}

interface VaultEntry {
  id: number;
  label: string;
  encrypted_data: string;
  enc_iv: string;
  created_at: number;
}

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

/* ── Entry card with timed reveal ── */
function EntryCard({
  entry,
  vaultKey,
  onDelete,
  onCopy,
}: {
  entry: VaultEntry;
  vaultKey: CryptoKey;
  onDelete: (id: number) => void;
  onCopy: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [data, setData] = useState<{ key?: string; iv?: string; note?: string } | null>(null);
  const [seconds, setSeconds] = useState(30);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!revealed || data) return;
    decryptEntry(vaultKey, entry.encrypted_data, entry.enc_iv)
      .then(setData)
      .catch(() => setError("Decryption failed."));
  }, [revealed, data, vaultKey, entry]);

  useEffect(() => {
    if (!data) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [data]);

  const hide = () => {
    setRevealed(false);
    setData(null);
    setSeconds(30);
    setError("");
  };

  if (seconds <= 0 && revealed) hide();

  return (
    <Card hoverable className="transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <span className="text-sm font-bold text-white">{entry.label}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="w-3 h-3 text-[var(--color-text-dim)]" />
              <span className="text-[11px] text-[var(--color-text-dim)]">{fmtDate(entry.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={revealed ? "secondary" : "primary"}
            size="sm"
            icon={revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            onClick={() => (revealed ? hide() : setRevealed(true))}
          >
            {revealed ? "Hide" : "Reveal"}
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => {
              if (window.confirm("Delete this vault entry?")) onDelete(entry.id);
            }}
          />
        </div>
      </div>

      {revealed && (
        <div className="mt-4 p-4 rounded-xl bg-[var(--color-background)]/60 border border-[var(--color-border)]/50 space-y-3">
          {error ? (
            <div className="text-xs text-red-400">{error}</div>
          ) : !data ? (
            <div className="text-xs text-[var(--color-text-dim)]">Decrypting...</div>
          ) : (
            <>
              {data.key && (
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-bold text-[var(--color-text-dim)] w-8 flex-shrink-0 pt-0.5">KEY</span>
                  <code className="text-[10px] font-mono text-cyan-400 break-all flex-1">{data.key}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Copy className="w-3 h-3" />}
                    onClick={() => { copyText(data.key!); onCopy(); }}
                  >
                    Copy
                  </Button>
                </div>
              )}
              {data.iv && (
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-bold text-[var(--color-text-dim)] w-8 flex-shrink-0 pt-0.5">IV</span>
                  <code className="text-[10px] font-mono text-cyan-400 break-all flex-1">{data.iv}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Copy className="w-3 h-3" />}
                    onClick={() => { copyText(data.iv!); onCopy(); }}
                  >
                    Copy
                  </Button>
                </div>
              )}
              {data.note && (
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-bold text-[var(--color-text-dim)] w-8 flex-shrink-0 pt-0.5">NOTE</span>
                  <span className="text-xs text-[var(--color-text-muted)] flex-1">{data.note}</span>
                </div>
              )}
              {/* Timer bar */}
              <div className="mt-3">
                <div className="h-1 rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-1000 ease-linear"
                    style={{ width: `${(seconds / 30) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-[var(--color-text-dim)] text-right mt-1">
                  Auto-hides in {seconds}s
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

export default function VaultPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [search, setSearch] = useState("");

  // Add entry form
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newIv, setNewIv] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    const t = getToken();
    if (!t) { router.replace("/auth"); return; }
    // Use timeout to avoid setState in effect warning
    const timeout = setTimeout(() => setToken(t), 0);
    return () => clearTimeout(timeout);
  }, [router]);

  const unlock = async () => {
    if (!password || !token) return;
    setUnlocking(true);
    setUnlockError("");

    try {
      const saltRes = await fetch(`${API}/vault/salt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (saltRes.status === 401) { router.replace("/auth"); return; }
      const { salt } = await saltRes.json();

      const key = await deriveKey(password, salt);

      const entriesRes = await fetch(`${API}/vault/entries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: VaultEntry[] = await entriesRes.json();

      if (data.length > 0) {
        try {
          await decryptEntry(key, data[0].encrypted_data, data[0].enc_iv);
        } catch {
          setUnlockError("Wrong vault password. Try again.");
          setUnlocking(false);
          return;
        }
      }

      setVaultKey(key);
      setEntries(data);
    } catch {
      setUnlockError("Failed to unlock. Is the backend running?");
    }
    setUnlocking(false);
  };

  const saveEntry = async () => {
    if (!label.trim() || !newKey.trim() || !newIv.trim() || !vaultKey || !token) return;
    setSaving(true);
    try {
      const { encrypted_data, enc_iv } = await encryptEntry(vaultKey, {
        key: newKey.trim(),
        iv: newIv.trim(),
        note: note.trim(),
      });
      const res = await fetch(`${API}/vault/entries`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label: label.trim(), encrypted_data, enc_iv }),
      });
      if (res.ok) {
        const { id } = await res.json();
        setEntries((prev) => [
          { id, label: label.trim(), encrypted_data, enc_iv, created_at: Math.floor(Date.now() / 1000) },
          ...prev,
        ]);
        setLabel("");
        setNewKey("");
        setNewIv("");
        setNote("");
        setShowAddForm(false);
        showToast("Key saved to vault", "success");
      }
    } catch {
      showToast("Failed to save", "error");
    }
    setSaving(false);
  };

  const deleteEntry = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/vault/entries/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        showToast("Entry deleted", "success");
      }
    } catch {
      showToast("Delete failed", "error");
    }
  };

  const exportMetadata = () => {
    const metadata = entries.map((e) => ({
      label: e.label,
      created_at: new Date(e.created_at * 1000).toISOString(),
    }));
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vault-metadata-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Metadata exported", "success");
  };

  const lockVault = () => {
    setVaultKey(null);
    setEntries([]);
    setPassword("");
  };

  const filteredEntries = entries.filter((e) =>
    e.label.toLowerCase().includes(search.toLowerCase())
  );

  if (!token) return null;

  if (!vaultKey) {
    return (
      <DashboardLayout title="Key Vault" description="Secure storage for your encryption keys">
        <div className="max-w-md mx-auto mt-16">
          <Card className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
            <h2 className="text-xl font-bold mb-2">Key Vault</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-8 leading-relaxed">
              Your keys are encrypted with your vault password.
              <br />
              The password never leaves your browser.
            </p>

            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter vault password"
              showPasswordToggle
              onKeyDown={(e) => e.key === "Enter" && unlock()}
              className="text-center"
            />

            {unlockError && (
              <div className="mt-4 px-4 py-2.5 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-sm text-red-400">
                {unlockError}
              </div>
            )}

            <Button
              onClick={unlock}
              disabled={!password || unlocking}
              loading={unlocking}
              icon={<Unlock className="w-4 h-4" />}
              className="w-full mt-6"
            >
              Unlock Vault
            </Button>

            <p className="text-[11px] text-[var(--color-text-dim)] mt-4">
              First time? Set any password — it will encrypt all future entries.
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Key Vault"
      description={`${entries.length} encrypted key${entries.length !== 1 ? "s" : ""} stored`}
      showSearch
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search vault entries..."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={exportMetadata}
          >
            Export Metadata
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Lock className="w-4 h-4" />}
            onClick={lockVault}
          >
            Lock Vault
          </Button>
        </div>
      }
    >
      {ToastComponent}

      <div className="px-5 py-4 rounded-xl bg-purple-500/5 border border-purple-500/15 flex items-center gap-4 mb-6">
        <Shield className="w-5 h-5 text-purple-400 flex-shrink-0" />
        <p className="text-xs text-purple-300 leading-relaxed">
          <strong>Zero-knowledge:</strong> Your vault password and plaintext keys never leave your browser.
          The server stores only AES-256-GCM encrypted blobs derived via PBKDF2 (310,000 iterations).
        </p>
      </div>

      <Card className="mb-6">
        {showAddForm ? (
          <CardSection title="Add Key Entry">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input
                label="Label"
                placeholder="report.pdf"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <Input
                label="Note (optional)"
                placeholder="encrypted 2024-02-24"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-black">
              <Input
                label="AES Key (hex)"
                placeholder="64-char hex key"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="font-mono"
              />
              <Input
                label="IV (hex)"
                placeholder="32-char hex IV"
                value={newIv}
                onChange={(e) => setNewIv(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={saveEntry}
                disabled={!label.trim() || !newKey.trim() || !newIv.trim() || saving}
                loading={saving}
                icon={<Lock className="w-4 h-4" />}
              >
                Save to Vault
              </Button>
              <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardSection>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 py-4 text-sm text-[var(--color-text-muted)] hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Key Entry
          </button>
        )}
      </Card>

      <div className="space-y-3">
        {filteredEntries.length === 0 && (
          <EmptyState
            icon={<Key className="w-8 h-8" />}
            title={search ? "No entries match your search" : "No keys saved yet"}
            description={
              search
                ? "Try a different search term"
                : "Encrypt a file in Workspace and save its key here."
            }
            action={
              !search
                ? { label: "Go to Workspace", onClick: () => router.push("/workspace") }
                : undefined
            }
          />
        )}
        {filteredEntries.map((e) => (
          <EntryCard
            key={e.id}
            entry={e}
            vaultKey={vaultKey}
            onDelete={deleteEntry}
            onCopy={() => showToast("Copied!", "success")}
          />
        ))}
      </div>
    </DashboardLayout>
  );
}


