import { Router } from "express";
import { db, customersTable, invoicesTable, paymentsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, count, asc, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";

const router = Router();
router.use(requireAuth as any);

router.get("/outstanding", async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select({
        customerId: customersTable.id,
        customerName: customersTable.name,
        mobile: customersTable.mobile,
        totalOutstanding: sql<number>`COALESCE(SUM(CASE WHEN ${invoicesTable.outstandingBalance}::numeric > 0 THEN ${invoicesTable.outstandingBalance}::numeric ELSE 0 END), 0)`,
        invoiceCount: sql<number>`COUNT(CASE WHEN ${invoicesTable.outstandingBalance}::numeric > 0 THEN 1 END)`,
        oldestDueDate: sql<string | null>`MIN(CASE WHEN ${invoicesTable.outstandingBalance}::numeric > 0 THEN ${invoicesTable.dueDate} END)`,
      })
      .from(customersTable)
      .leftJoin(invoicesTable, eq(invoicesTable.customerId, customersTable.id))
      .groupBy(customersTable.id)
      .having(sql`COALESCE(SUM(CASE WHEN ${invoicesTable.outstandingBalance}::numeric > 0 THEN ${invoicesTable.outstandingBalance}::numeric ELSE 0 END), 0) > 0`)
      .orderBy(sql`2 DESC`);
    res.json(rows.map(r => ({ ...r, totalOutstanding: Number(r.totalOutstanding), invoiceCount: Number(r.invoiceCount) })));
  } catch (err) {
    req.log?.error({ err }, "Failed to get outstanding report");
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.get("/overdue", async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const rows = await db
      .select({
        invoiceId: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        customerId: customersTable.id,
        customerName: customersTable.name,
        mobile: customersTable.mobile,
        billAmount: invoicesTable.billAmount,
        outstandingBalance: invoicesTable.outstandingBalance,
        dueDate: invoicesTable.dueDate,
        daysOverdue: sql<number>`(CURRENT_DATE - ${invoicesTable.dueDate}::date)`,
      })
      .from(invoicesTable)
      .innerJoin(customersTable, eq(invoicesTable.customerId, customersTable.id))
      .where(and(
        sql`${invoicesTable.outstandingBalance}::numeric > 0`,
        sql`${invoicesTable.dueDate}::date < CURRENT_DATE`
      ))
      .orderBy(sql`${invoicesTable.dueDate}::date ASC`);
    res.json(rows.map(r => ({
      ...r,
      billAmount: Number(r.billAmount),
      outstandingBalance: Number(r.outstandingBalance),
      daysOverdue: Number(r.daysOverdue),
    })));
  } catch (err) {
    req.log?.error({ err }, "Failed to get overdue report");
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.get("/payment-history", async (req: AuthRequest, res) => {
  try {
    const { customerId, fromDate, toDate } = req.query;
    const conditions: any[] = [];
    if (customerId) conditions.push(eq(paymentsTable.customerId, parseInt(customerId as string)));
    if (fromDate) conditions.push(gte(paymentsTable.paymentDate, fromDate as string));
    if (toDate) conditions.push(lte(paymentsTable.paymentDate, toDate as string));

    const rows = await db
      .select({
        id: paymentsTable.id,
        customerId: paymentsTable.customerId,
        customerName: customersTable.name,
        paymentDate: paymentsTable.paymentDate,
        amount: paymentsTable.amount,
        paymentMode: paymentsTable.paymentMode,
        notes: paymentsTable.notes,
        createdAt: paymentsTable.createdAt,
      })
      .from(paymentsTable)
      .innerJoin(customersTable, eq(paymentsTable.customerId, customersTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(paymentsTable.paymentDate));
    res.json(rows.map(r => ({ ...r, amount: Number(r.amount), allocations: [] })));
  } catch (err) {
    req.log?.error({ err }, "Failed to get payment history");
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.get("/date-wise-collection", async (req: AuthRequest, res) => {
  try {
    const { fromDate, toDate } = req.query;
    const conditions: any[] = [];
    if (fromDate) conditions.push(gte(paymentsTable.paymentDate, fromDate as string));
    if (toDate) conditions.push(lte(paymentsTable.paymentDate, toDate as string));

    const rows = await db.execute(sql`
      SELECT
        payment_date AS date,
        SUM(amount::numeric) AS amount,
        COUNT(*) AS count
      FROM payments
      ${conditions.length ? sql`WHERE payment_date >= ${fromDate || '2000-01-01'} AND payment_date <= ${toDate || '2099-12-31'}` : sql``}
      GROUP BY payment_date
      ORDER BY payment_date DESC
    `);
    res.json((rows.rows as any[]).map(r => ({ date: r.date, amount: Number(r.amount), count: Number(r.count) })));
  } catch (err) {
    req.log?.error({ err }, "Failed to get date-wise collection");
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.get("/monthly-collection", async (req: AuthRequest, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const rows = await db.execute(sql`
      SELECT
        EXTRACT(MONTH FROM payment_date::date) AS month,
        EXTRACT(YEAR FROM payment_date::date) AS year,
        SUM(amount::numeric) AS amount
      FROM payments
      WHERE EXTRACT(YEAR FROM payment_date::date) = ${year}
      GROUP BY month, year
      ORDER BY month
    `);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    res.json((rows.rows as any[]).map(r => ({
      year: Number(r.year),
      month: Number(r.month),
      amount: Number(r.amount),
      label: months[Number(r.month) - 1],
    })));
  } catch (err) {
    req.log?.error({ err }, "Failed to get monthly collection report");
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

export default router;
