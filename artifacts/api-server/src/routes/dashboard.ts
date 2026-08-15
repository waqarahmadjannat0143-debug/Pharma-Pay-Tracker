import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";

const router = Router();
router.use(requireAuth as any);

router.get("/stats", async (req: AuthRequest, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        COALESCE((SELECT SUM(outstanding_balance::numeric) FROM invoices WHERE outstanding_balance::numeric > 0), 0) AS "totalOutstanding",
        COALESCE((SELECT SUM(amount::numeric) FROM payments), 0) AS "totalPaid",
        COALESCE((SELECT SUM(amount::numeric) FROM payments WHERE payment_date::date = CURRENT_DATE), 0) AS "todayCollection",
        COALESCE((SELECT SUM(amount::numeric) FROM payments WHERE payment_date::date >= DATE_TRUNC('month', CURRENT_DATE)::date AND payment_date::date <= CURRENT_DATE), 0) AS "thisMonthCollection",
        (SELECT COUNT(*) FROM customers) AS "totalCustomers",
        (SELECT COUNT(*) FROM invoices WHERE status = 'overdue' AND outstanding_balance::numeric > 0) AS "overdueCount",
        (SELECT COUNT(*) FROM invoices WHERE due_date::date >= CURRENT_DATE AND due_date::date <= CURRENT_DATE + INTERVAL '3 days' AND outstanding_balance::numeric > 0) AS "dueIn3DaysCount"
    `);

    const r = rows.rows[0] as any;
    res.json({
      totalOutstanding: Number(r.totalOutstanding),
      totalPaid: Number(r.totalPaid),
      todayCollection: Number(r.todayCollection),
      thisMonthCollection: Number(r.thisMonthCollection),
      totalCustomers: Number(r.totalCustomers),
      overdueCount: Number(r.overdueCount),
      dueIn3DaysCount: Number(r.dueIn3DaysCount),
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to get dashboard stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/monthly-collections", async (req: AuthRequest, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        EXTRACT(YEAR FROM payment_date::date) AS year,
        EXTRACT(MONTH FROM payment_date::date) AS month,
        SUM(amount::numeric) AS amount
      FROM payments
      WHERE payment_date::date >= (CURRENT_DATE - INTERVAL '11 months')
      GROUP BY year, month
      ORDER BY year, month
    `);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const result = (rows.rows as any[]).map(r => ({
      year: Number(r.year),
      month: Number(r.month),
      amount: Number(r.amount),
      label: months[Number(r.month) - 1],
    }));
    res.json(result);
  } catch (err) {
    req.log?.error({ err }, "Failed to get monthly collections");
    res.status(500).json({ error: "Failed to fetch monthly collections" });
  }
});

export default router;
