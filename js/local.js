// Elevate frontend — offline fallback
// Lets the page work with no backend: sample scenarios, skills, and
// locally-generated feedback. Used by api.js when a request fails.

export const localSkills = [
  { id: "communication", name: "Communication", category: "Core" },
  { id: "teamwork", name: "Teamwork", category: "Core" },
  { id: "problem-solving", name: "Problem Solving", category: "Core" },
  { id: "customer-service", name: "Customer Service", category: "Workplace" },
  { id: "time-management", name: "Time Management", category: "Workplace" },
];

export const localScenarios = [
  {
    id: "customer-complaint",
    title: "Handling a Customer Complaint",
    difficulty: "Beginner",
    description: "A customer is unhappy with a delayed order and wants answers.",
    prompt:
      "You work at a retail counter. A customer arrives upset because their online order is three days late. They raise their voice and other customers are watching.",
    tips: [
      "Stay calm and keep your tone even.",
      "Acknowledge the problem before explaining.",
      "Offer a concrete next step.",
    ],
    skills: [{ name: "Customer Service" }, { name: "Communication" }],
    options: [
      { text: "Apologise, acknowledge the frustration, and check the order status with them." },
      { text: "Explain that delays are not your department's fault." },
      { text: "Ask them to lower their voice before you help." },
    ],
    best: 0,
  },
  {
    id: "team-disagreement",
    title: "Resolving a Team Disagreement",
    difficulty: "Intermediate",
    description: "Two teammates disagree on how to approach a task.",
    prompt:
      "Your project group has split into two camps over how to divide the work. The deadline is in two days and nothing has been decided.",
    tips: [
      "Focus on the shared goal, not who is right.",
      "Give each side a chance to be heard.",
      "Propose a specific way forward.",
    ],
    skills: [{ name: "Teamwork" }, { name: "Problem Solving" }],
    options: [
      { text: "Suggest each side state their reasoning, then agree on a split of tasks." },
      { text: "Side with the louder teammate to end the argument quickly." },
      { text: "Wait for someone else to make the decision." },
    ],
    best: 0,
  },
  {
    id: "tight-deadline",
    title: "Prioritising Under a Tight Deadline",
    difficulty: "Intermediate",
    description: "Three tasks are due at once and there is not enough time for all.",
    prompt:
      "Your manager hands you a rush request while you are mid-way through two other tasks that are also due today.",
    tips: [
      "Clarify what is actually urgent.",
      "Communicate trade-offs early.",
      "Protect quality on the most important item.",
    ],
    skills: [{ name: "Time Management" }, { name: "Problem Solving" }],
    options: [
      { text: "Ask which task is the true priority, then reorder your work and flag any delays." },
      { text: "Try to do all three at once and hope for the best." },
      { text: "Quietly drop the task you dislike most." },
    ],
    best: 0,
  },
  {
    id: "giving-feedback",
    title: "Giving Feedback to a Peer",
    difficulty: "Advanced",
    description: "A colleague's work needs improvement but the relationship matters.",
    prompt:
      "A peer's section of a shared report contains several errors that will be seen by a client. You need to raise it without damaging the working relationship.",
    tips: [
      "Be specific about the issue, not the person.",
      "Lead with the shared outcome.",
      "Offer to help fix it.",
    ],
    skills: [{ name: "Communication" }, { name: "Teamwork" }],
    options: [
      { text: "Point to the specific errors, explain the client impact, and offer to review it together." },
      { text: "Rewrite their whole section without telling them." },
      { text: "Mention it to your manager instead of the peer." },
    ],
    best: 0,
  },
];

let progressStore = [];

export function localListScenarios() {
  return localScenarios;
}

export function localGetScenario(id) {
  const found = localScenarios.find((s) => String(s.id) === String(id));
  if (!found) throw new Error("Scenario not found");
  return found;
}

// A simple, deterministic local "coach" so the practice flow works offline.
export function localFeedback(scenario, choiceIndex) {
  const isBest = Number(choiceIndex) === scenario.best;
  const score = isBest ? 85 : Number(choiceIndex) === 1 ? 55 : 40;

  if (scenario.id) {
    progressStore.push({ skillId: "communication", score });
  }

  return {
    score,
    whatWentWell: isBest
      ? "You acknowledged the situation and moved straight to a practical next step, which is exactly what keeps people on your side."
      : "You engaged with the situation rather than ignoring it, which is a reasonable starting point.",
    whatToImprove: isBest
      ? "The response was solid. The next level is adding a specific timeframe so the other person knows what happens next."
      : "The response focused more on the situation than on the person in front of you. Acknowledging their position first usually lands better.",
    nextSteps: isBest
      ? "Practise the same structure in a harder scenario, and add a clear follow-up action."
      : "Try again and open by recognising the other person's concern before explaining anything.",
    retryAdvice: "Re-read the situation and pick the option that addresses the person first, then the problem.",
  };
}
