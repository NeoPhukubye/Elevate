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
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    optionsSuccessStatus: 200,
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
let dbFatal = false;

app.get("/health", async (_req, res) => {
  if (dbConnected) {
    res.json({ success: true, status: "ok", database: "connected" });
  } else if (dbFatal) {
    res.status(503).json({ success: false, status: "degraded", database: "misconfigured" });
  } else {
    res.status(503).json({ success: false, status: "degraded", database: "connecting" });
  }
});

// Root route — this is a backend API, not the frontend
app.get("/", (_req, res) => {
  res.json({
    name: "Elevate Backend",
    status: "running",
    api: "/api/v1",
    health: "/health",
    message: "The frontend is a separate static site. Set ELEVATE_API_URL to this URL in the frontend.",
  });
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

function isFatalDbError(error: unknown) {
  const msg = String(error instanceof Error ? error.message : error || "");
  return (
    msg.includes("must start with the protocol") ||
    msg.includes("Error validating datasource") ||
    msg.includes("P1012")
  );
}

async function connectDb() {
  if (!env.DATABASE_URL) {
    console.log("No DATABASE_URL set — running without database");
    dbFatal = true;
    return;
  }
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    dbFatal = false;
    console.log("Database connected");
  } catch (error) {
    console.error("Database connection failed:", error);
    dbConnected = false;
    if (isFatalDbError(error)) {
      dbFatal = true;
      console.error("FATAL: DATABASE_URL is invalid. Fix it in the Render dashboard and redeploy.");
    }
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

  // Reconnect loop only for transient failures
  if (!dbConnected && !dbFatal) {
    const retry = setInterval(async () => {
      if (dbConnected || dbFatal) { clearInterval(retry); return; }
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