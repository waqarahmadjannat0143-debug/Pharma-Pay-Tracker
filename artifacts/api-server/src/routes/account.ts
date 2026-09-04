import { Router } from "express";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { appUsersTable, db, organizationsTable } from "@workspace/db";
import { AuthRequest, requireAuth } from "../middlewares/authMiddleware";
const router = Router();
router.use(requireAuth as any);
router.get("/me", async (req: AuthRequest, res) => {
  const auth = req.adminUser!;
  if (!auth.userId) {
    res.json({
      username: auth.username,
      role: auth.role,
      organizationId: auth.organizationId,
      legacy: true,
      plan: "free_beta",
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
