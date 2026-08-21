import { Router } from "express";
import { db, agenciesTable } from "@workspace/db";
import { asc, eq, ilike } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";

const router = Router();
router.use(requireAuth as any);

function normalizeAgencyName(name: string) {
  return name.toLocaleLowerCase("en-IN").replace(/[^a-z0-9]/g, "");
}

router.get("/", async (req: AuthRequest, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const rows = await db.select().from(agenciesTable)
      .where(search ? ilike(agenciesTable.name, `%${search}%`) : undefined)
      .orderBy(asc(agenciesTable.name));
    res.json(rows);
  } catch (err) {
    req.log?.error({ err }, "Failed to list agencies");
    res.status(500).json({ error: "Failed to fetch agencies" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const name = String(req.body.name || "").trim().replace(/\s+/g, " ");
    const normalizedName = normalizeAgencyName(name);
    if (!name || !normalizedName) { res.status(400).json({ error: "Agency name is required" }); return; }
    const [existing] = await db.select().from(agenciesTable).where(eq(agenciesTable.normalizedName, normalizedName));
    if (existing) { res.json({ ...existing, existing: true }); return; }
    const [agency] = await db.insert(agenciesTable).values({ name, normalizedName }).returning();
    res.status(201).json(agency);
  } catch (err: any) {
    if (err?.code === "23505") { res.status(409).json({ error: "This agency already exists" }); return; }
    req.log?.error({ err }, "Failed to create agency");
    res.status(500).json({ error: "Failed to create agency" });
  }
});

export default router;
