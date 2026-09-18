// Elevate frontend — job interview practice
// The user types the job they want and its description, answers the questions,
// and gets a report: filler words, pace, answer structure and keyword match
// against the job description, plus tips.
//
// Two ways to answer:
//   * Mode 1 (speaking) uses the Web Speech API (Chrome/Edge/Safari) and listens
//     for real, so filler words are caught live in the transcript.
//   * Mode 2 (typing) works everywhere, including from file:// or offline, and
//     analyses exactly the same way.
//
// Both modes run through the same analyseAnswer(), so the report is consistent.

import { escapeHtml } from "./app.js";

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

const FILLERS = [
  { word: "um", label: "um", kind: "filler" },
  { word: "uh", label: "uh", kind: "filler" },
  { word: "er", label: "er", kind: "filler" },
  { word: "erm", label: "erm", kind: "filler" },
  { word: "hmm", label: "hmm", kind: "filler" },
  { word: "mmm", label: "mmm", kind: "filler" },
  { word: "uhh", label: "uhh", kind: "filler" },
  { word: "umm", label: "umm", kind: "filler" },
  { word: "like", label: "like", kind: "crutch" },
  { word: "basically", label: "basically", kind: "crutch" },
  { word: "actually", label: "actually", kind: "crutch" },
  { word: "literally", label: "literally", kind: "crutch" },
  { word: "honestly", label: "honestly", kind: "crutch" },
  { word: "obviously", label: "obviously", kind: "crutch" },
  { word: "just", label: "just", kind: "crutch" },
  { word: "stuff", label: "stuff", kind: "vague" },
  { word: "things", label: "things", kind: "vague" },
  { word: "whatever", label: "whatever", kind: "vague" },
  { word: "etc", label: "etc.", kind: "vague" },
  { word: "kind", label: "kind of", kind: "hedge", phrase: ["kind", "of"] },
  { word: "sort", label: "sort of", kind: "hedge", phrase: ["sort", "of"] },
  { word: "maybe", label: "maybe", kind: "hedge" },
  { word: "probably", label: "probably", kind: "hedge" },
  { word: "guess", label: "I guess", kind: "hedge", phrase: ["i", "guess"] },
  { word: "suppose", label: "I suppose", kind: "hedge", phrase: ["i", "suppose"] },
  { word: "think", label: "I think", kind: "hedge", phrase: ["i", "think"] },
  { word: "know", label: "you know", kind: "crutch", phrase: ["you", "know"] },
  { word: "mean", label: "I mean", kind: "crutch", phrase: ["i", "mean"] },
  { word: "whatever", label: "or whatever", kind: "vague", phrase: ["or", "whatever"] },
];

const KIND_LABELS = {
  filler: "Filler sounds",
  crutch: "Filler / crutch words",
  hedge: "Hedging words",
  vague: "Vague words",
};

const KIND_HELP = {
  filler: "Filler sounds carry no meaning. A short silent pause sounds far more confident than “um”.",
  crutch: "Crutch words like “like”, “just” and “basically” creep in when you are thinking out loud. Cut them and the sentence gets sharper.",
  hedge: "Hedging (“I think”, “kind of”, “maybe”) makes your claim sound uncertain. Say what you did, not what you think you did.",
  vague: "Vague words (“stuff”, “things”, “etc.”) hide the detail an interviewer is listening for. Name the actual thing.",
};

// Words an interviewer expects to hear that are not part of the job description,
// so the keyword match still has something to work with on a thin advert.
const DEFAULT_KEYWORDS = {
  communication: ["communicat", "explain", "listen", "clarif", "stakeholder", "present"],
  teamwork: ["team", "collaborat", "together", "support", "share", "colleague"],
  problemSolving: ["problem", "solved", "solution", "fix", "improve", "resolved", "issue"],
  ownership: ["led", "took", "own", "responsible", "delivered", "managed", "organis"],
  results: ["result", "increased", "reduced", "improved", "achieved", "delivered", "saved"],
  adaptability: ["learn", "adapt", "new", "quickly", "change", "picked"],
};

const SKILL_LABELS = {
  communication: "Communication",
  teamwork: "Teamwork",
  problemSolving: "Problem solving",
  ownership: "Ownership",
  results: "Results & impact",
  adaptability: "Adaptability",
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "the", "and", "for", "you", "your", "with", "that", "this", "from", "will", "are", "our", "who",
  "have", "has", "was", "were", "been", "able", "into", "them", "they", "their", "his", "her", "its",
  "a", "an", "of", "to", "in", "on", "at", "by", "as", "is", "be", "or", "if", "it", "we", "us",
  "job", "role", "work", "working", "want", "wants", "need", "needs", "must", "should", "can", "able",
  "plus", "etc", "well", "good", "great", "also", "more", "most", "very", "any", "all", "own", "new",
  "about", "across", "within", "using", "use", "used", "you'll", "you're", "we're", "our", "day",
  "days", "time", "full", "part", "per", "year", "years", "month", "months", "week", "weeks",
]);

export function splitSentences(text) {
  return String(text || "")
    // A few abbreviations and courtesy titles would otherwise split a sentence.
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|etc|e\.g|i\.e)\./gi, "$1<DOT>")
    .split(/[.!?]+(?=\s|$)/)
    .map((s) => s.replace(/<DOT>/g, ".").trim())
    .filter((s) => s.length > 0);
}

export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    // Keep apostrophes inside words so "you're" stays one token.
    .replace(/[^a-z0-9'\s]+/g, " ")
    .replace(/'+/g, "'")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter(Boolean);
}

function countWords(text) {
  return tokenize(text).length;
}

function stutterCount(tokens) {
  let count = 0;
  for (let i = 1; i < tokens.length; i += 1) {
    if (tokens[i].length > 1 && tokens[i] === tokens[i - 1]) count += 1;
  }
  return count;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function mean(list) {
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
}

// ---------------------------------------------------------------------------
// Filler detection
// ---------------------------------------------------------------------------

/**
 * Find every filler / hedge / vague term in a transcript.
 * Multi-word entries are matched as phrases, and a word is only ever counted
 * once so "kind of" does not also read as a stray "kind".
 */
export function detectFillers(text) {
  const tokens = tokenize(text);
  const raw = String(text || "");
  const hits = [];
  const consumed = new Set();

  for (const entry of FILLERS) {
    const phrase = entry.phrase || null;

    if (phrase) {
      for (let i = 0; i + phrase.length <= tokens.length; i += 1) {
        let match = true;
        for (let j = 0; j < phrase.length; j += 1) {
          if (tokens[i + j] !== phrase[j]) { match = false; break; }
        }
        if (!match) continue;
        if (Array.from({ length: phrase.length }, (_, j) => i + j).some((k) => consumed.has(k))) continue;
        for (let j = 0; j < phrase.length; j += 1) consumed.add(i + j);
        hits.push({ label: entry.label, kind: entry.kind, index: i });
      }
      continue;
    }

    tokens.forEach((token, i) => {
      if (consumed.has(i)) return;
      if (token !== entry.word) return;
      // "like" as a verb/preposition reads the same as filler, so it is flagged
      // either way — the point is to notice the habit, not to be a grammar tool.
      consumed.add(i);
      hits.push({ label: entry.label, kind: entry.kind, index: i });
    });
  }

  hits.sort((a, b) => a.index - b.index);

  const counts = new Map();
  for (const hit of hits) {
    const current = counts.get(hit.label) || { label: hit.label, kind: hit.kind, count: 0 };
    current.count += 1;
    counts.set(hit.label, current);
  }

  // Keep the text readable in the report: strip the long job/role preamble so
  // the first tokens line up with the first words the user actually said.
  const spoken = stripPreamble(raw);
  const spans = [];
  for (const hit of hits) {
    const token = tokens[hit.index];
    const at = findTokenPosition(spoken, token);
    if (at >= 0) spans.push({ start: at, end: at + token.length, kind: hit.kind });
  }

  return {
    total: hits.length,
    wordCount: tokens.length,
    stutter: stutterCount(tokens),
    counts: Array.from(counts.values()).sort((a, b) => b.count - a.count),
    spans: mergeSpans(spans),
  };
}

// The transcript begins with a preamble ("I am interviewing for the X role...")
// which the user never spoke. Filler detection still runs over it harmlessly,
// but highlighting should start at the answer itself.
function stripPreamble(text) {
  const marker = "role.";
  const at = text.toLowerCase().indexOf(marker);
  if (at === -1 || at > 400) return text;
  return text.slice(at + marker.length).trim();
}

function findTokenPosition(text, token, from = 0) {
  const lower = text.toLowerCase();
  const re = new RegExp(`(^|[^a-z0-9'])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9'])`, "g");
  re.lastIndex = from;
  const match = re.exec(lower);
  return match ? match.index + (match[1] ? match[1].length : 0) : -1;
}

function mergeSpans(spans) {
  const sorted = spans.slice().sort((a, b) => a.start - b.start);
  const merged = [];
  for (const span of sorted) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end);
      if (span.kind === "filler") last.kind = "filler";
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

// Wrap the detected terms so the transcript can show them highlighted.
export function highlightFillers(text) {
  const raw = String(text || "");
  const { spans } = detectFillers(raw);
  if (!spans.length) return escapeHtml(raw);
  let out = "";
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue;
    out += escapeHtml(raw.slice(cursor, span.start));
    out += `<mark class="fill-mark fill-${span.kind}">${escapeHtml(raw.slice(span.start, span.end))}</mark>`;
    cursor = span.end;
  }
  out += escapeHtml(raw.slice(cursor));
  return out;
}

// ---------------------------------------------------------------------------
// Job description keywords
// ---------------------------------------------------------------------------

/** Pull the terms an advert actually asks for, most-mentioned first. */
export function keywordsFromJob(jobDescription, jobTitle = "") {
  const counts = new Map();
  const add = (term) => {
    const cleaned = term.trim();
    if (cleaned.length < 3 || STOP_WORDS.has(cleaned)) return;
    if (/^\d+$/.test(cleaned)) return;
    const current = counts.get(cleaned) || 0;
    counts.set(cleaned, current + 1);
  };

  for (const token of tokenize(`${jobTitle} ${jobDescription}`)) add(token);

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 14)
    .map(([term, count]) => ({ term, count }));
}

/** Which of those terms the answer actually used (with a light stem match). */
export function matchKeywords(keywords, answerText) {
  const answerTokens = new Set(tokenize(answerText));
  const used = [];
  const missed = [];

  for (const keyword of keywords) {
    const term = keyword.term;
    const stem = term.replace(/(ing|ed|es|s)$/, "");
    const found = answerTokens.has(term) || (stem.length >= 4 && Array.from(answerTokens).some((t) => t.startsWith(stem)));
    (found ? used : missed).push(term);
  }

  return { used, missed, ratio: keywords.length ? used.length / keywords.length : 0 };
}

// ---------------------------------------------------------------------------
// Answer structure
// ---------------------------------------------------------------------------

function structureSignals(answerText, question) {
  const sentences = splitSentences(answerText);
  const lower = String(answerText || "").toLowerCase();
  const questionWords = new Set(tokenize(question));

  const topicWords = tokenize(answerText).filter((w) => questionWords.has(w) && w.length > 3);
  const repeatsQuestion = topicWords.length >= 2;

  const ownVerb = /\b(i|we)\b[^.]*\b(did|built|led|ran|made|handled|created|delivered|organised|organized|managed|worked|learned|learnt|fixed|solved|took|set)\b/.test(lower);
  const wasVerb = /\b(i|we)\s+(was|were|am|are)\s+(responsible|tasked|asked|told|in charge)\b/.test(lower);

  const example = /\b(for example|for instance|such as|at my|in my|last year|once|when i|one time|during)\b/.test(lower);
  const result = /\b(as a result|so that|which meant|the result|we ended up|and it|therefore|because of that|outcome)\b/.test(lower);
  const number = /\b\d+([.,]\d+)?\s*(%|percent|people|students|customers|hours|days|weeks|months|rand|dollars|r\b)?\b/.test(lower);

  const firstPerson = (lower.match(/\b(i|my|me|we|our)\b/g) || []).length > 0;

  return {
    sentences,
    wordCount: countWords(answerText),
    opensWithAnswer: repeatsQuestion,
    explainsHow: ownVerb,
    borrower: wasVerb,
    givesExample: example,
    givesResult: result,
    givesNumber: number,
    firstPerson,
  };
}

// ---------------------------------------------------------------------------
// Metrics + scoring
// ---------------------------------------------------------------------------

export function analyseAnswer(question, answerText, speakSeconds = 0) {
  const raw = String(answerText || "").trim();
  const words = countWords(raw);
  const filler = detectFillers(raw);
  const sentences = splitSentences(raw);

  // Pace. With no measured speaking time (typed answers) we judge sentence
  // length instead, which is the same problem from a different angle.
  const minutes = speakSeconds > 1 ? speakSeconds / 60 : 0;
  const wpm = minutes ? words / minutes : 0;
  const avgSentence = sentences.length ? words / sentences.length : 0;

  const fillerRate = words ? (filler.total / words) * 100 : 0;

  return {
    question,
    transcript: raw,
    words,
    sentences: sentences.length,
    speakSeconds,
    wpm: round(wpm),
    avgSentence: round(avgSentence),
    filler,
    fillerRate: round(fillerRate),
    structure: structureSignals(raw, question),
  };
}

/**
 * Turn the raw metrics into scores (0-100) that are explainable: every score
 * carries the evidence that produced it, so the report can justify itself.
 */
export function scoreAnswer(metrics, keywordMatch) {
  const notes = [];
  const { words, filler, fillerRate, structure, avgSentence, wpm } = metrics;

  // 1. Filler control ------------------------------------------------------
  let fillerScore;
  if (words < 10) {
    fillerScore = 45;
    notes.push("There was not much to judge — an answer needs 40+ words before a pace or filler score means anything.");
  } else if (fillerRate <= 1) {
    fillerScore = 95;
    notes.push(`Only ${filler.total} filler term${filler.total === 1 ? "" : "s"} in ${words} words (${fillerRate}%). That is clean, controlled speech.`);
  } else if (fillerRate <= 3) {
    fillerScore = 78;
    notes.push(`${filler.total} filler terms in ${words} words (${fillerRate}%). Noticeable but not distracting — trim the top one and this is a strong answer.`);
  } else if (fillerRate <= 6) {
    fillerScore = 58;
    notes.push(`${filler.total} filler terms in ${words} words (${fillerRate}%). The habit is showing; an interviewer will start hearing the fillers instead of the content.`);
  } else {
    fillerScore = 35;
    notes.push(`${filler.total} filler terms in ${words} words (${fillerRate}%). Filler is dominating the answer. Pause silently instead of filling the gap.`);
  }
  if (filler.stutter) {
    fillerScore -= Math.min(12, filler.stutter * 3);
    notes.push(`You repeated a word ${filler.stutter} time${filler.stutter === 1 ? "" : "s"} in a row — a classic sign of rushing. Slow down a beat before the point.`);
  }
  fillerScore = Math.max(0, Math.min(100, Math.round(fillerScore)));

  // 2. Structure and substance --------------------------------------------
  let structureScore = 40;
  if (structure.opensWithAnswer) { structureScore += 15; }
  if (structure.explainsHow) { structureScore += 15; }
  else if (structure.borrower) { structureScore -= 15; notes.push("“I was responsible for…” describes the job, not you. Lead with the action you personally took."); }
  if (structure.givesExample) { structureScore += 10; }
  if (structure.givesResult) { structureScore += 10; }
  if (structure.givesNumber) { structureScore += 10; }
  if (structure.sentences >= 3) { structureScore += 5; }
  if (words < 40) { structureScore -= 20; notes.push("The answer is very short. Interviewers read brevity as low confidence — add the situation and the outcome."); }
  if (words > 320) { structureScore -= 10; notes.push(`${words} words is long for one answer. Keep the story under about 250 words.`); }
  structureScore = Math.max(0, Math.min(100, Math.round(structureScore)));

  // 3. Pace / delivery -----------------------------------------------------
  let paceScore;
  if (metrics.speakSeconds > 1) {
    if (wpm >= 110 && wpm <= 165) { paceScore = 92; notes.push(`You spoke at about ${wpm} words per minute — a comfortable, easy-to-follow pace.`); }
    else if (wpm < 110) { paceScore = 68; notes.push(`About ${wpm} words per minute is slow enough that the interviewer may fill the silence. Push the pace slightly.`); }
    else if (wpm <= 195) { paceScore = 65; notes.push(`About ${wpm} words per minute is quick. Breathe between sentences so the key point lands.`); }
    else { paceScore = 40; notes.push(`About ${wpm} words per minute is rushing — you will lose the interviewer. Aim for 130-150.`); }
  } else if (avgSentence > 0 && avgSentence <= 26) {
    paceScore = 82;
    notes.push(`Average sentence length is ${avgSentence} words, which reads as a steady, structured pace.`);
  } else if (avgSentence <= 36) {
    paceScore = 65;
    notes.push(`Average sentence length is ${avgSentence} words. Some sentences are running on — break them into shorter, clearer ones.`);
  } else {
    paceScore = 45;
    notes.push(`Average sentence length is ${avgSentence} words. Very long sentences are hard to follow out loud; aim for under 25.`);
  }
  paceScore = Math.max(0, Math.min(100, Math.round(paceScore)));

  // 4. Relevance to the job ------------------------------------------------
  let relevanceScore = 60;
  if (keywordMatch.used.length >= 5) { relevanceScore = 92; notes.push(`You used ${keywordMatch.used.length} of the job's own keywords (${keywordMatch.used.join(", ")}), so the answer sounds like it belongs to this role.`); }
  else if (keywordMatch.used.length >= 3) { relevanceScore = 78; notes.push(`You used ${keywordMatch.used.length} job keywords (${keywordMatch.used.join(", ")}). Two or three more would make the fit obvious.`); }
  else if (keywordMatch.used.length >= 1) { relevanceScore = 58; notes.push(`Only ${keywordMatch.used.length} job keyword came through. Mirror the advert's language back at the interviewer.`); }
  else { relevanceScore = 35; notes.push(`None of the job's keywords came through. Weave in the advert's own words so the interviewer hears a fit.`); }

  const overall = Math.round(
    fillerScore * 0.25 + structureScore * 0.35 + paceScore * 0.2 + relevanceScore * 0.2,
  );

  return {
    fillerScore,
    structureScore,
    paceScore,
    relevanceScore,
    overall,
    notes,
    band: overall >= 80 ? "Strong" : overall >= 65 ? "Developing" : overall >= 50 ? "Needs work" : "Early",
  };
}

// ---------------------------------------------------------------------------
// Tips
// ---------------------------------------------------------------------------

const FILLER_SWAPS = {
  um: "just pause — silence reads as confidence",
  uh: "just pause",
  er: "just pause",
  erm: "just pause",
  hmm: "say “let me think for a second” once, then answer",
  mmm: "just pause",
  uhh: "just pause",
  umm: "just pause",
  like: "cut it, or say “such as” when you mean an example",
  basically: "cut it",
  actually: "cut it — it undercuts what you just said",
  literally: "cut it unless it truly is literal",
  honestly: "cut it — it implies you might not be",
  obviously: "cut it — it can read as condescending",
  just: "cut it — “I led the project” beats “I just led the project”",
  stuff: "name the actual thing",
  things: "name the actual things",
  whatever: "say the specific example",
  etc: "finish the list with one more real item",
  "kind of": "say it plainly: “it was” rather than “it was kind of”",
  "sort of": "say it plainly",
  maybe: "commit: “I would” instead of “I maybe would”",
  probably: "commit to the answer",
  "I guess": "say “I would” — drop the guess",
  "I suppose": "state it as your answer",
  "I think": "say “I did” or “I would”",
  "you know": "cut it",
  "I mean": "cut it",
  "or whatever": "give the specific example",
};

export function buildTips(metrics, scores, keywordMatch) {
  const tips = [];
  const { filler, words, structure, avgSentence, wpm } = metrics;

  for (const item of filler.counts.slice(0, 4)) {
    const swap = FILLER_SWAPS[item.label] || "cut it or replace it with a pause";
    tips.push({
      kind: item.kind,
      title: `“${item.label}” — ${item.count}×`,
      body: `You said “${item.label}” ${item.count} time${item.count === 1 ? "" : "s"}. Instead: ${swap}.`,
    });
  }

  if (metrics.speakSeconds > 1 && (wpm < 110 || wpm > 195)) {
    tips.push({
      kind: "pace",
      title: wpm > 195 ? `Slow down (${wpm} wpm)` : `Pick up the pace (${wpm} wpm)`,
      body: wpm > 195
        ? "Speak in short bursts and take a breath at the full stop. Target 130-150 words per minute so the interviewer can take notes."
        : "Aim for 130-150 words per minute. Practise this answer out loud twice more and time it.",
    });
  }

  if (avgSentence > 26) {
    tips.push({
      kind: "pace",
      title: `Break up long sentences (avg ${avgSentence} words)`,
      body: "One idea per sentence. If you hear “and then… and also…”, that is a full stop you missed.",
    });
  }

  if (!structure.givesResult) {
    tips.push({
      kind: "structure",
      title: "Finish with the outcome",
      body: "You described what you did but not how it ended. Add one line: what changed because of your work?",
    });
  }

  if (!structure.givesNumber) {
    tips.push({
      kind: "structure",
      title: "Add a number",
      body: "One figure makes an answer memorable — how many people, how long, how much, or how many percent.",
    });
  }

  if (!structure.givesExample) {
    tips.push({
      kind: "structure",
      title: "Ground it in one real example",
      body: "Name the situation: “At my last job…”, “In my final year…”. A specific story beats a general description every time.",
    });
  }

  if (structure.borrower) {
    tips.push({
      kind: "structure",
      title: "Say “I”, not “we were responsible”",
      body: "Interviewers are assessing you. State your personal action first, then the team's part.",
    });
  }

  if (words < 40) {
    tips.push({
      kind: "structure",
      title: `Expand to 40-120 words (you used ${words})`,
      body: "Use situation → action → result. Three sentences is usually the shortest complete answer.",
    });
  }

  if (keywordMatch.missed.length) {
    tips.push({
      kind: "relevance",
      title: "Mirror the job description",
      body: `The advert mentions ${keywordMatch.missed.slice(0, 6).map((k) => `“${k}”`).join(", ")} — you did not. Use the advert's own words and the interviewer hears an obvious fit.`,
    });
  }

  if (keywordMatch.used.length) {
    tips.push({
      kind: "relevance",
      title: "Your strongest links to the job",
      body: `You already spoke the advert's language: ${keywordMatch.used.slice(0, 8).join(", ")}. Make sure these are in this answer or your opening summary.`,
    });
  }

  tips.push({
    kind: "delivery",
    title: "Force a pause instead of filling it",
    body: "When your brain needs a moment, stop talking and take a breath. A two-second silence costs nothing; three “ums” cost you credibility.",
  });

  return tips.slice(0, 9);
}

// Strength scan over all answers, used for the report summary.
export function skillHighlights(allAnswers, jobDescription) {
  const text = allAnswers.map((a) => a.transcript).join(" ").toLowerCase();
  const keywords = keywordsFromJob(jobDescription);
  const out = [];

  for (const [skill, terms] of Object.entries(DEFAULT_KEYWORDS)) {
    const matched = terms.filter((t) => text.includes(t));
    const fromAdvert = keywords.some((k) => terms.some((t) => k.term.startsWith(t.replace(/[^a-z]/g, "").slice(0, 6))));
    if (!matched.length && !fromAdvert) continue;
    out.push({
      skill: SKILL_LABELS[skill] || skill,
      evidence: matched.slice(0, 4),
      asked: fromAdvert,
      ratio: Math.min(1, matched.length / terms.length),
    });
  }

  return out.sort((a, b) => b.ratio - a.ratio);
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export function buildQuestions(jobTitle, jobDescription) {
  const role = (jobTitle || "").trim() || "this role";
  const keywords = keywordsFromJob(jobDescription, jobTitle);
  const top = keywords.slice(0, 5).map((k) => k.term);

  const questions = [
    { id: "fit", text: `Tell me about yourself and why you want the ${role} job.` },
    {
      id: "skills",
      text: top.length
        ? `The advert mentions ${top.slice(0, 3).map((t) => `“${t}”`).join(", ")}. Which of those are you strongest at, and what is your evidence?`
        : `Which skills make you a good fit for the ${role} job, and what is your evidence?`,
      keywords: top.slice(0, 3),
    },
    { id: "example", text: "Describe a time you solved a difficult problem. What did you do, and how did it end?" },
    { id: "teamwork", text: "Tell me about a time you worked with others to get something done." },
    { id: "strength", text: "What is your biggest strength, and what is one area you are still improving?" },
    { id: "closing", text: `Why should we choose you for the ${role} job, and what would you want to ask us?` },
  ];

  return questions.map((q) => ({ ...q, keywords: q.keywords || top.slice(0, 3) }));
}

// ---------------------------------------------------------------------------
// Speech recognition (mode 1)
// ---------------------------------------------------------------------------

export function speechSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function createRecognizer(onResult, onError) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-US";

  let finalText = "";

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) finalText += result[0].transcript + " ";
      else interim += result[0].transcript;
    }
    onResult(finalText, interim);
  };

  recognition.onerror = (event) => onError(event.error || "unknown");

  return {
    start() { recognition.start(); },
    stop() { try { recognition.stop(); } catch { /* already stopped */ } },
    reset() { finalText = ""; },
    get text() { return finalText; },
  };
}

// ---------------------------------------------------------------------------
// Report assembly
// ---------------------------------------------------------------------------

export function buildReport(jobTitle, jobDescription, answers) {
  const keywords = keywordsFromJob(jobDescription, jobTitle);
  const allSpeech = answers.some((a) => a.speakSeconds > 1);

  const perAnswer = answers.map((a) => {
    const metrics = analyseAnswer(a.question, a.transcript, a.speakSeconds);
    const keywordMatch = matchKeywords(keywords, a.transcript);
    const scores = scoreAnswer(metrics, keywordMatch);
    return { ...metrics, keywords, keywordMatch, scores, tips: buildTips(metrics, scores, keywordMatch) };
  });

  const combined = answers.map((a) => a.transcript).join(" ");
  const combinedFiller = detectFillers(combined);
  const totalWords = combinedFiller.wordCount;
  const answered = perAnswer.filter((a) => a.words >= 5);

  const report = {
    jobTitle: (jobTitle || "").trim(),
    jobDescription: (jobDescription || "").trim(),
    keywords,
    perAnswer,
    hasSpeech: allSpeech,
    totals: {
      words: totalWords,
      fillers: combinedFiller.total,
      fillerRate: totalWords ? round((combinedFiller.total / totalWords) * 100) : 0,
      fillerCounts: combinedFiller.counts,
      byKind: ["filler", "crutch", "hedge", "vague"].map((kind) => ({
        kind,
        label: KIND_LABELS[kind],
        count: combinedFiller.counts.filter((c) => c.kind === kind).reduce((sum, c) => sum + c.count, 0),
      })).filter((k) => k.count > 0),
      stutter: combinedFiller.stutter,
      seconds: round(answers.reduce((sum, a) => sum + (a.speakSeconds || 0), 0)),
      answered: answered.length,
      asked: answers.length,
    },
    keywordTotals: {
      used: Array.from(new Set(perAnswer.flatMap((a) => a.keywordMatch.used))),
      missed: keywords.map((k) => k.term).filter((t) => !perAnswer.some((a) => a.keywordMatch.used.includes(t))),
    },
    highlights: skillHighlights(answers, jobDescription),
  };

  report.tips = report.perAnswer.flatMap((a) => a.tips);
  report.overall = answered.length
    ? Math.round(mean(answered.map((a) => a.scores.overall)))
    : 0;
  report.band = report.overall >= 80 ? "Strong" : report.overall >= 65 ? "Developing" : report.overall >= 50 ? "Needs work" : "Early";

  report.summary = buildSummary(report);
  return report;
}

function buildSummary(report) {
  const parts = [];
  const { totals, jobTitle } = report;

  if (!totals.words) {
    return "No transcript was captured, so there is nothing to analyse yet. Record or type an answer to get a report.";
  }

  parts.push(
    `You gave ${totals.answered} of ${totals.asked} answers${jobTitle ? ` for the ${jobTitle} job` : ""}, a total of ${totals.words} words.`,
  );

  if (totals.fillers === 0) {
    parts.push("There were no filler words at all, which is unusual and a genuine strength.");
  } else {
    const top = totals.fillerCounts.slice(0, 3).map((c) => `“${c.label}” (${c.count}×)`).join(", ");
    parts.push(
      `You used ${totals.fillers} filler terms — ${totals.fillerRate}% of everything you said. Your habits are ${top}.`,
    );
  }

  if (report.hasSpeech && totals.seconds > 0) {
    parts.push(`You spoke for ${Math.round(totals.seconds)} seconds in total.`);
  }

  parts.push(
    `Against the job description you used ${report.keywordTotals.used.length} of ${report.keywords.length} of its keywords` +
    (report.keywordTotals.missed.length
      ? `, and missed ${report.keywordTotals.missed.slice(0, 5).map((k) => `“${k}”`).join(", ")}.`
      : ", covering all of them."),
  );

  parts.push(`Overall read: ${report.band} — ${report.overall} out of 100.`);
  return parts.join(" ");
}
