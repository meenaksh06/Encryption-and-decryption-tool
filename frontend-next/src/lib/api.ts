const API_BASE = "http://localhost:8080";

export async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("vl_token") : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vl_token");
}

export function getUsername(): string {
  if (typeof window === "undefined") return "User";
  return localStorage.getItem("vl_username") || "User";
}

export function logout() {
  localStorage.removeItem("vl_token");
  localStorage.removeItem("vl_username");
  window.location.href = "/auth";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}
