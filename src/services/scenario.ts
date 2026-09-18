import { scenarioRepo, sessionRepo, feedbackRepo, progressRepo, skillRepo } from "../repositories";
import { generateScenarioFeedback } from "../ai/coach";
import { prisma } from "../config/prisma";

export interface CompleteScenarioResult {
  sessionId: string;
  feedback: {
    whatWentWell: string;
    whatToImprove: string;
    nextSteps: string;
    retryAdvice?: string;
    score: number;
  };
}

export async function listScenarios(filters?: {
  industry?: string;
  category?: string;
  difficulty?: string;
}) {
  return scenarioRepo.list(filters);
}

export async function getScenario(id: string) {
  const scenario = await scenarioRepo.findById(id);
  if (!scenario) throw new Error("Scenario not found");
  return scenario;
}

export async function startScenario(userId: string, scenarioId: string, userChoice?: string, timeTakenSec?: number) {
  const scenario = await scenarioRepo.findById(scenarioId);
  if (!scenario) throw new Error("Scenario not found");

  const session = await sessionRepo.create({
    userId,
    scenarioId,
    userChoice,
    timeTakenSec,
  });

  return { session, scenario };
}

export async function completeScenario(
  userId: string,
  sessionId: string,
  scenarioId: string,
  userChoice: string,
  timeTakenSec?: number
): Promise<CompleteScenarioResult> {
  const scenario = await scenarioRepo.findById(scenarioId);
  if (!scenario) throw new Error("Scenario not found");

  const isCorrect = scenario.correctAnswer ? userChoice === scenario.correctAnswer : undefined;

  const previousAttempts = await prisma.scenarioSession.count({
    where: { userId, scenarioId, id: { not: sessionId } },
  });

  const feedbackResult = await generateScenarioFeedback({
    scenario: {
      title: scenario.title,
      category: scenario.category,
      prompt: scenario.prompt,
      tips: scenario.tips,
    },
    userChoice,
    correctAnswer: scenario.correctAnswer ?? undefined,
    isCorrect,
    previousAttempts,
  });

  const feedback = await feedbackRepo.create({
    sessionId,
    whatWentWell: feedbackResult.whatWentWell,
    whatToImprove: feedbackResult.whatToImprove,
    nextSteps: feedbackResult.nextSteps,
    retryAdvice: feedbackResult.retryAdvice,
    score: feedbackResult.score,
  });

  await sessionRepo.updateFeedback(sessionId, feedbackResult.retryAdvice || "");

  for (const skill of scenario.skills) {
    const skillId = skill.skillId;
    const weight = skill.weight ?? 1;
    await progressRepo.upsert(userId, skillId, feedbackResult.score * weight);
  }

  return {
    sessionId,
    feedback: {
      whatWentWell: feedback.whatWentWell,
      whatToImprove: feedback.whatToImprove,
      nextSteps: feedback.nextSteps,
      retryAdvice: feedback.retryAdvice ?? undefined,
      score: feedback.score ?? 0,
    },
  };
}

export async function getUserSessions(userId: string) {
  return sessionRepo.listByUser(userId);
}

export async function getSkillProgress(userId: string) {
  return progressRepo.listByUser(userId);
}

export async function getSkills() {
  return skillRepo.list();
}