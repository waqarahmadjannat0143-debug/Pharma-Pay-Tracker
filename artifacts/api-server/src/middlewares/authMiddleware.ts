import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "medpay-dev-only-secret");

if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET is required in production");
}

export type AuthUser = {
  userId: number | null;
  organizationId: number;
  username: string;
  role: "owner" | "staff";
};

export interface AuthRequest extends Request {
  adminUser?: AuthUser;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Partial<AuthUser>;
    if (!decoded.username) throw new Error("Invalid token payload");
    req.adminUser = {
      userId: decoded.userId ?? null,
      organizationId: decoded.organizationId ?? 1,
      username: decoded.username,
      role: decoded.role === "staff" ? "staff" : "owner",
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export { JWT_SECRET };
