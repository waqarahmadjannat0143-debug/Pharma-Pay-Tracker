import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; resetAt: number };

export function createRateLimit(options: {
  windowMs: number;
  max: number;
  key?: (req: Request) => string;
}) {
  const buckets = new Map<string, Bucket>();
  let lastSweep = Date.now();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (now - lastSweep > options.windowMs) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
      lastSweep = now;
    }

    const key =
      options.key?.(req) || req.ip || req.socket.remoteAddress || "unknown";
    const current = buckets.get(key);
    const bucket =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + options.windowMs }
        : current;
    bucket.count += 1;
    buckets.set(key, bucket);

    res.set("RateLimit-Limit", String(options.max));
    res.set(
      "RateLimit-Remaining",
      String(Math.max(0, options.max - bucket.count)),
    );
    res.set("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.max) {
      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      res
        .status(429)
        .json({ error: "Too many attempts. Please try again later." });
      return;
    }
    next();
  };
}
