// Elevate frontend — interview practice UI (form + live session)
// The "chat" is a static interview loop: one question at a time, answered by
// speaking (Web Speech API) or typing, then a live ticker of the metrics the
// report will be built from.

import { escapeHtml } from "./app.js";
import {
  buildQuestions, createRecognizer, speechSupported, detectFillers, splitSentences, buildReport,
} from "./interview.js";

// Shown in the live bubbles so the transcript on screen is easy to scan.

// The advert and the candidate's answers are the only state that matters.
// Everything else (scores, keywords, tips) is derived in the report.
export function startInterviewSession(jobTitle, jobDescription) {
  return {
    jobTitle: (jobTitle || "").trim(),
    jobDescription: (jobDescription || "").trim(),
    questions: buildQuestions(jobTitle, jobDescription),
    index: 0,
    answers: [],
    mode: speechSupported() ? "speak" : "type",
    supported: speechSupported(),
  };
}

// ---------------------------------------------------------------------------
// Screen 1 — job + description
// ---------------------------------------------------------------------------

export function renderInterviewForm(onStart) {
  const el = document.createElement("div");
  const canSpeak = speechSupported();

  el.innerHTML = `
    <h1 style="margin:0 0 6px;">Interview practice</h1>
    <p class="lead" style="margin:0 0 24px;">Tell us the job you are going for and paste the job description. You will answer a few interview questions, then get a report on your filler words, pace, answer structure and how well you matched the role.</p>
    <form class="card" id="interview-form" novalidate>
      <h2 style="margin:0 0 8px;">1. The job you want</h2>
      <label class="field">
        <span class="field-label">Job title</span>
        <input type="text" id="job-title" name="jobTitle" placeholder="e.g. Junior Data Analyst" autocomplete="off" required />
      </label>
      <label class="field">
        <span class="field-label">Job description</span>
        <span class="field-hint">Paste the advert. We pull the keywords out of it and check whether your answers use them.</span>
        <textarea id="job-description" name="jobDescription" rows="9" placeholder="Paste the advert or describe the role, the tasks and the skills they are asking for."></textarea>
      </label>
      <div class="field">
        <span class="field-label">How do you want to answer?</span>
        <div class="mode-choice" role="radiogroup" aria-label="Answer mode">
          <label class="mode ${canSpeak ? "" : "mode-off"}">
            <input type="radio" name="mode" value="speak" ${canSpeak ? "checked" : "disabled"} />
            <span>
              <strong>Speak out loud</strong>
              <span class="field-hint">${canSpeak
                ? "Uses your microphone and transcribes you live. The most realistic option."
                : "Not available in this browser — Chrome, Edge or Safari support it. Type instead."}</span>
            </span>
          </label>
          <label class="mode">
            <input type="radio" name="mode" value="type" ${canSpeak ? "" : "checked"} />
            <span>
              <strong>Type my answers</strong>
              <span class="field-hint">Works everywhere. Still scores filler words, structure and keyword match.</span>
            </span>
          </label>
        </div>
      </div>
      <div class="field">
        <span class="field-label">How many questions?</span>
        <select id="question-count">
          <option value="3">3 — quick practice (about 5 minutes)</option>
          <option value="4" selected>4 — balanced (about 8 minutes)</option>
          <option value="6">6 — full interview (about 12 minutes)</option>
        </select>
      </div>
      <div class="form-error muted" id="form-error" role="alert" hidden></div>
      <div class="form-actions">
        <button type="submit" class="btn">Start the interview</button>
        <a class="btn ghost" href="#/scenarios">Try a workplace scenario instead</a>
      </div>
    </form>
    <div class="card" style="margin-top:16px;">
      <h3 style="margin:0 0 8px;">What the report measures</h3>
      <ul class="plain-list">
        <li><strong>Filler words</strong> — every “um”, “like”, “basically” and “kind of”, counted, highlighted in your transcript, with a replacement for each habit.</li>
        <li><strong>Pace</strong> — words per minute when you speak, sentence length when you type.</li>
        <li><strong>Answer structure</strong> — did you give a real example, an action you personally took, and an outcome with a number in it?</li>
        <li><strong>Job match</strong> — how many of the job description's own keywords appeared in your answers.</li>
      </ul>
      <p class="muted" style="margin:12px 0 0;">Nothing is uploaded. Your answers stay in this browser tab.</p>
    </div>
  `;

  el.querySelector("#interview-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const jobTitle = el.querySelector("#job-title").value.trim();
    const jobDescription = el.querySelector("#job-description").value.trim();
    const mode = el.querySelector('input[name="mode"]:checked')?.value || "type";
    const count = Number(el.querySelector("#question-count").value) || 4;

    const error = el.querySelector("#form-error");
    if (!jobTitle) {
      error.hidden = false;
      error.textContent = "Add the job title first — the questions are written around it.";
      el.querySelector("#job-title").focus();
      return;
    }
    if (jobDescription.length < 40) {
      error.hidden = false;
      error.textContent = "Paste a bit more of the job description (at least a sentence or two) so we can match your answers against it. If you do not have the advert, describe the role and the skills it needs.";
      el.querySelector("#job-description").focus();
      return;
    }
    error.hidden = true;

    onStart(jobTitle, jobDescription, mode, count);
  });

  return el;
}

// ---------------------------------------------------------------------------
// Screen 2 — the interview itself
// ---------------------------------------------------------------------------

export function renderInterviewChat(session, onFinish, onExit) {
  const el = document.createElement("div");

  // The question set is fixed at the start so the count cannot shift mid-way.
  session.questions = session.questions.slice(0, session.questionCount || session.questions.length);

  el.innerHTML = `
    <div class="chat-head">
      <div>
        <h1 style="margin:0 0 4px;">Mock interview: ${escapeHtml(session.jobTitle)}</h1>
        <p class="muted" style="margin:0;">Question <span id="q-progress">1 of ${session.questions.length}</span></p>
      </div>
      <button class="btn ghost" id="exit-interview" type="button">End and see report</button>
    </div>
    <div class="progress-dots" id="progress-dots"></div>
    <div class="chat" id="chat"></div>
    <div class="card composer" id="composer">
      <div class="composer-label" id="answer-label">Your answer</div>
      <div class="speak-row" id="speak-row">
        <span class="mic-dot" id="mic-dot" aria-hidden="true"></span>
        <span id="mic-status" class="muted">Not recording</span>
        <span class="timer" id="timer" aria-hidden="true">0:00</span>
      </div>
      <div class="live-metrics" id="live-metrics"></div>
      <textarea id="answer-input" rows="4" placeholder="Type your answer here…" aria-labelledby="answer-label"></textarea>
      <div class="composer-actions">
        <button class="btn" id="submit-answer" type="button">Send answer</button>
        <button class="btn ghost" id="skip-answer" type="button">Skip this question</button>
      </div>
    </div>
  `;

  const chat = el.querySelector("#chat");
  const input = el.querySelector("#answer-input");
  const micRow = el.querySelector("#speak-row");
  const micDot = el.querySelector("#mic-dot");
  const micStatus = el.querySelector("#mic-status");
  const timerEl = el.querySelector("#timer");
  const liveMetrics = el.querySelector("#live-metrics");
  const dots = el.querySelector("#progress-dots");

  const speaking = session.mode === "speak" && session.supported;
  let recognizer = null;
  let interimText = "";
  let startedAt = 0;
  let ticker = null;

  if (!speaking) {
    micRow.hidden = true;
    input.placeholder = "Type your answer as you would say it out loud…";
  }

  // --- transcript display -------------------------------------------------
  function renderDots() {
    dots.innerHTML = session.questions.map((_, i) => {
      const done = i < session.answers.length;
      const current = i === session.index;
      const cls = done ? "done" : current ? "current" : "";
      return `<span class="dot ${cls}" title="Question ${i + 1}"></span>`;
    }).join("");
  }

  function addBubble(who, html, extraClass = "") {
    const bubble = document.createElement("div");
    bubble.className = `bubble ${who} ${extraClass}`;
    bubble.innerHTML = `<div class="bubble-who">${who === "interviewer" ? "Interviewer" : "You"}</div><div class="bubble-body">${html}</div>`;
    chat.appendChild(bubble);
    bubble.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return bubble;
  }

  function askQuestion() {
    const question = session.questions[session.index];
    addBubble("interviewer", escapeHtml(question.text));
    input.value = "";
    interimText = "";
    if (recognizer) recognizer.reset();
    syncInputFromRecognition();
    el.querySelector("#q-progress").textContent = `${session.index + 1} of ${session.questions.length}`;
    input.focus();
  }

  // --- speech -------------------------------------------------------------
  function syncInputFromRecognition() {
    if (recognizer) {
      // Final text plus whatever the recogniser is mid-way through.
      input.value = `${recognizer.text}${interimText}`.trim();
    }
    updateLiveMetrics();
  }

  function updateLiveMetrics() {
    const text = input.value.trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    const seconds = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;
    const filler = detectFillers(text);
    const sentences = splitSentences(text).length;
    const rate = words ? Math.round((filler.total / words) * 1000) / 10 : 0;

    const chips = [
      { label: "words", value: String(words) },
      { label: "filler words", value: String(filler.total), tone: filler.total === 0 ? "good" : filler.total > 5 ? "bad" : "warn" },
      { label: "filler rate", value: `${rate}%`, tone: rate <= 2 ? "good" : rate <= 6 ? "warn" : "bad" },
      { label: "sentences", value: String(sentences) },
    ];
    if (seconds) chips.push({ label: "time", value: `${seconds}s` });

    liveMetrics.innerHTML = chips.map((c) =>
      `<span class="chip ${c.tone ? "chip-" + c.tone : ""}"><strong>${escapeHtml(c.value)}</strong> ${escapeHtml(c.label)}</span>`,
    ).join("");
  }

  function startTimer() {
    startedAt = Date.now();
    ticker = setInterval(() => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      timerEl.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
      updateLiveMetrics();
    }, 1000);
  }

  function stopTimer() {
    if (ticker) { clearInterval(ticker); ticker = null; }
    return startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 1000)) : 0;
  }

  function startRecording() {
    if (!speaking || !recognizer) return;
    try {
      recognizer.start();
      micDot.classList.add("on");
      micStatus.textContent = "Listening — speak your answer";
    } catch {
      micStatus.textContent = "Microphone is already running";
    }
  }

  function startRecognizer() {
    recognizer = createRecognizer(
      (_finalText, interim) => { interimText = interim; syncInputFromRecognition(); },
      (err) => {
        micStatus.textContent = err === "not-allowed"
          ? "Microphone blocked — type your answer instead"
          : `Speech input stopped (${err}) — you can type instead`;
        micDot.classList.remove("on");
      },
    );

    if (!recognizer) return;
    micRow.hidden = false;
    startRecording();
    startTimer();
  }

  // --- submitting ---------------------------------------------------------
  function submitAnswer(skipped = false) {
    const question = session.questions[session.index];
    const transcript = skipped ? "" : input.value.trim();

    if (!skipped && !transcript) {
      input.focus();
      input.classList.add("shake");
      setTimeout(() => input.classList.remove("shake"), 500);
      return;
    }

    const seconds = skipped ? 0 : stopTimer();
    if (recognizer) {
      recognizer.stop();
      micDot.classList.remove("on");
      micStatus.textContent = "Not recording";
    }

    session.answers.push({
      question: question.text,
      transcript,
      speakSeconds: speaking ? seconds : 0,
      skipped,
    });

    addBubble("you", transcript
      ? escapeHtml(transcript)
      : `<em class="muted">(skipped${speaking ? "" : " — no answer given"})</em>`,
      transcript ? "" : "bubble-empty");

    input.value = "";
    interimText = "";
    if (recognizer) recognizer.reset();
    renderDots();
    session.index += 1;
    updateLiveMetrics();

    if (session.index >= session.questions.length) {
      finish();
      return;
    }
    askQuestion();
    if (speaking) { startedAt = 0; startRecording(); startTimer(); }
  }

  function finish() {
    stopTimer();
    if (recognizer) { recognizer.stop(); recognizer = null; }
    chat.querySelectorAll(".bubble").forEach((b) => b.classList.add("bubble-faded"));
    const finished = buildReport(session.jobTitle, session.jobDescription, session.answers);
    const total = session.answers.reduce((sum, a) => sum + a.transcript.split(/\s+/).filter(Boolean).length, 0);
    addBubble("interviewer", `Thank you — that is the end of the interview. <strong>${total} words</strong> captured across ${session.answers.length} answers. Your report is ready.`);
    el.querySelector("#composer").hidden = true;
    setTimeout(() => onFinish(finished), 700);
  }

  // --- wiring -------------------------------------------------------------
  el.querySelector("#submit-answer").addEventListener("click", () => submitAnswer(false));
  el.querySelector("#skip-answer").addEventListener("click", () => submitAnswer(true));
  el.querySelector("#exit-interview").addEventListener("click", () => {
    stopTimer();
    if (recognizer) { recognizer.stop(); recognizer = null; }
    if (session.answers.length) finish();
    else onExit();
  });
  input.addEventListener("input", updateLiveMetrics);
  // Enter sends; Shift+Enter starts a new line.
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitAnswer(false);
    }
  });

  renderDots();
  askQuestion();
  updateLiveMetrics();
  input.focus();
  if (speaking) startRecognizer();

  return el;
}
