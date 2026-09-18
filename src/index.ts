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

let dbConnected = false;

app.get("/health", async (_req, res) => {
  if (dbConnected) {
    res.json({ success: true, status: "ok", database: "connected" });
  } else {
    res.status(503).json({ success: false, status: "degraded", database: "disconnected" });
  }
});

// DB routes only work when connected
app.use("/api/v1", (req, res, next) => {
  if (!dbConnected && req.path !== "/health") {
    res.status(503).json({ success: false, error: "Database not ready. Try again shortly." });
    return;
  }
  next();
}, apiRouter);

app.use("/api/*", (_req, _res, next) => {
  next(new AppError("Endpoint not found", 404));
});

app.use(errorHandler);

async function connectDb() {
  if (!env.DATABASE_URL) {
    console.log("No DATABASE_URL set — running without database");
    return;
  }
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    console.log("Database connected");
  } catch (error) {
    console.error("Database connection failed:", error);
    dbConnected = false;
  }
}

async function main() {
  // Start HTTP immediately so health checks pass during DB warmup
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Elevate backend running on http://localhost:${env.PORT}`);
    console.log(`   API: http://localhost:${env.PORT}/api/v1`);
    console.log(`   AI Coach: ${env.AI_PROVIDER}/${env.AI_MODEL}`);
  });

  // Connect to DB in background (non-blocking)
  await connectDb();

  // Reconnect loop for transient failures
  if (!dbConnected) {
    const retry = setInterval(async () => {
      if (dbConnected) { clearInterval(retry); return; }
      await connectDb();
    }, 5000);
    server.on("close", () => clearInterval(retry));
  }

  return server;
}

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  if (dbConnected) await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  if (dbConnected) await prisma.$disconnect();
  process.exit(0);
});

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});