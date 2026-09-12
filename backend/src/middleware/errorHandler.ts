import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { InsufficientCreditsError } from "../utils/credits.js";

/** Wraps an async route handler so rejected promises reach Express's error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Invalid input", details: err.flatten() });
  }
  if (err instanceof InsufficientCreditsError) {
    return res.status(402).json({ error: "OUT_OF_CREDITS" });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({ error: message });
}
