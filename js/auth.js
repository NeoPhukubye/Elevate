// Elevate frontend — authentication + user state
import { api, token, setToken, authHeaders, authed } from "./api.js";
import { applyAccessibility, initials } from "./app.js";

export const currentUser = {
  user: null,
  async login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    setToken(res.data.token);
    this.user = res.data.user;
    await this.load();
    return this.user;
  },
  async register(email, password, displayName) {
    const res = await api.post("/auth/register", { email, password, displayName });
    setToken(res.data.token);
    this.user = res.data.user;
    await this.load();
    return this.user;
  },
  async load() {
    if (!token()) { this.user = null; return null; }
    try {
      const res = await authed("/auth/me");
      this.user = res.data;
      if (this.user.accessibility) applyAccessibility(this.user.accessibility);
      return this.user;
    } catch {
      setToken(null);
      this.user = null;
      return null;
    }
  },
  logout() {
    setToken(null);
    this.user = null;
    window.location.href = "/";
  },
  avatar() {
    return this.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.user?.displayName || this.user?.email || "?")}&background=6366f1&color=fff&size=128`;
  },
  name() { return this.user?.displayName || this.user?.email || "User"; },
  initials() { return initials(this.name()); },
};
