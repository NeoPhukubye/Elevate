import { Router } from "express";
import { register, login, getCurrentUser, updateAccessibility, updateInterests, updateGoals, AuthResult, AuthResult } from "../services/auth";
import { listScenarios, getScenario, startScenario, completeScenario, getUserSessions, getSkillProgress, getSkills, CompleteScenarioResult } from "../services/scenario";
import { listPortfolio, addPortfolioItem, updatePortfolioVisibility, generateRecommendations, listRecommendations, dismissRecommendation } from "../services/portfolio";
import authenticate, { AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Auth
router.post("/auth/register", async (req: { body: { email: any; password: any; displayName: any; }; }, res: { json: (arg0: { success: boolean; data: AuthResult; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const { email, password, displayName } = req.body;
    const result = await register(email, password, displayName);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post("/auth/login", async (req: { body: { email: any; password: any; }; }, res: { json: (arg0: { success: boolean; data: AuthResult; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.get("/auth/me", authenticate, async (req: AuthenticatedRequest, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const user = await getCurrentUser(req.user!.id);
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
});

// Scenarios
router.get("/scenarios", async (req: { query: { industry: string; category: string; difficulty: string; }; }, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const scenarios = await listScenarios({
      industry: req.query.industry as string,
      category: req.query.category as string,
      difficulty: req.query.difficulty as string,
    });
    res.json({ success: true, data: scenarios });
  } catch (e) {
    next(e);
  }
});

router.get("/scenarios/:id", async (req: { params: { id: string; }; }, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const scenario = await getScenario(req.params.id);
    res.json({ success: true, data: scenario });
  } catch (e) {
    next(e);
  }
});

router.post("/scenarios/:id/start", async (req: { body: { userChoice: any; timeTakenSec: any; userId: any; }; params: { id: string; }; }, res: { json: (arg0: { success: boolean; data: { session: any; scenario: any; }; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const { userChoice, timeTakenSec, userId } = req.body;
    const result = await startScenario(userId || "guest", req.params.id, userChoice, timeTakenSec);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post("/sessions/:sessionId/complete", async (req: { body: { scenarioId: any; userChoice: any; timeTakenSec: any; userId: any; }; params: { sessionId: string; }; }, res: { json: (arg0: { success: boolean; data: CompleteScenarioResult; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const { scenarioId, userChoice, timeTakenSec, userId } = req.body;
    const result = await completeScenario(userId || "guest", req.params.sessionId, scenarioId, userChoice, timeTakenSec);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.get("/sessions", authenticate, async (req: AuthenticatedRequest, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const sessions = await getUserSessions(req.user!.id);
    res.json({ success: true, data: sessions });
  } catch (e) {
    next(e);
  }
});

// Progress
router.get("/progress", authenticate, async (req: AuthenticatedRequest, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const progress = await getSkillProgress(req.user!.id);
    res.json({ success: true, data: progress });
  } catch (e) {
    next(e);
  }
});

router.get("/skills", async (req: any, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const skills = await getSkills();
    res.json({ success: true, data: skills });
  } catch (e) {
    next(e);
  }
});

// Portfolio
router.get("/portfolio", authenticate, async (req: AuthenticatedRequest, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const items = await listPortfolio(req.user!.id);
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
});

router.post("/portfolio", authenticate, async (req: AuthenticatedRequest, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const item = await addPortfolioItem(req.user!.id, req.body);
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
});

router.patch("/portfolio/:id/visibility", authenticate, async (req: AuthenticatedRequest, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const item = await updatePortfolioVisibility(req.params.id, req.user!.id, req.body.isPublic);
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
});

// Recommendations
router.post("/recommendations/generate", authenticate, async (req: AuthenticatedRequest, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const recs = await generateRecommendations(req.user!.id);
    res.json({ success: true, data: recs });
  } catch (e) {
    next(e);
  }
});

router.get("/recommendations", authenticate, async (req: AuthenticatedRequest, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const recs = await listRecommendations(req.user!.id);
    res.json({ success: true, data: recs });
  } catch (e) {
    next(e);
  }
});

router.post("/recommendations/:id/dismiss", authenticate, async (req: AuthenticatedRequest, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const rec = await dismissRecommendation(req.params.id, req.user!.id);
    res.json({ success: true, data: rec });
  } catch (e) {
    next(e);
  }
});

// Accessibility & preferences
router.put("/accessibility", authenticate, async (req: AuthenticatedRequest, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const prefs = await updateAccessibility(req.user!.id, req.body);
    res.json({ success: true, data: prefs });
  } catch (e) {
    next(e);
  }
});

router.put("/interests", authenticate, async (req: AuthenticatedRequest, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const user = await updateInterests(req.user!.id, req.body.interests);
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
});

router.put("/goals", authenticate, async (req: AuthenticatedRequest, res: { json: (arg0: { success: boolean; data: any; }) => void; }, next: (arg0: unknown) => void) => {
  try {
    const user = await updateGoals(req.user!.id, req.body.goals);
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
});

export default router;