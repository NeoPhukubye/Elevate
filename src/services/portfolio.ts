import { portfolioRepo, progressRepo, recommendationRepo, skillRepo } from "../repositories";
import { prisma } from "../config/prisma";

export async function listPortfolio(userId: string) {
  return portfolioRepo.listByUser(userId);
}

export async function addPortfolioItem(
  userId: string,
  data: {
    title: string;
    description?: string;
    type: string;
    evidenceUrl?: string;
    skillIds: string[];
    isPublic: boolean;
  }
) {
  return portfolioRepo.create({ userId, ...data });
}

export async function updatePortfolioVisibility(id: string, userId: string, isPublic: boolean) {
  const item = await prisma.portfolio.findUnique({ where: { id } });
  if (!item || item.userId !== userId) throw new Error("Not found or not owned");
  return portfolioRepo.updateVisibility(id, isPublic);
}

export async function generateRecommendations(userId: string) {
  const progress = await progressRepo.listByUser(userId);
  const skills = await skillRepo.list();
  const skillMap = new Map(skills.map((s) => [s.id, s]));

  const recommendations = [];

  for (const skill of skills) {
    const entries = progress.filter((p) => p.skillId === skill.id);
    if (entries.length === 0) {
      recommendations.push({
        type: "skill",
        targetId: skill.id,
        reason: `You haven't practised ${skill.name} yet. Start building this skill.`,
        priority: 2,
      });
    } else {
      const avgScore = entries.reduce((sum, e) => sum + e.score, 0) / entries.length;
      if (avgScore < 60) {
        recommendations.push({
          type: "skill",
          targetId: skill.id,
          reason: `Your average score in ${skill.name} is ${Math.round(avgScore)}. Practise more to improve.`,
          priority: 1,
        });
      }
    }
  }

  const created = await Promise.all(
    recommendations.map((r) =>
      recommendationRepo.create({
        userId,
        type: r.type,
        targetId: r.targetId,
        reason: r.reason,
        priority: r.priority,
      })
    )
  );

  return created;
}

export async function listRecommendations(userId: string) {
  return recommendationRepo.listByUser(userId);
}

export async function dismissRecommendation(id: string, userId: string) {
  const rec = await prisma.recommendation.findUnique({ where: { id } });
  if (!rec || rec.userId !== userId) throw new Error("Not found or not owned");
  return recommendationRepo.dismiss(id);
}