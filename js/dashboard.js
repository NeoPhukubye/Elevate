// Elevate frontend — progress dashboard
import { authed } from "./api.js";
import { escapeHtml, skillColor } from "./app.js";

export async function loadProgress() {
  const res = await authed("/progress");
  return res.data;
}

export async function loadSkills() {
  const res = await api.get("/skills");
  return res.data;
}

import { api } from "./api.js";

export function renderDashboard(progress, skills) {
  const skillMap = new Map((skills || []).map((s) => [s.id, s]));
  const bySkill = new Map();
  for (const p of progress || []) {
    const list = bySkill.get(p.skillId) || [];
    list.push(p.score);
    bySkill.set(p.skillId, list);
  }

  const el = document.createElement("div");
  const rows = Array.from(bySkill.entries()).map(([id, scores]) => {
    const skill = skillMap.get(id) || { name: "Skill", category: "" };
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return `
      <div class="card" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <strong>${escapeHtml(skill.name)}</strong>
            <div class="muted" style="font-size:0.85rem;">${escapeHtml(skill.category || "")} · ${scores.length} attempt${scores.length === 1 ? "" : "s"}</div>
          </div>
          <div style="font-weight:700;">${avg}</div>
        </div>
        <div class="skill-bar" style="margin-top:10px;"><span style="width:${avg}%;background:${skillColor(avg)};"></span></div>
      </div>
    `;
  });

  const textSummary = Array.from(bySkill.entries()).map(([id, scores]) => {
    const skill = skillMap.get(id) || { name: "Skill" };
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return `${skill.name}: average score ${avg} across ${scores.length} attempt${scores.length === 1 ? "" : "s"}.`;
  });

  el.innerHTML = `
    <h1 style="margin:0 0 6px;">Your progress</h1>
    <p class="muted" style="margin:0 0 24px;">See how you are developing across key workplace skills.</p>
    ${rows.join("") || `<p class="muted">No progress yet. Complete a scenario to start tracking.</p>`}
    <div class="card" style="background:var(--bg-soft);color:#fff;">
      <h2 style="margin:0 0 12px;">Progress summary (text)</h2>
      <p style="margin:0;">${textSummary.length ? textSummary.join(" ") : "Complete a scenario to start building your progress."}</p>
    </div>
  `;
  return el;
}
