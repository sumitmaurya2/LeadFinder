import "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      teamId?: string | null;
    }
  }
}
