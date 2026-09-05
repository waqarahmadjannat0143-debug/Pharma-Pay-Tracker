import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, appUsersTable, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { JWT_SECRET } from "../middlewares/authMiddleware";
import { createRateLimit } from "../middlewares/rateLimit";

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ||
  (process.env.NODE_ENV === "production" ? "" : "medpay@2024");

const normalizeUsername = (value: unknown) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-IN");

function issueToken(user: {
  id: number | null;
  organizationId: number;
  username: string;
  role: string;
}) {
  return jwt.sign(
    {
      userId: user.id,
      organizationId: user.organizationId,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "14d" },
  );
}

const loginLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  key: (req) => `${req.ip}:${normalizeUsername(req.body?.username)}`,
});
const registerLimit = createRateLimit({ windowMs: 60 * 60 * 1000, max: 5 });

router.post("/login", loginLimit, async (req, res) => {
  const { username, password } = req.body;
  const normalizedUsername = normalizeUsername(username);
  const [user] = await db
    .select()
    .from(appUsersTable)
    .where(eq(appUsersTable.normalizedUsername, normalizedUsername));
  if (
    user?.isActive &&
    (await bcrypt.compare(String(password || ""), user.passwordHash))
  ) {
    const token = issueToken({
      id: user.id,
      organizationId: user.organizationId,
      username: user.username,
      role: user.role,
    });
    res.json({ token, username: user.username, role: user.role });
    return;
  }
  if (
    ADMIN_PASSWORD &&
    normalizedUsername === normalizeUsername(ADMIN_USERNAME) &&
    password === ADMIN_PASSWORD
  ) {
    const token = issueToken({
      id: null,
      organizationId: 1,
      username: ADMIN_USERNAME,
      role: "owner",
    });
    res.json({ token, username: ADMIN_USERNAME, role: "owner" });
    return;
  }
  res.status(401).json({ error: "Invalid credentials" });
});

router.post("/register", registerLimit, async (req, res) => {
  try {
    const fullName = String(req.body.fullName || "").trim();
    const businessName = String(req.body.businessName || "").trim();
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim();
    const normalizedEmail = email.toLocaleLowerCase("en-IN");
    const normalizedUsername = normalizeUsername(username);
    const password = String(req.body.password || "");
    if (
      fullName.length < 2 ||
      businessName.length < 2 ||
      normalizedUsername.length < 4 ||
      !/^\S+@\S+\.\S+$/.test(normalizedEmail) ||
      password.length < 8
    ) {
      res
        .status(400)
        .json({
          error:
            "Valid name, business, email, username and 8+ character password are required",
        });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizationsTable)
        .values({
          name: businessName,
          plan: "free_beta",
          betaEndsAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        })
        .returning();
      const [user] = await tx
        .insert(appUsersTable)
        .values({
          organizationId: organization.id,
          fullName,
          username,
          normalizedUsername,
          email,
          normalizedEmail,
          passwordHash,
          role: "owner",
        })
        .returning();
      return { organization, user };
    });
    const token = issueToken({
      id: result.user.id,
      organizationId: result.organization.id,
      username: result.user.username,
      role: result.user.role,
    });
    res
      .status(201)
      .json({
        token,
        username: result.user.username,
        role: result.user.role,
        plan: result.organization.plan,
        betaEndsAt: result.organization.betaEndsAt,
      });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Username or email already exists" });
      return;
    }
    res.status(500).json({ error: "Account could not be created" });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ success: true, message: "Logged out" });
});

export default router;
