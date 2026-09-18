import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

let model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function getModel() {
  if (model) return model;
  const client = new GoogleGenerativeAI(env.AI_API_KEY);
  model = client.getGenerativeModel({
    model: env.AI_MODEL,
    generationConfig: {
      maxOutputTokens: env.AI_MAX_TOKENS,
      temperature: env.AI_TEMPERATURE,
      responseMimeType: "application/json",
    },
  });
  return model;
}

export interface AIFeedbackRequest {
  scenario: {
    title: string;
    category: string;
    prompt: string;
    tips: string[];
  };
  userChoice: string;
  correctAnswer?: string;
  isCorrect?: boolean;
  previousAttempts?: number;
}

export interface AIFeedbackResult {
  whatWentWell: string;
  whatToImprove: string;
  nextSteps: string;
  retryAdvice?: string;
  score: number;
}

export interface SkillAnalysisRequest {
  skillName: string;
  category: string;
  attempts: { date: string; score: number }[];
}

export interface SkillAnalysisResult {
  summary: string;
  trend: "improving" | "stable" | "declining";
  recommendation: string;
}

export async function generateScenarioFeedback(
  request: AIFeedbackRequest
): Promise<AIFeedbackResult> {
  const prompt = buildFeedbackPrompt(request);

  try {
    const m = getModel();
    const result = await m.generateContent(prompt);
    const text = result.response.text();

    const parsed = JSON.parse(text) as Partial<AIFeedbackResult>;
    return {
      whatWentWell: parsed.whatWentWell || "You completed the scenario.",
      whatToImprove: parsed.whatToImprove || "Review the scenario and consider alternative approaches.",
      nextSteps: parsed.nextSteps || "Try the scenario again with what you learned.",
      retryAdvice: parsed.retryAdvice,
      score: typeof parsed.score === "number" ? parsed.score : 50,
    };
  } catch (error) {
    console.error("AI feedback generation failed:", error);
    return {
      whatWentWell: "You completed the scenario.",
      whatToImprove: "Review the scenario and consider alternative approaches.",
      nextSteps: "Try the scenario again with what you learned.",
      retryAdvice: "Re-read the scenario prompt and the tips before trying again.",
      score: 50,
    };
  }
}

export async function analyzeSkillProgress(
  request: SkillAnalysisRequest
): Promise<SkillAnalysisResult> {
  const prompt = buildSkillAnalysisPrompt(request);

  try {
    const m = getModel();
    const result = await m.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as Partial<SkillAnalysisResult>;
    return {
      summary: parsed.summary || `You have practiced ${request.skillName}.`,
      trend: parsed.trend || "stable",
      recommendation: parsed.recommendation || "Keep practising to build confidence.",
    };
  } catch (error) {
    console.error("AI skill analysis failed:", error);
    return {
      summary: `You have practiced ${request.skillName}.`,
      trend: "stable",
      recommendation: "Keep practising to build confidence.",
    };
  }
}

function buildFeedbackPrompt(request: AIFeedbackRequest): string {
  const { scenario, userChoice, correctAnswer, isCorrect, previousAttempts } = request;
  return `You are an AI workplace coach helping young people build confidence for real work situations.

Scenario: ${scenario.title}
Category: ${scenario.category}
Situation: ${scenario.prompt}
Tips: ${scenario.tips.join("; ")}
User's response: ${userChoice}
${correctAnswer !== undefined ? `Correct answer: ${correctAnswer}` : ""}
${isCorrect !== undefined ? `Was correct: ${isCorrect}` : ""}
${previousAttempts !== undefined ? `Previous attempts: ${previousAttempts}` : ""}

Return a JSON object with exactly these fields:
- "whatWentWell": 1-2 sentences on what the user did well, even if the answer was wrong.
- "whatToImprove": 1-2 sentences on specific areas to improve.
- "nextSteps": 1-2 concrete actions the user can take.
- "retryAdvice": optional, 1 sentence on how to approach the scenario again.
- "score": a number 0-100 representing how well the user performed.

Be encouraging, specific, and use simple language. Avoid markdown in the values.`;
}

function buildSkillAnalysisPrompt(request: SkillAnalysisRequest): string {
  const { skillName, category, attempts } = request;
  const data = attempts
    .map((a) => `${a.date}: ${a.score}`)
    .join(", ") || "no attempts yet";

  return `You are an AI workplace coach analysing a young person's skill development.

Skill: ${skillName}
Category: ${category}
Attempt history (date: score): ${data}

Return a JSON object with exactly these fields:
- "summary": 1-2 sentence summary of their progress in this skill.
- "trend": one of "improving", "stable", or "declining" based on the scores.
- "recommendation": 1-2 sentences recommending the next activity or practice.

Use simple language and be encouraging. Avoid markdown in the values.`;
}