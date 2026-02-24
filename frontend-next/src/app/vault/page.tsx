"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useToast } from "@/components/Toast";
import { getToken } from "@/lib/api";
import { useRouter } from "next/navigation";

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
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔑</span>
            <span className="text-sm font-bold">{entry.label}</span>
          </div>
          <span className="text-[11px] text-[var(--color-text-dim)] mt-1 block">{fmtDate(entry.created_at)}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => (revealed ? hide() : setRevealed(true))}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              revealed
                ? "bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                : "bg-[var(--color-primary)] text-white"
            }`}
          >
            {revealed ? "Hide" : "👁 Reveal"}
          </button>
          <button
            onClick={() => {
              if (window.confirm("Delete this vault entry?")) onDelete(entry.id);
            }}
            className="px-3 py-1.5 rounded-lg bg-[var(--color-danger)]/10 text-red-400 text-xs font-semibold hover:bg-[var(--color-danger)]/20 transition-colors"
          >
            🗑
          </button>
        </div>
      </div>

      {revealed && (
        <div className="mt-4 p-4 rounded-xl bg-[var(--color-background)]/60 border border-[var(--color-border)]/50 space-y-2">
          {error ? (
            <div className="text-xs text-red-400">{error}</div>
          ) : !data ? (
            <div className="text-xs text-[var(--color-text-dim)]">Decrypting…</div>
          ) : (
            <>
              {data.key && (
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-bold text-[var(--color-text-dim)] w-8 flex-shrink-0 pt-0.5">KEY</span>
                  <code className="text-[10px] font-mono text-cyan-400 break-all flex-1">{data.key}</code>
                  <button onClick={() => { copyText(data.key!); onCopy(); }} className="px-2 py-0.5 rounded bg-[var(--color-surface-hover)] text-[10px] text-[var(--color-text-muted)] hover:text-white">
                    copy
                  </button>
                </div>
              )}
              {data.iv && (
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-bold text-[var(--color-text-dim)] w-8 flex-shrink-0 pt-0.5">IV</span>
                  <code className="text-[10px] font-mono text-cyan-400 break-all flex-1">{data.iv}</code>
                  <button onClick={() => { copyText(data.iv!); onCopy(); }} className="px-2 py-0.5 rounded bg-[var(--color-surface-hover)] text-[10px] text-[var(--color-text-muted)] hover:text-white">
                    copy
                  </button>
                </div>
              )}
              {data.note && (
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-bold text-[var(--color-text-dim)] w-8 flex-shrink-0 pt-0.5">NOTE</span>
                  <span className="text-xs text-[var(--color-text-muted)] flex-1">{data.note}</span>
                </div>
              )}
              {/* Timer bar */}
              <div className="mt-2">
                <div className="h-1 rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-1000 ease-linear"
                    style={{ width: `${(seconds / 30) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-[var(--color-text-dim)] text-right mt-1">
                  Hides in {seconds}s
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
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

  // Add entry form
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newIv, setNewIv] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    const t = getToken();
    if (!t) { router.replace("/auth"); return; }
    setToken(t);
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

      // Verify password by trying to decrypt the first entry
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

  const lockVault = () => {
    setVaultKey(null);
    setEntries([]);
    setPassword("");
  };

  if (!token) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      {ToastComponent}

      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16">
        {!vaultKey ? (
          /* ── Unlock Screen ── */
          <div className="glass-card p-10 text-center max-w-md mx-auto mt-16">
            <div className="text-5xl mb-5">🔐</div>
            <h2 className="text-xl font-bold mb-2">Key Vault</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-8 leading-relaxed">
              Your keys are encrypted with your vault password.
              <br />
              The password never leaves your browser.
            </p>

            <input
              type="password"
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-background)]/80 border border-[var(--color-border)] text-sm text-white text-center tracking-widest outline-none focus:border-[var(--color-primary)] mb-4"
              placeholder="Vault password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && unlock()}
            />

            {unlockError && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-sm text-red-400">
                {unlockError}
              </div>
            )}

            <button
              onClick={unlock}
              disabled={!password || unlocking}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold text-sm disabled:opacity-50 transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0"
            >
              {unlocking ? "Unlocking…" : "Unlock Vault"}
            </button>

            <p className="text-[11px] text-[var(--color-text-dim)] mt-4">
              First time? Set any password — it will encrypt all future entries.
            </p>
          </div>
        ) : (
          /* ── Vault Unlocked ── */
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-black tracking-tight">🔐 Key Vault</h1>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  {entries.length} encrypted key{entries.length !== 1 ? "s" : ""} stored
                </p>
              </div>
              <button
                onClick={lockVault}
                className="px-4 py-2 rounded-xl bg-[var(--color-surface-hover)] text-sm text-[var(--color-text-muted)] hover:text-white transition-colors"
              >
                🔒 Lock Vault
              </button>
            </div>

            {/* Security note */}
            <div className="px-5 py-4 rounded-xl bg-purple-500/5 border border-purple-500/15 text-xs text-purple-300 leading-relaxed mb-6">
              🛡 Zero-knowledge: your vault password and plaintext keys never leave your browser. The server stores only AES-256-GCM encrypted blobs derived via PBKDF2 (310,000 iterations).
            </div>

            {/* Add entry form */}
            <div className="glass-card p-6 mb-6 border-dashed">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-dim)] mb-4">
                + Add Key Entry
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--color-text-dim)] mb-1.5">Label</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)]/80 border border-[var(--color-border)] text-xs text-white outline-none focus:border-[var(--color-primary)]"
                    placeholder="report.pdf"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--color-text-dim)] mb-1.5">Note (optional)</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)]/80 border border-[var(--color-border)] text-xs text-white outline-none focus:border-[var(--color-primary)]"
                    placeholder="encrypted 2024-02-24"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--color-text-dim)] mb-1.5">AES Key (hex)</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)]/80 border border-[var(--color-border)] text-xs font-mono text-white outline-none focus:border-[var(--color-primary)]"
                    placeholder="64-char hex key"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--color-text-dim)] mb-1.5">IV (hex)</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg bg-[var(--color-background)]/80 border border-[var(--color-border)] text-xs font-mono text-white outline-none focus:border-[var(--color-primary)]"
                    placeholder="32-char hex IV"
                    value={newIv}
                    onChange={(e) => setNewIv(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={saveEntry}
                disabled={!label.trim() || !newKey.trim() || !newIv.trim() || saving}
                className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold disabled:opacity-50 transition-all hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                {saving ? "Saving…" : "🔒 Save to Vault"}
              </button>
            </div>

            {/* Entries list */}
            <div className="space-y-3">
              {entries.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🗝️</div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    No keys saved yet. Encrypt a file in Workspace and save its key here.
                  </p>
                </div>
              )}
              {entries.map((e) => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  vaultKey={vaultKey}
                  onDelete={deleteEntry}
                  onCopy={() => showToast("Copied!", "success")}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
