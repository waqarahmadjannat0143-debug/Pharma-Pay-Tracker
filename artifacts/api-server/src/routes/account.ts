import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { and, eq } from "drizzle-orm";
import { appUsersTable, db, organizationsTable } from "@workspace/db";
import {
  AuthRequest,
  JWT_SECRET,
  requireAuth,
} from "../middlewares/authMiddleware";
const router = Router();
router.use(requireAuth as any);
router.get("/me", async (req: AuthRequest, res) => {
  const auth = req.adminUser!;
  if (!auth.userId) {
    const [organization] = await db
      .select({
        businessName: organizationsTable.name,
        plan: organizationsTable.plan,
        betaEndsAt: organizationsTable.betaEndsAt,
      })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, auth.organizationId));
    res.json({
      username: auth.username,
      role: auth.role,
      organizationId: auth.organizationId,
      legacy: true,
      businessName: organization?.businessName,
      plan: organization?.plan || "free_beta",
      betaEndsAt: organization?.betaEndsAt,
    });
    return;
  }
  const [row] = await db
    .select({
      id: appUsersTable.id,
      username: appUsersTable.username,
      fullName: appUsersTable.fullName,
      email: appUsersTable.email,
      role: appUsersTable.role,
      businessName: organizationsTable.name,
      plan: organizationsTable.plan,
      betaEndsAt: organizationsTable.betaEndsAt,
    })
    .from(appUsersTable)
    .innerJoin(
      organizationsTable,
      eq(appUsersTable.organizationId, organizationsTable.id),
    )
    .where(
      and(
        eq(appUsersTable.id, auth.userId),
        eq(appUsersTable.organizationId, auth.organizationId),
      ),
    );
  if (!row) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(row);
});
router.post("/claim-legacy", async (req: AuthRequest, res) => {
  try {
    const auth = req.adminUser!;
    if (auth.userId || auth.organizationId !== 1 || auth.role !== "owner") {
      res.status(403).json({ error: "This workspace is already secured" });
      return;
    }

    const legacyPassword = String(req.body.currentPassword || "");
    const configuredLegacyPassword = process.env.ADMIN_PASSWORD || "";
    if (
      !configuredLegacyPassword ||
      legacyPassword !== configuredLegacyPassword
    ) {
      res.status(401).json({ error: "Current admin password is incorrect" });
      return;
    }

    const fullName = String(req.body.fullName || "").trim();
    const businessName = String(req.body.businessName || "").trim();
    const username = String(req.body.username || "").trim();
    const normalizedUsername = username.toLocaleLowerCase("en-IN");
    const email = String(req.body.email || "").trim();
    const normalizedEmail = email.toLocaleLowerCase("en-IN");
    const password = String(req.body.password || "");
    if (
      fullName.length < 2 ||
      businessName.length < 2 ||
      normalizedUsername.length < 4 ||
      !/^\S+@\S+\.\S+$/.test(normalizedEmail) ||
      password.length < 8
    ) {
      res.status(400).json({
        error:
          "Valid name, business, email, username and 8+ character password are required",
      });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [existingOwner] = await tx
        .select({ id: appUsersTable.id })
        .from(appUsersTable)
        .where(
          and(
            eq(appUsersTable.organizationId, auth.organizationId),
            eq(appUsersTable.role, "owner"),
          ),
        );
      if (existingOwner) throw new Error("WORKSPACE_ALREADY_CLAIMED");

      await tx
        .update(organizationsTable)
        .set({ name: businessName })
        .where(eq(organizationsTable.id, auth.organizationId));
      const [user] = await tx
        .insert(appUsersTable)
        .values({
          organizationId: auth.organizationId,
          fullName,
          username,
          normalizedUsername,
          email,
          normalizedEmail,
          passwordHash: await bcrypt.hash(password, 12),
          role: "owner",
        })
        .returning();
      return user;
    });

    const token = jwt.sign(
      {
        userId: result.id,
        organizationId: result.organizationId,
        username: result.username,
        role: result.role,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );
    res.status(201).json({
      token,
      username: result.username,
      role: result.role,
      message: "Existing workspace secured with your personal account",
    });
  } catch (err: any) {
    if (err?.message === "WORKSPACE_ALREADY_CLAIMED") {
      res.status(409).json({ error: "This workspace already has an owner" });
      return;
    }
    if (err?.code === "23505") {
      res.status(409).json({ error: "Username or email already exists" });
      return;
    }
    res.status(500).json({ error: "Workspace could not be secured" });
  }
});
router.post("/change-password", async (req: AuthRequest, res) => {
  try {
    const auth = req.adminUser!,
      current = String(req.body.currentPassword || ""),
      next = String(req.body.newPassword || "");
    if (!auth.userId) {
      res
        .status(400)
        .json({ error: "Legacy owner must first create a personal account" });
      return;
    }
    if (next.length < 8) {
      res
        .status(400)
        .json({ error: "New password must contain at least 8 characters" });
      return;
    }
    const [user] = await db
      .select()
      .from(appUsersTable)
      .where(
        and(
          eq(appUsersTable.id, auth.userId),
          eq(appUsersTable.organizationId, auth.organizationId),
        ),
      );
    if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    await db
      .update(appUsersTable)
      .set({ passwordHash: await bcrypt.hash(next, 12) })
      .where(eq(appUsersTable.id, user.id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Password could not be changed" });
  }
});
router.delete("/", async (req: AuthRequest, res) => {
  try {
    const auth = req.adminUser!,
      password = String(req.body.password || "");
    if (!auth.userId || auth.role !== "owner") {
      res
        .status(403)
        .json({ error: "Only the workspace owner can delete this account" });
      return;
    }
    const [user] = await db
      .select()
      .from(appUsersTable)
      .where(
        and(
          eq(appUsersTable.id, auth.userId),
          eq(appUsersTable.organizationId, auth.organizationId),
        ),
      );
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Password confirmation failed" });
      return;
    }
    await db
      .delete(organizationsTable)
      .where(eq(organizationsTable.id, auth.organizationId));
    res.json({ ok: true, message: "Workspace and its data were deleted" });
  } catch {
    res.status(500).json({ error: "Account could not be deleted" });
  }
});
export default router;
