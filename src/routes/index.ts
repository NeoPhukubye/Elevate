import { Router } from "express";
import { register, login, getCurrentUser, updateAccessibility, updateInterests, updateGoals } from "../services/auth";
import { listScenarios, getScenario, startScenario, completeScenario, getUserSessions, getSkillProgress, getSkills } from "../services/scenario";
import { listPortfolio, addPortfolioItem, updatePortfolioVisibility, generateRecommendations, listRecommendations, dismissRecommendation } from "../services/portfolio";
import authenticate, { AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Auth
router.post("/auth/register", async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;
    const result = await register(email, password, displayName);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.get("/auth/me", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await getCurrentUser(req.user!.id);
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
});

// Scenarios
router.get("/scenarios", async (req, res, next) => {
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

router.get("/scenarios/:id", async (req, res, next) => {
  try {
    const scenario = await getScenario(req.params.id);
    res.json({ success: true, data: scenario });
  } catch (e) {
    next(e);
  }
});

router.post("/scenarios/:id/start", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userChoice, timeTakenSec } = req.body;
    const result = await startScenario(req.user!.id, req.params.id, userChoice, timeTakenSec);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.post("/sessions/:sessionId/complete", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { scenarioId, userChoice, timeTakenSec } = req.body;
    const result = await completeScenario(req.user!.id, req.params.sessionId, scenarioId, userChoice, timeTakenSec);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
});

router.get("/sessions", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const sessions = await getUserSessions(req.user!.id);
    res.json({ success: true, data: sessions });
  } catch (e) {
    next(e);
  }
});

// Progress
router.get("/progress", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const progress = await getSkillProgress(req.user!.id);
    res.json({ success: true, data: progress });
  } catch (e) {
    next(e);
  }
});

router.get("/skills", async (req, res, next) => {
  try {
    const skills = await getSkills();
    res.json({ success: true, data: skills });
  } catch (e) {
    next(e);
  }
});

// Portfolio
router.get("/portfolio", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const items = await listPortfolio(req.user!.id);
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
});

router.post("/portfolio", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const item = await addPortfolioItem(req.user!.id, req.body);
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
});

router.patch("/portfolio/:id/visibility", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const item = await updatePortfolioVisibility(req.params.id, req.user!.id, req.body.isPublic);
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
});

// Recommendations
router.post("/recommendations/generate", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const recs = await generateRecommendations(req.user!.id);
    res.json({ success: true, data: recs });
  } catch (e) {
    next(e);
  }
});

router.get("/recommendations", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const recs = await listRecommendations(req.user!.id);
    res.json({ success: true, data: recs });
  } catch (e) {
    next(e);
  }
});

router.post("/recommendations/:id/dismiss", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const rec = await dismissRecommendation(req.params.id, req.user!.id);
    res.json({ success: true, data: rec });
  } catch (e) {
    next(e);
  }
});

// Accessibility & preferences
router.put("/accessibility", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const prefs = await updateAccessibility(req.user!.id, req.body);
    res.json({ success: true, data: prefs });
  } catch (e) {
    next(e);
  }
});

router.put("/interests", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await updateInterests(req.user!.id, req.body.interests);
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
});

router.put("/goals", authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await updateGoals(req.user!.id, req.body.goals);
    res.json({ success: true, data: user });
  } catch (e) {
    next(e);
  }
});

export default router;