"use client";

import { useState, useEffect } from "react";
import { X, Key, Save, Check } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { getToken } from "@/lib/api";

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

interface SaveToVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  encryptionKey: string;
  iv: string;
  filename: string;
  sha256?: string;
  onSaved?: () => void;
}

export default function SaveToVaultModal({
  isOpen,
  onClose,
  encryptionKey,
  iv,
  filename,
  sha256,
  onSaved,
}: SaveToVaultModalProps) {
  const [vaultPassword, setVaultPassword] = useState("");
  const [label, setLabel] = useState(filename);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLabel(filename);
      setNote(sha256 ? `SHA-256: ${sha256.slice(0, 16)}...` : "");
      setVaultPassword("");
      setError("");
      setSuccess(false);
    }
  }, [isOpen, filename, sha256]);

  const handleSave = async () => {
    if (!vaultPassword || !label.trim()) {
      setError("Vault password and label are required");
      return;
    }

    const token = getToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Get salt from backend
      const saltRes = await fetch(`${API}/vault/salt`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!saltRes.ok) throw new Error("Failed to get vault salt");
      const { salt } = await saltRes.json();

      // Derive key from password
      const vaultKey = await deriveKey(vaultPassword, salt);

      // Encrypt the entry
      const { encrypted_data, enc_iv } = await encryptEntry(vaultKey, {
        key: encryptionKey,
        iv: iv,
        note: note.trim(),
      });

      // Save to vault
      const res = await fetch(`${API}/vault/entries`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label: label.trim(), encrypted_data, enc_iv }),
      });

      if (!res.ok) throw new Error("Failed to save to vault");

      setSuccess(true);
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save to vault");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-card p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F9F7FA] flex items-center justify-center">
              <Key className="w-5 h-5 text-[#4B154D]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Save to Vault</h2>
              <p className="text-xs text-gray-500">
                Securely store your encryption key
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#E6F8F5] flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-[#00BFA6]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Saved to Vault</h3>
            <p className="text-sm text-gray-500">
              Your encryption key has been securely stored.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="File name or description"
            />

            <Input
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
            />

            <div className="p-4 rounded-xl bg-[#F9F7FA] border border-[#E8E6EA] space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-gray-500 w-8 flex-shrink-0 pt-0.5">
                  KEY
                </span>
                <code className="text-[10px] font-mono text-[#4B154D] break-all flex-1">
                  {encryptionKey.slice(0, 32)}...
                </code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-gray-500 w-8 flex-shrink-0 pt-0.5">
                  IV
                </span>
                <code className="text-[10px] font-mono text-[#4B154D] break-all flex-1">{iv}</code>
              </div>
            </div>

            <Input
              type="password"
              label="Vault Password"
              value={vaultPassword}
              onChange={(e) => setVaultPassword(e.target.value)}
              placeholder="Enter your vault password"
              showPasswordToggle
              hint="This password encrypts your keys. Remember it - we can't recover it."
            />

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                loading={saving}
                disabled={!vaultPassword || !label.trim()}
                icon={<Save className="w-4 h-4" />}
                className="flex-1"
              >
                Save to Vault
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}






