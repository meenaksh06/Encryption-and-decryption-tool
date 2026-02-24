"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Shield,
  Key,
  Trash2,
  Save,
  AlertTriangle,
  Check,
  HardDrive,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout";
import { Card, CardSection, Button, Input, Badge } from "@/components/ui";
import { getToken, logout } from "@/lib/api";
import { useToast } from "@/components/Toast";

const API = "http://localhost:8080";

interface UserInfo {
  id: number;
  username: string;
  createdAt: number;
  stats: {
    files: number;
    vaultEntries: number;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { showToast, ToastComponent } = useToast();

  const fetchUserInfo = useCallback(async (t: string) => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 401) {
        router.replace("/auth");
        return;
      }
      if (res.ok) {
        setUser(await res.json());
      }
    } catch {
      // Handle silently
    }
  }, [router]);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/auth");
      return;
    }
    setToken(t);
    fetchUserInfo(t);
  }, [router, fetchUserInfo]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    setPasswordChanging(true);

    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "Failed to change password");
        return;
      }

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password changed successfully", "success");
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setPasswordChanging(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showToast("Please enter your password", "error");
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`${API}/auth/account`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to delete account", "error");
        return;
      }

      showToast("Account deleted", "info");
      logout();
    } catch {
      showToast("Network error", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (!token) return null;

  return (
    <DashboardLayout title="Settings" description="Manage your account and preferences">
      {ToastComponent}

      <div className="max-w-3xl space-y-6">
        {/* Profile Section */}
        <Card>
          <CardSection title="Profile">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-2xl font-bold text-white">
                {user?.username?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{user?.username || "Loading..."}</h3>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Member since{" "}
                  {user?.createdAt
                    ? new Date(user.createdAt * 1000).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "..."}
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <HardDrive className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-[var(--color-text-muted)]">
                      {user?.stats?.files || 0} files
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Key className="w-4 h-4 text-[var(--color-primary)]" />
                    <span className="text-[var(--color-text-muted)]">
                      {user?.stats?.vaultEntries || 0} vault entries
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant="primary">Free Plan</Badge>
            </div>
          </CardSection>
        </Card>

        {/* Security Section */}
        <Card>
          <CardSection title="Security">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Change Password</h4>
                  <p className="text-xs text-[var(--color-text-dim)]">
                    Update your password to keep your account secure
                  </p>
                </div>
              </div>

              <Input
                type="password"
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                showPasswordToggle
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="password"
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  showPasswordToggle
                  hint="Minimum 8 characters"
                />
                <Input
                  type="password"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  showPasswordToggle
                  error={confirmPassword && newPassword !== confirmPassword ? "Passwords don't match" : undefined}
                />
              </div>

              {passwordError && (
                <div className="px-4 py-3 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-sm text-[var(--color-danger)]">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="px-4 py-3 rounded-xl bg-[#00BFA6]/10 border border-[#00BFA6]/20 text-sm text-[#00BFA6] flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Password changed successfully
                </div>
              )}

              <Button
                type="submit"
                loading={passwordChanging}
                disabled={!currentPassword || !newPassword || !confirmPassword}
                icon={<Save className="w-4 h-4" />}
              >
                Update Password
              </Button>
            </form>
          </CardSection>
        </Card>

        {/* Encryption Info */}
        <Card>
          <CardSection title="Encryption Standards">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[var(--color-background)]/50 border border-[var(--color-border)]/50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="text-sm font-bold text-white">File Encryption</span>
                </div>
                <p className="text-xs text-[var(--color-text-dim)]">
                  AES-256-CBC with unique key and IV per file
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--color-background)]/50 border border-[var(--color-border)]/50">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="text-sm font-bold text-white">Vault Encryption</span>
                </div>
                <p className="text-xs text-[var(--color-text-dim)]">
                  PBKDF2 (310k iterations) + AES-256-GCM
                </p>
              </div>
            </div>
          </CardSection>
        </Card>

        {/* Danger Zone */}
        <Card className="border-[var(--color-danger)]/20">
          <CardSection title="Danger Zone">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-danger)]/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[var(--color-danger)]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Delete Account</h4>
                  <p className="text-xs text-[var(--color-text-dim)] mt-1 max-w-md">
                    Permanently delete your account and all associated data. This action cannot be
                    undone. All your files, vault entries, and chat history will be deleted.
                  </p>
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Account
              </Button>
            </div>

            {showDeleteConfirm && (
              <div className="mt-6 p-4 rounded-xl bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/20">
                <p className="text-sm text-[var(--color-text-muted)] mb-4">
                  To confirm deletion, please enter your password:
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your password"
                    className="flex-1"
                  />
                  <Button
                    variant="danger"
                    loading={deleting}
                    onClick={handleDeleteAccount}
                    disabled={!deletePassword}
                  >
                    Confirm Delete
                  </Button>
                  <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardSection>
        </Card>
      </div>
    </DashboardLayout>
  );
}







