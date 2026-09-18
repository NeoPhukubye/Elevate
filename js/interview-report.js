// Elevate frontend — interview report rendering
// Turns the object built by buildReport() into screens the user can read:
// headline score, filler-word breakdown, per-question detail and tips.

import { escapeHtml } from "./app.js";
import { openInterviewPdf } from "./pdf.js";

function meter(label, value, max = 100) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  const tone = pct >= 75 ? "good" : pct >= 50 ? "warn" : "bad";
  return `
    <div class="meter">
      <div class="meter-head"><span>${escapeHtml(label)}</span><strong>${pct}</strong></div>
      <div class="skill-bar"><span class="meter-fill ${tone}" style="width:${pct}%;"></span></div>
    </div>
  `;
}

function kindRow(item, total) {
  const pct = total ? Math.round((item.count / total) * 100) : 0;
  return `
    <div class="kind-row">
      <span class="tag kind-${item.kind}">${escapeHtml(item.label)}</span>
      <span class="kind-count"><strong>${item.count}</strong>×</span>
      <span class="muted kind-pct">${pct}% of fillers</span>
    </div>
  `;
}

function perAnswerCard(answer, index) {
  const { scores, filler, keywordMatch, structure } = answer;
  const topFillers = filler.counts.slice(0, 6);

  return `
    <details class="card answer-card" ${index === 0 ? "open" : ""}>
      <summary>
        <span class="answer-q">Q${index + 1}. ${escapeHtml(answer.question)}</span>
        <span class="answer-score tone-${scores.overall >= 75 ? "good" : scores.overall >= 50 ? "warn" : "bad"}">${scores.overall}</span>
      </summary>

      <div class="answer-body">
        <div class="stat-strip">
          <span class="chip"><strong>${answer.words}</strong> words</span>
          <span class="chip ${filler.total === 0 ? "chip-good" : filler.total > 5 ? "chip-bad" : "chip-warn"}"><strong>${filler.total}</strong> filler${filler.total === 1 ? "" : "s"}</span>
          <span class="chip"><strong>${answer.fillerRate}%</strong> filler rate</span>
          ${answer.speakSeconds > 1
            ? `<span class="chip"><strong>${answer.wpm}</strong> wpm</span><span class="chip"><strong>${answer.speakSeconds}s</strong> speaking</span>`
            : `<span class="chip"><strong>${answer.avgSentence}</strong> words/sentence</span>`}
          <span class="chip ${keywordMatch.used.length ? "chip-good" : "chip-warn"}"><strong>${keywordMatch.used.length}</strong> job keywords</span>
        </div>

        <div class="answer-grid">
          <div>
            <h4 class="mini-head">Filler words in this answer</h4>
            ${topFillers.length
              ? `<div class="chips">${topFillers.map((f) => `<span class="tag filler-tag kind-${f.kind}">${escapeHtml(f.label)} <strong>${f.count}</strong></span>`).join("")}</div>`
              : `<p class="muted">No filler words — clean answer.</p>`}
            ${filler.stutter ? `<p class="muted" style="margin:8px 0 0;">Repeated a word back-to-back <strong>${filler.stutter}</strong>× — a sign of rushing.</p>` : ""}
          </div>
          <div>
            <h4 class="mini-head">What was missing</h4>
            <ul class="check-list">
              <li class="${structure.givesExample ? "yes" : "no"}">${structure.givesExample ? "✓" : "✗"} A specific, real example</li>
              <li class="${structure.explainsHow ? "yes" : "no"}">${structure.explainsHow ? "✓" : "✗"} An action <em>you</em> personally took</li>
              <li class="${structure.givesResult ? "yes" : "no"}">${structure.givesResult ? "✓" : "✗"} A clear outcome</li>
              <li class="${structure.givesNumber ? "yes" : "no"}">${structure.givesNumber ? "✓" : "✗"} A number or measure</li>
            </ul>
          </div>
        </div>

        ${keywordMatch.missed.length
          ? `<p class="muted" style="margin:12px 0 0;">Job keywords not used: ${keywordMatch.missed.slice(0, 8).map((k) => `<span class="tag tag-miss">${escapeHtml(k)}</span>`).join(" ")}</p>`
          : ""}

        ${filler.counts.length
          ? `<p class="muted" style="margin:12px 0 0;">Fix these first: ${filler.counts.slice(0, 4).map((f) => `<span class="tag filler-tag kind-${f.kind}">${escapeHtml(f.label)}</span>`).join(" ")}</p>`
          : ""}
      </div>
    </details>
  `;
}

export function renderInterviewReport(report) {
  const el = document.createElement("div");
  const { totals, perAnswer, keywords, keywordTotals } = report;

  const answered = perAnswer.filter((a) => a.words >= 5);
  const avg = (key) => (answered.length ? Math.round(answered.reduce((s, a) => s + a.scores[key], 0) / answered.length) : 0);

  // Deduplicate tips so the same habit is not repeated across four answers.
  const seen = new Set();
  const tips = report.tips.filter((t) => {
    const key = `${t.kind}:${t.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  el.innerHTML = `
    <div class="report-head">
      <div>
        <p class="eyebrow">Interview report</p>
        <h1 style="margin:0 0 6px;">${escapeHtml(report.jobTitle || "Your interview")}</h1>
        <p class="muted" style="margin:0;">${totals.answered} of ${totals.asked} questions answered · ${totals.words} words${report.hasSpeech && totals.seconds ? ` · ${Math.round(totals.seconds)}s spoken` : ""}</p>
      </div>
      <div class="score-badge">
        <div class="score-number">${report.overall}</div>
        <div class="score-band tone-${report.overall >= 75 ? "good" : report.overall >= 50 ? "warn" : "bad"}">${escapeHtml(report.band)}</div>
        <div class="muted" style="font-size:0.8rem;">out of 100</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <h2 style="margin:0 0 12px;">Summary</h2>
      <p style="margin:0 0 16px;">${escapeHtml(report.summary)}</p>
      <div class="grid two">
        ${meter("Filler control", avg("fillerScore"))}
        ${meter("Answer structure", avg("structureScore"))}
        ${meter("Pace & delivery", avg("paceScore"))}
        ${meter("Job relevance", avg("relevanceScore"))}
      </div>
      <div class="report-actions">
        <button class="btn accent" id="download-report" type="button">Download PDF report</button>
        <button class="btn ghost" id="restart-interview" type="button">Practise again</button>
        <a class="btn ghost" href="#/progress">See my progress</a>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <h2 style="margin:0 0 4px;">Filler words in detail</h2>
      <p class="muted" style="margin:0 0 16px;">
        ${totals.fillers === 0
          ? "You did not use a single filler word. That is rare — hold onto it."
          : `You used <strong>${totals.fillers}</strong> filler terms across ${totals.words} words — <strong>${totals.fillerRate}%</strong> of everything you said.`}
      </p>
      ${totals.byKind.length ? `<div class="kinds">${totals.byKind.map((k) => kindRow(k, totals.fillers)).join("")}</div>` : ""}
      ${totals.fillerCounts.length
        ? `<h3 class="mini-head" style="margin-top:20px;">Your worst habits, most-used first</h3>
           <div class="habit-table">
             ${totals.fillerCounts.slice(0, 12).map((f) => `
               <div class="habit-row">
                 <span class="tag filler-tag kind-${f.kind}">${escapeHtml(f.label)}</span>
                 <span class="habit-bar"><span style="width:${Math.round((f.count / totals.fillerCounts[0].count) * 100)}%;"></span></span>
                 <strong>${f.count}×</strong>
               </div>`).join("")}
           </div>`
        : ""}
      ${totals.stutter ? `<p class="muted" style="margin:12px 0 0;">You also repeated a word immediately after itself ${totals.stutter} time${totals.stutter === 1 ? "" : "s"} — usually a sign of speaking faster than you are thinking.</p>` : ""}
    </div>

    <div class="card" style="margin-bottom:20px;">
      <h2 style="margin:0 0 4px;">Did you sound like the job?</h2>
      <p class="muted" style="margin:0 0 16px;">These are the words the job description leans on most. Interviewers listen for their own language back.</p>
      <h3 class="mini-head">Used (${keywordTotals.used.length} of ${keywords.length})</h3>
      <div class="chips">
        ${keywordTotals.used.length
          ? keywordTotals.used.map((k) => `<span class="tag tag-hit">${escapeHtml(k)}</span>`).join("")
          : `<span class="muted">None yet.</span>`}
      </div>
      <h3 class="mini-head" style="margin-top:16px;">Missed (${keywordTotals.missed.length})</h3>
      <div class="chips">
        ${keywordTotals.missed.length
          ? keywordTotals.missed.map((k) => `<span class="tag tag-miss">${escapeHtml(k)}</span>`).join("")
          : `<span class="muted">Nothing missed — you covered the whole advert.</span>`}
      </div>
      ${report.highlights.length ? `
        <h3 class="mini-head" style="margin-top:20px;">What you proved</h3>
        <div class="kinds">
          ${report.highlights.map((h) => `
            <div class="kind-row">
              <span class="tag kind-crutch">${escapeHtml(h.skill)}</span>
              <span class="muted">${h.evidence.length ? escapeHtml(h.evidence.join(", ")) : "implied by the advert"}</span>
            </div>`).join("")}
        </div>` : ""}
    </div>

    <div class="card" style="margin-bottom:20px;">
      <h2 style="margin:0 0 4px;">Tips to fix next time</h2>
      <p class="muted" style="margin:0 0 16px;">Ordered by what will move your score the most.</p>
      <div class="tips">
        ${tips.map((t) => `
          <div class="tip tip-${t.kind}">
            <div class="tip-title">${escapeHtml(t.title)}</div>
            <div class="tip-body">${escapeHtml(t.body)}</div>
          </div>`).join("")}
      </div>
    </div>

    <div class="card">
      <h2 style="margin:0 0 4px;">Your answers, question by question</h2>
      <p class="muted" style="margin:0 0 16px;">Filler words are highlighted directly in your transcript so you can see exactly where they landed.</p>
      ${perAnswer.map((a, i) => perAnswerCard(a, i)).join("")}
    </div>

    <p class="muted" style="margin:20px 0 0;font-size:0.85rem;">This report was generated in your browser from the text you spoke or typed. No audio is recorded or uploaded.</p>
  `;

  return el;
}

/** Attach the report's buttons — kept separate so renderInterviewReport stays pure. */
export function wireInterviewReport(root, report, { onRestart } = {}) {
  const download = root.querySelector("#download-report");
  if (download) {
    const slug = (report.jobTitle || "report")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "report";
    download.addEventListener("click", () => {
      openInterviewPdf(report, `elevate-interview-${slug}.pdf`);
    });
  }
  const restart = root.querySelector("#restart-interview");
  if (restart) {
    restart.addEventListener("click", () => {
      if (typeof onRestart === "function") onRestart();
      else location.hash = "#/interview";
    });
  }
}
