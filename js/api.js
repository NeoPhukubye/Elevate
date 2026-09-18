// Elevate frontend — API client
// Tries the backend, and falls back to built-in local data so the page
// always works even when the backend is unreachable.

import { localListScenarios, localGetScenario, localFeedback, localSkills } from "./local.js";

const API_BASE = (window.ELEVATE_API_URL || "https://elevate-backend-0gv6.onrender.com") + "/api/v1";

let offline = false;
export function isOffline() { return offline; }

// Give up on the network after 8s so the page never hangs on a dead backend.
async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      signal: controller.signal,
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// Shape the local data exactly like the backend's { success, data } envelope,
// so callers cannot tell the difference.
function local(path, options) {
  const method = (options && options.method) || "GET";
  const body = options && options.body ? JSON.parse(options.body) : {};

  if (method === "GET" && path === "/scenarios") {
    return { success: true, data: localListScenarios() };
  }
  if (method === "GET" && path.startsWith("/scenarios/")) {
    return { success: true, data: localGetScenario(decodeURIComponent(path.slice("/scenarios/".length))) };
  }
  if (method === "GET" && path === "/skills") {
    return { success: true, data: localSkills };
  }
  const startedMatch = path.match(/^\/scenarios\/(.+)\/start$/);
  if (method === "POST" && startedMatch) {
    const id = decodeURIComponent(startedMatch[1]);
    return { success: true, data: { session: { id: "local-" + Date.now() }, scenarioId: id };
  }
  if (method === "POST" && path.endsWith("/complete")) {
    const scenario = localGetScenario(body.scenarioId);
    const feedback = localFeedback(scenario, body.userChoice);
    return { success: true, data: { sessionId: "local-" + Date.now(), feedback };
  }
  return { success: true, data: null };
}

// Every call goes through here: real backend first, local data on any failure.
async function call(path, options = {}) {
  try {
    const data = await request(path, options);
    offline = false;
    return data;
  } catch (e) {
    if (isOffline()) throw e; // a real backend error (e.g. 404) still propagates below
    offline = true;
    const mock = local(path, options);
    if (mock.data === null) throw e;
    return mock;
  }
}

export const api = {
  get: (path) => call(path),
  post: (path, body) => call(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => call(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: (path, body) => call(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => call(path, { method: "DELETE" }),
};

export function token() { return localStorage.getItem("elevate_token"); }
export function setToken(t) { if (t) localStorage.setItem("elevate_token", t); else localStorage.removeItem("elevate_token"); }
export function authHeaders() {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function authed(path, options = {}) {
  return call(path, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
}

export function apiBase() { return API_BASE; }