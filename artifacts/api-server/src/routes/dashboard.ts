import { Router } from "express";
import { db, customersTable, invoicesTable, paymentsTable } from "@workspace/db";
import { eq, and, gte, lte, lt, sql, count } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";

const router = Router();
router.use(requireAuth as any);

router.get("/stats", async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
    const monthStart = today.slice(0, 7) + "-01";

    const [outRow] = await db.select({
      totalOutstanding: sql<number>`COALESCE(SUM(${invoicesTable.outstandingBalance}::numeric), 0)`,
    }).from(invoicesTable).where(sql`${invoicesTable.outstandingBalance}::numeric > 0`);

    const [paidRow] = await db.select({
      totalPaid: sql<number>`COALESCE(SUM(${paymentsTable.amount}::numeric), 0)`,
    }).from(paymentsTable);

    const [todayRow] = await db.select({
      todayCollection: sql<number>`COALESCE(SUM(${paymentsTable.amount}::numeric), 0)`,
    }).from(paymentsTable).where(eq(paymentsTable.paymentDate, today));

    const [monthRow] = await db.select({
      thisMonthCollection: sql<number>`COALESCE(SUM(${paymentsTable.amount}::numeric), 0)`,
    }).from(paymentsTable).where(and(gte(paymentsTable.paymentDate, monthStart), lte(paymentsTable.paymentDate, today)));

    const [custRow] = await db.select({ totalCustomers: count() }).from(customersTable);

    const [overdueRow] = await db.select({ overdueCount: count() }).from(invoicesTable)
      .where(and(eq(invoicesTable.status, "overdue"), sql`${invoicesTable.outstandingBalance}::numeric > 0`));

    const [dueRow] = await db.select({ dueIn3DaysCount: count() }).from(invoicesTable)
      .where(and(
        gte(invoicesTable.dueDate, today),
        lte(invoicesTable.dueDate, inThreeDays),
        sql`${invoicesTable.outstandingBalance}::numeric > 0`
      ));

    res.json({
      totalOutstanding: Number(outRow.totalOutstanding),
      totalPaid: Number(paidRow.totalPaid),
      todayCollection: Number(todayRow.todayCollection),
      thisMonthCollection: Number(monthRow.thisMonthCollection),
      totalCustomers: custRow.totalCustomers,
      overdueCount: overdueRow.overdueCount,
      dueIn3DaysCount: dueRow.dueIn3DaysCount,
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
