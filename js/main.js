// Elevate frontend — router + entry point
import { currentUser } from "./auth.js";
import { loadScenarios, renderScenarioCard, renderScenarioDetail, submitChoice, renderFeedback } from "./scenarios.js";
import { renderDashboard, loadProgress, loadSkills } from "./dashboard.js";
import { openFeedbackPdf } from "./pdf.js";
import { escapeHtml, store } from "./app.js";

const app = document.getElementById("app");

function nav() {
  const name = currentUser.name();
  return `
    <nav class="links">
      <a href="#/scenarios">Scenarios</a>
      <a href="#/progress">Progress</a>
      <span class="muted" style="margin-left:18px;">${escapeHtml(name)}</span>
      ${!currentUser.guest ? `<button class="btn ghost" id="logout" style="margin-left:8px;">Sign out</button>` : `<a href="#/scenarios" class="btn ghost" style="margin-left:8px;">Sign in to save progress</a>`}
    </nav>
  `;
}

function renderNav() {
  const header = document.querySelector("header.nav");
  if (!header) return;
  const existing = header.querySelector("nav.links");
  if (existing) existing.remove();
  const wrap = document.createElement("div");
  wrap.innerHTML = nav();
  header.appendChild(wrap.firstChild);
  const logout = header.querySelector("#logout");
  if (logout) logout.addEventListener("click", () => currentUser.logout());
}

async function renderPage(hash) {
  renderNav();
  if (hash === "#/progress") {
    const [progress, skills] = await Promise.all([loadProgress(), loadSkills()]);
    app.innerHTML = "";
    app.appendChild(renderDashboard(progress, skills));
  } else if (hash.startsWith("#/scenarios/")) {
    const id = hash.split("/")[2];
    const scenario = await loadScenario(id);
    app.innerHTML = "";
    app.appendChild(renderScenarioDetail(scenario, onChoice));
  } else {
    const scenarios = await loadScenarios();
    app.innerHTML = "";
    const hero = document.createElement("div");
    hero.className = "hero";
    hero.innerHTML = `<h1>Welcome to Elevate</h1><p class="lead">A workforce-readiness companion that helps young people bridge the gap between education and employment.</p>`;
    app.appendChild(hero);
    const heading = document.createElement("h1");
    heading.textContent = "Explore career scenarios";
    app.appendChild(heading);
    const sub = document.createElement("p");
    sub.className = "lead";
    sub.textContent = "Practise realistic workplace situations in a safe environment and get AI feedback.";
    app.appendChild(sub);
    const grid = document.createElement("div");
    grid.className = "grid two";
    for (const s of scenarios) grid.appendChild(renderScenarioCard(s, (sid) => { location.hash = "#/scenarios/" + sid; }));
    app.appendChild(grid);
  }
}

async function onChoice(scenarioId, choiceIndex) {
  const started = Date.now();
  const timeTaken = Math.max(1, Math.round((Date.now() - started) / 1000));
  const result = await submitChoice(scenarioId, parseInt(choiceIndex, 10), timeTaken);
  app.innerHTML = "";
  app.appendChild(renderFeedback(result.feedback, result.sessionId, scenarioId));
  const retry = app.querySelector("[data-retry]");
  if (retry) retry.addEventListener("click", () => { location.hash = "#/scenarios/" + scenarioId; });
  const pdfBtn = app.querySelector("[data-pdf]");
  if (pdfBtn) pdfBtn.addEventListener("click", () => {
    openFeedbackPdf({
      scenario: { title: scenarioId, category: "Scenario" },
      feedback: result.feedback,
      score: result.feedback.score,
      date: new Date().toLocaleDateString(),
      userName: currentUser.name(),
    });
  });
}

function renderAuth() {
  // Sign-in is optional — redirect to scenarios instead of showing the auth form
  location.hash = "#/scenarios";
}

window.addEventListener("hashchange", () => renderPage(location.hash));
window.addEventListener("load", async () => {
  await currentUser.load();
  renderNav();
  renderPage(location.hash || "#/scenarios");
});
