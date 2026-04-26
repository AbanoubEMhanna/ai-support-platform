export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string } };

export async function apiFetch<T>(
  path: string,
  options?: { method?: string; body?: any; headers?: Record<string, string> },
): Promise<T> {
  return request<T>(path, options, true);
}

async function request<T>(
  path: string,
  options: { method?: string; body?: any; headers?: Record<string, string> } | undefined,
  allowRefresh: boolean,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options?.headers ?? {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (res.status === 401 && allowRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(path, options, false);
  }

  if (!res.ok) {
    const msg = json && "error" in json ? json.error.message : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  if (!json || !("success" in json) || !json.success) {
    throw new Error("Request failed");
  }
  return json.data;
}

async function refreshSession() {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}

