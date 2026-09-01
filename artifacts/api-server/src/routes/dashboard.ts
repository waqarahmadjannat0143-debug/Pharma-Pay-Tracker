import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";

const router = Router();
router.use(requireAuth as any);

async function getStats() {
  const rows = await db.execute(sql`
    SELECT
      COALESCE((SELECT SUM(outstanding_balance::numeric) FROM invoices WHERE outstanding_balance::numeric > 0), 0) AS "totalOutstanding",
      COALESCE((SELECT SUM(amount::numeric) FROM payments), 0) AS "totalPaid",
      COALESCE((SELECT SUM(amount::numeric) FROM payments WHERE payment_date::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date), 0) AS "todayCollection",
      COALESCE((SELECT SUM(amount::numeric) FROM payments WHERE payment_date::date >= DATE_TRUNC('month', (NOW() AT TIME ZONE 'Asia/Kolkata'))::date AND payment_date::date <= (NOW() AT TIME ZONE 'Asia/Kolkata')::date), 0) AS "thisMonthCollection",
      (SELECT COUNT(*) FROM customers) AS "totalCustomers",
      (SELECT COUNT(*) FROM invoices WHERE due_date::date < (NOW() AT TIME ZONE 'Asia/Kolkata')::date AND outstanding_balance::numeric > 0) AS "overdueCount",
      (SELECT COUNT(*) FROM invoices WHERE due_date::date >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date AND due_date::date <= (NOW() AT TIME ZONE 'Asia/Kolkata')::date + INTERVAL '3 days' AND outstanding_balance::numeric > 0) AS "dueIn3DaysCount"
  `);
  const r = rows.rows[0] as any;
  return {
    totalOutstanding: Number(r.totalOutstanding), totalPaid: Number(r.totalPaid),
    todayCollection: Number(r.todayCollection), thisMonthCollection: Number(r.thisMonthCollection),
    totalCustomers: Number(r.totalCustomers), overdueCount: Number(r.overdueCount), dueIn3DaysCount: Number(r.dueIn3DaysCount),
  };
}

async function getMonthly() {
  const rows = await db.execute(sql`
    SELECT EXTRACT(YEAR FROM payment_date::date) AS year,
           EXTRACT(MONTH FROM payment_date::date) AS month,
           SUM(amount::numeric) AS amount
    FROM payments
    WHERE payment_date::date >= (CURRENT_DATE - INTERVAL '11 months')
    GROUP BY year, month
    ORDER BY year, month
  `);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return (rows.rows as any[]).map(r => ({ year:Number(r.year), month:Number(r.month), amount:Number(r.amount), label:months[Number(r.month)-1] }));
}

async function getPeriod(fromDate:string,toDate:string) {
  const rows = await db.execute(sql`
    SELECT payment_date AS date, SUM(amount::numeric) AS amount, COUNT(*) AS count
    FROM payments
    WHERE payment_date::date >= ${fromDate}::date AND payment_date::date <= ${toDate}::date
    GROUP BY payment_date ORDER BY payment_date DESC
  `);
  return (rows.rows as any[]).map(r => ({ date:r.date, amount:Number(r.amount), count:Number(r.count) }));
}

router.get("/overview", async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : today;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : today;
    const [stats, monthly, periodRows] = await Promise.all([getStats(), getMonthly(), getPeriod(fromDate,toDate)]);
    res.set("Cache-Control", "private, max-age=30");
    res.json({ stats, monthly, periodRows });
  } catch (err) {
    req.log?.error({ err }, "Failed dashboard overview");
    res.status(500).json({ error: "Failed to fetch dashboard overview" });
  }
});

router.get("/stats", async (req: AuthRequest, res) => {
  try { res.json(await getStats()); }
  catch (err) { req.log?.error({ err }, "Failed to get dashboard stats"); res.status(500).json({ error: "Failed to fetch stats" }); }
});

router.get("/monthly-collections", async (req: AuthRequest, res) => {
  try { res.json(await getMonthly()); }
  catch (err) { req.log?.error({ err }, "Failed to get monthly collections"); res.status(500).json({ error: "Failed to fetch monthly collections" }); }
});

export default router;
