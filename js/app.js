// Elevate frontend — shared app utilities
// Accessibility helpers, router, and shared rendering helpers.

export const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem("elevate_" + key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("elevate_" + key), JSON.stringify(value); }
    catch {}
  },
};

export function applyAccessibility(prefs) {
  if (!prefs) return;
  const root = document.documentElement;
  if (prefs.screenReader) root.setAttribute("data-screen-reader", "true");
  if (prefs.keyboardNavigation) root.setAttribute("data-keyboard-nav", "true");
  if (prefs.fontSize) root.setAttribute("data-font-size", prefs.fontSize);
  if (prefs.highContrast) root.setAttribute("data-high-contrast", "true");
  if (prefs.captions) root.setAttribute("data-captions", "true");
  if (prefs.transcripts) root.setAttribute("data-transcripts", "true");
  if (prefs.reducedMotion) root.setAttribute("data-reduced-motion", "true");
  if (prefs.simpleLanguage) root.setAttribute("data-simple-language", "true");
}

export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function skillColor(score) {
  if (score >= 75) return "var(--success)";
  if (score >= 50) return "var(--warning)";
  return "var(--danger)";
}

export function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function simpleText(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}