// Elevate frontend — scenario list + detail + practice flow
import { api, authed, token } from "./api.js";
import { escapeHtml, store, simpleText } from "./app.js";

export async function loadScenarios() {
  const res = await api.get("/scenarios");
  return res.data;
}

export async function loadScenario(id) {
  const res = await api.get("/scenarios/" + encodeURIComponent(id));
  return res.data;
}

export function renderScenarioCard(scenario, onOpen) {
  const el = document.createElement("article");
  el.className = "card";
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
      <h3 style="margin:0 0 6px;">${escapeHtml(scenario.title)}</h3>
      <span class="tag">${escapeHtml(scenario.difficulty)}</span>
    </div>
    <p class="muted" style="margin:0 0 10px;">${escapeHtml(scenario.description)}</p>
    <div style="margin-bottom:12px;">
      ${(scenario.skills || []).map((s) => `<span class="tag">${escapeHtml(s.skill?.name || s.name || "Skill")}</span>`).join("")}
    </div>
    <button class="btn ghost" data-open="${scenario.id}">Practise this scenario</button>
  `;
  el.querySelector("[data-open]").addEventListener("click", () => onOpen(scenario.id));
  return el;
}

export function renderScenarioDetail(scenario, onChoice) {
  const options = Array.isArray(scenario.options) ? scenario.options : [];
  const el = document.createElement("div");
  el.innerHTML = `
    <a href="#/scenarios" class="btn ghost" style="margin-bottom:16px;">Back to scenarios</a>
    <h1 style="margin:0 0 6px;">${escapeHtml(scenario.title)}</h1>
    <p class="muted" style="margin:0 0 14px;">${escapeHtml(scenario.description)}</p>
    <div class="card" style="margin-bottom:16px;">
      <h2 style="margin:0 0 8px;">Situation</h2>
      <p style="margin:0;">${escapeHtml(scenario.prompt)}</p>
      ${(scenario.tips || []).length ? `<div style="margin-top:12px;"><strong>Tips:</strong><ul style="margin:8px 0 0 18px;">${scenario.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul></div>` : ""}
    </div>
    <div class="card">
      <h2 style="margin:0 0 12px;">Choose your response</h2>
      <div id="options" style="display:flex;flex-direction:column;gap:10px;">
        ${options.map((o, i) => `
          <button class="btn ghost" data-choice="${i}" style="text-align:left;justify-content:flex-start;">
            <strong>${escapeHtml(String.fromCharCode(65 + i))}.</strong> ${escapeHtml(o.text || o.label || String(o))}
          </button>
        `).join("")}
      </div>
    </div>
  `;
  el.querySelectorAll("[data-choice]").forEach((btn) => {
    btn.addEventListener("click", () => onChoice(scenario.id, btn.dataset.choice));
  });
  return el;
}

export async function submitChoice(scenarioId, choiceIndex, timeTakenSec) {
  if (!token()) {
    // Guest mode — return mock feedback without saving to the database
    return {
      data: {
        sessionId: "guest",
        feedback: {
          whatWentWell: "You completed the scenario. Sign in to save your progress and get personalised feedback.",
          whatToImprove: "Think about why you chose that option and what a colleague might have done differently.",
          nextSteps: "Try the scenario again with what you learned.",
          retryAdvice: "Re-read the situation and the tips before trying again.",
          score: 50,
        },
      },
    };
  }
  const started = await authed("/scenarios/" + encodeURIComponent(scenarioId) + "/start", {
    method: "POST",
    body: JSON.stringify({ userChoice: String(choiceIndex), timeTakenSec: timeTakenSec || 0 }),
  });
  const sid = started.data.session.id;
  store.set("currentSession", sid);
  const result = await authed("/sessions/" + sid + "/complete", {
    method: "POST",
    body: JSON.stringify({ scenarioId, userChoice: String(choiceIndex), timeTakenSec: timeTakenSec || 0 }),
  });
  store.set("currentSession", null);
  return result;
}

export function renderFeedback(feedback, sessionId, scenarioId) {
  const el = document.createElement("div");
  el.innerHTML = `
    <a href="#/scenarios" class="btn ghost" style="margin-bottom:16px;">Back to scenarios</a>
    <h1 style="margin:0 0 6px;">Your feedback</h1>
    <div style="display:flex;align-items:center;gap:12px;margin:16px 0 20px;">
      <div style="font-size:2.5rem;font-weight:800;color:var(--primary);">${feedback.score}</div>
      <div class="skill-bar" style="flex:1;"><span style="width:${feedback.score}%;"></span></div>
      <span class="muted">/100</span>
    </div>
    <div class="card feedback-card good" style="margin-bottom:14px;">
      <h2 style="margin:0 0 8px;">What went well</h2>
      <p style="margin:0;">${escapeHtml(simpleText(feedback.whatWentWell))}</p>
    </div>
    <div class="card feedback-card improve" style="margin-bottom:14px;">
      <h2 style="margin:0 0 8px;">What to improve</h2>
      <p style="margin:0;">${escapeHtml(simpleText(feedback.whatToImprove))}</p>
    </div>
    <div class="card" style="margin-bottom:14px;">
      <h2 style="margin:0 0 8px;">Next steps</h2>
      <p style="margin:0;">${escapeHtml(simpleText(feedback.nextSteps))}</p>
    </div>
    ${feedback.retryAdvice ? `
      <div class="card" style="margin-bottom:20px;">
        <h2 style="margin:0 0 8px;">Try again</h2>
        <p style="margin:0;">${escapeHtml(simpleText(feedback.retryAdvice))}</p>
      </div>
    ` : ""}
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn" data-retry>Try this scenario again</button>
      <button class="btn accent" data-pdf>Download PDF report</button>
    </div>
  `;
  return el;
}
