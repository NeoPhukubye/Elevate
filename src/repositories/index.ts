import { prisma } from "../config/prisma";
import { User, Scenario, CareerPathway, Skill, Portfolio, Recommendation, ProgressEntry, ScenarioSession, Feedback } from "@prisma/client";

export const userRepo = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      include: { accessibility: true, skills: true, integrations: true, portfolios: true },
    }),
  create: (data: { email: string; passwordHash: string; displayName?: string }) =>
    prisma.user.create({ data }),
  updateInterests: (id: string, interests: string[]) =>
    prisma.user.update({ where: { id }, data: { interests } }),
  updateGoals: (id: string, goals: string[]) =>
    prisma.user.update({ where: { id }, data: { goals } }),
};

export const scenarioRepo = {
  list: (filters?: { industry?: string; category?: string; difficulty?: string }) =>
    prisma.scenario.findMany({
      where: {
        industry: filters?.industry,
        category: filters?.category,
        difficulty: filters?.difficulty,
      },
      include: { skills: { include: { skill: true } } },
    }),
  findById: (id: string) =>
    prisma.scenario.findUnique({
      where: { id },
      include: { skills: { include: { skill: true } }, pathways: true },
    }),
  create: (data: {
    title: string;
    description: string;
    industry: string;
    difficulty: string;
    category: string;
    prompt: string;
    options: any;
    correctAnswer?: string;
    tips: string[];
    skillIds: string[];
    pathwayIds: string[];
  }) =>
    prisma.scenario.create({
      data: {
        title: data.title,
        description: data.description,
        industry: data.industry,
        difficulty: data.difficulty,
        category: data.category,
        prompt: data.prompt,
        options: data.options,
        correctAnswer: data.correctAnswer,
        tips: data.tips,
        skills: {
          create: data.skillIds.map((skillId) => ({ skill: { connect: { id: skillId } } })),
        },
        pathways: {
          connect: data.pathwayIds.map((id) => ({ id })),
        },
      },
      include: { skills: { include: { skill: true } }, pathways: true },
    }),
};

export const pathwayRepo = {
  list: () => prisma.careerPathway.findMany(),
  findById: (id: string) =>
    prisma.careerPathway.findUnique({
      where: { id },
      include: { scenarios: { include: { skills: { include: { skill: true } } } } },
    }),
};

export const skillRepo = {
  list: () => prisma.skill.findMany(),
  findById: (id: string) => prisma.skill.findUnique({ where: { id } }),
};

export const progressRepo = {
  upsert: (userId: string, skillId: string, score: number) =>
    prisma.progressEntry.create({ data: { userId, skillId, score } }),
  listByUser: (userId: string) =>
    prisma.progressEntry.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { date: "asc" },
    }),
};

export const sessionRepo = {
  create: (data: { userId: string; scenarioId: string; userChoice?: string; timeTakenSec?: number }) =>
    prisma.scenarioSession.create({ data }),
  updateFeedback: (id: string, feedback: string) =>
    prisma.scenarioSession.update({ where: { id }, data: { aiFeedback: feedback, completedAt: new Date() } }),
  listByUser: (userId: string) =>
    prisma.scenarioSession.findMany({
      where: { userId },
      include: { scenario: true, feedback: true },
      orderBy: { createdAt: "desc" },
    }),
};

export const feedbackRepo = {
  create: (data: {
    sessionId: string;
    whatWentWell: string;
    whatToImprove: string;
    nextSteps: string;
    retryAdvice?: string;
    score?: number;
  }) => prisma.feedback.create({ data }),
};

export const portfolioRepo = {
  listByUser: (userId: string) => prisma.portfolio.findMany({ where: { userId } }),
  create: (data: {
    userId: string;
    title: string;
    description?: string;
    type: string;
    evidenceUrl?: string;
    skillIds: string[];
    isPublic: boolean;
  }) => prisma.portfolio.create({ data }),
  updateVisibility: (id: string, isPublic: boolean) =>
    prisma.portfolio.update({ where: { id }, data: { isPublic } }),
};

export const recommendationRepo = {
  listByUser: (userId: string) =>
    prisma.recommendation.findMany({
      where: { userId, dismissed: false },
      orderBy: { priority: "asc" },
    }),
  create: (data: { userId: string; type: string; targetId: string; reason: string; priority?: number }) =>
    prisma.recommendation.create({ data }),
  dismiss: (id: string) => prisma.recommendation.update({ where: { id }, data: { dismissed: true } }),
};

export type ScenarioWithSkills = Awaited<ReturnType<typeof scenarioRepo.findById>>;
export type ProgressSummary = Awaited<ReturnType<typeof progressRepo.listByUser>>;