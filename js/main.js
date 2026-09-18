// Elevate frontend — router + entry point
import { loadScenarios, loadScenario, renderScenarioCard, renderScenarioDetail, submitChoice, renderFeedback } from "./scenarios.js";
import { renderDashboard, loadSkills, loadProgress } from "./dashboard.js";
import { renderInterviewForm, startInterviewSession, renderInterviewChat } from "./interview-ui.js";
import { renderInterviewReport, wireInterviewReport } from "./interview-report.js";
import { openFeedbackPdf } from "./pdf.js";
import { apiBase } from "./api.js";
import { escapeHtml, store } from "./app.js";

const app = document.getElementById("app");

function nav() {
  return `
    <nav class="links">
      <a href="#/interview">Interview practice</a>
      <a href="#/scenarios">Scenarios</a>
      <a href="#/progress">Progress</a>
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
}

async function renderPage(hash) {
  renderNav();
  if (hash === "#/interview") {
    app.innerHTML = "";
    app.appendChild(renderInterviewForm(onInterviewStart));
  } else if (hash === "#/interview/practice") {
    renderPractice();
  } else if (hash === "#/interview/report") {
    renderReport();
  } else if (hash === "#/progress") {
    const [progress, skills] = await Promise.all([loadProgress(), loadSkills()]);
    app.innerHTML = "";
    app.appendChild(renderDashboard(progress, skills));
  } else if (hash.startsWith("#/scenarios/")) {
    const id = hash.split("/")[2];
    try {
      const scenario = await loadScenario(id);
      app.innerHTML = "";
      app.appendChild(renderScenarioDetail(scenario, onChoice));
    } catch (e) {
      app.innerHTML = `<div class="card"><h2>Unable to load scenario</h2><p class="muted">${escapeHtml(e.message)}</p><p class="muted">Make sure the backend is running and ELEVATE_API_URL is set correctly.</p></div>`;
    }
  } else {
    try {
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
    } catch (e) {
      app.innerHTML = `<div class="card"><h2>Unable to load scenarios</h2><p class="muted">${escapeHtml(e.message)}</p><p class="muted">Make sure the backend is running and ELEVATE_API_URL is set correctly.</p><p class="muted">API base: ${escapeHtml(apiBase())}</p></div>`;
    }
  }
}

async function onChoice(scenarioId, choiceIndex) {
  const started = Date.now();
  const timeTaken = Math.max(1, Math.round((Date.now() - started) / 1000));
  try {
    const result = await submitChoice(scenarioId, parseInt(choiceIndex, 10), timeTaken);
    // Clear the page only once the feedback is in hand, so a failed request
    // leaves the scenario on screen instead of a blank one.
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
        userName: "Guest User",
      });
    });
  } catch (e) {
    app.innerHTML = `<div class="card"><h2>Unable to submit your response</h2><p class="muted">${escapeHtml(e.message)}</p><a href="#/scenarios/${escapeHtml(scenarioId)}" class="btn ghost">Back to the scenario</a></div>`;
  }
}

// ---------------------------------------------------------------------------
// Interview practice flow
// ---------------------------------------------------------------------------

// The live session (answers, recognizer, timers) lives here rather than in the
// URL, so a stray refresh starts a clean session instead of a half-loaded one.
let session = null;
let report = null;

function onInterviewStart(jobTitle, jobDescription, mode, questionCount) {
  session = startInterviewSession(jobTitle, jobDescription);
  if (mode) session.mode = mode;
  if (questionCount) session.questions = session.questions.slice(0, questionCount);
  report = null;
  location.hash = "#/interview/practice";
}

function renderPractice() {
  if (!session) { location.hash = "#/interview"; return; }
  app.innerHTML = "";
  app.appendChild(renderInterviewChat(session, (finished) => {
    report = finished;
    session = null;
    location.hash = "#/interview/report";
  }, () => { session = null; location.hash = "#/interview"; }));
}

function renderReport() {
  if (!report) { location.hash = "#/interview"; return; }
  app.innerHTML = "";
  app.appendChild(renderInterviewReport(report));
  wireInterviewReport(app, report, {
    onRestart: () => { report = null; location.hash = "#/interview"; },
  });
}

window.addEventListener("hashchange", () => renderPage(location.hash));
window.addEventListener("load", () => renderPage(location.hash || "#/scenarios"));