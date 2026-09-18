// Elevate frontend — router + entry point
import { currentUser } from "./auth.js";
import { loadScenarios, renderScenarioCard, renderScenarioDetail, submitChoice, renderFeedback } from "./scenarios.js";
import { renderDashboard, loadProgress, loadSkills } from "./dashboard.js";
import { escapeHtml, store } from "./app.js";

const app = document.getElementById("app");

function nav() {
  if (!currentUser.user) return "";
  return `
    <nav class="links">
      <a href="#/scenarios">Scenarios</a>
      <a href="#/progress">Progress</a>
      <a href="#/profile">Profile</a>
      <button class="btn ghost" id="logout">Logout</button>
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
  if (!currentUser.user) {
    renderAuth();
    return;
  }
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
    const heading = document.createElement("h1");
    heading.textContent = "Explore career scenarios";
    app.appendChild(heading);
    const sub = document.createElement("p");
    sub.className = "muted";
    sub.textContent = "Practise realistic workplace situations in a safe environment.";
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
  app.appendChild(renderFeedback(result.feedback));
  const retry = app.querySelector("[data-retry]");
  if (retry) retry.addEventListener("click", () => { location.hash = "#/scenarios/" + scenarioId; });
}

function renderAuth() {
  app.innerHTML = `
    <div style="max-width:480px;margin:40px auto;">
      <h1 style="margin:0 0 6px;">Welcome to Elevate</h1>
      <p class="muted" style="margin:0 0 24px;">A workforce-readiness companion that helps young people bridge the gap between education and employment.</p>
      <div class="card" style="margin-bottom:16px;">
        <h2 style="margin:0 0 14px;">Sign in</h2>
        <form id="login-form" style="display:flex;flex-direction:column;gap:10px;">
          <input id="login-email" type="email" placeholder="Email" required style="padding:10px;border:1px solid var(--border);border-radius:8px;" />
          <input id="login-password" type="password" placeholder="Password" required style="padding:10px;border:1px solid var(--border);border-radius:8px;" />
          <button type="submit" class="btn">Sign in</button>
        </form>
        <p id="login-error" class="muted" style="color:var(--danger);margin:10px 0 0;"></p>
      </div>
      <div class="card">
        <h2 style="margin:0 0 14px;">Create account</h2>
        <form id="register-form" style="display:flex;flex-direction:column;gap:10px;">
          <input id="reg-email" type="email" placeholder="Email" required style="padding:10px;border:1px solid var(--border);border-radius:8px;" />
          <input id="reg-password" type="password" placeholder="Password (min 8 characters)" required style="padding:10px;border:1px solid var(--border);border-radius:8px;" />
          <input id="reg-name" type="text" placeholder="Display name (optional)" style="padding:10px;border:1px solid var(--border);border-radius:8px;" />
          <button type="submit" class="btn secondary">Create account</button>
        </form>
        <p id="reg-error" class="muted" style="color:var(--danger);margin:10px 0 0;"></p>
      </div>
    </div>
  `;

  const loginForm = app.querySelector("#login-form");
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = app.querySelector("#login-error");
    err.textContent = "";
    try {
      await currentUser.login(loginForm["login-email"].value, loginForm["login-password"].value);
      renderPage(location.hash || "#/scenarios");
    } catch (err2) {
      err.textContent = err2.message;
    }
  });

  const regForm = app.querySelector("#register-form");
  regForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = app.querySelector("#reg-error");
    err.textContent = "";
    try {
      await currentUser.register(regForm["reg-email"].value, regForm["reg-password"].value, regForm["reg-name"].value);
      renderPage(location.hash || "#/scenarios");
    } catch (err2) {
      err.textContent = err2.message;
    }
  });
}

window.addEventListener("hashchange", () => renderPage(location.hash));
window.addEventListener("load", async () => {
  await currentUser.load();
  if (currentUser.user) renderNav();
  renderPage(location.hash || "#/scenarios");
});
