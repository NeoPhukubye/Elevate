import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof AppError ? err.message : "Internal server error";

  if (statusCode >= 500) {
    console.error("Server error:", err);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

export default errorHandler;