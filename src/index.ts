import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import apiRouter from "./routes";
import errorHandler, { AppError } from "./middleware/errorHandler";

dotenv.config();

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: env.NODE_ENV === "production" ? false : "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));

const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ success: false, status: "degraded", database: "disconnected" });
  }
});

app.use("/api/v1", apiRouter);

app.use("/api/*", (_req, _res, next) => {
  next(new AppError("Endpoint not found", 404));
});

app.use(errorHandler);

async function main() {
  try {
    await prisma.$connect();
    app.listen(env.PORT, () => {
      console.log(`🚀 Elevate backend running on http://localhost:${env.PORT}`);
      console.log(`   API: http://localhost:${env.PORT}/api/v1`);
      console.log(`   AI Coach: ${env.AI_PROVIDER}/${env.AI_MODEL}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  process.exit(0);
});

main();