const domain = process.env.EXPO_PUBLIC_DOMAIN;
export const API_BASE = domain ? `https://${domain}/api` : "/api";

export async function apiFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  return fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
}
