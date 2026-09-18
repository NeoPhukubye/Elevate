// Elevate frontend — API client
// Talks to the backend at /api/v1 (works in dev and production via the GitHub Pages
// site's API proxy when configured, or points at the Render URL directly).

const API_BASE = (window.ELEVATE_API_URL || "/api/v1").replace(/\/$/, "");

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export function token() { return localStorage.getItem("elevate_token"); }
export function setToken(t) { if (t) localStorage.setItem("elevate_token", t); else localStorage.removeItem("elevate_token"); }
export function authHeaders() {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function authed(path, options = {}) {
  return request(path, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
}