import { Router } from "express";
import {
  db,
  customersTable,
  invoicesTable,
  paymentsTable,
  paymentAllocationsTable,
} from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
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
        oldestDueDate: sql<
          string | null
        >`MIN(CASE WHEN ${invoicesTable.outstandingBalance}::numeric > 0 THEN ${invoicesTable.dueDate} END)`,
      })
      .from(customersTable)
      .leftJoin(
        invoicesTable,
        and(
          eq(invoicesTable.customerId, customersTable.id),
          eq(invoicesTable.organizationId, req.adminUser!.organizationId),
        ),
      )
      .where(eq(customersTable.organizationId, req.adminUser!.organizationId))
      .groupBy(customersTable.id)
      .having(
        sql`COALESCE(SUM(CASE WHEN ${invoicesTable.outstandingBalance}::numeric > 0 THEN ${invoicesTable.outstandingBalance}::numeric ELSE 0 END), 0) > 0`,
      )
      .orderBy(sql`3 DESC`);
    res.json(
      rows.map((r) => ({
        ...r,
        totalOutstanding: Number(r.totalOutstanding),
        invoiceCount: Number(r.invoiceCount),
      })),
    );
  } catch (err) {
    req.log?.error({ err }, "Failed outstanding");
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.get("/overdue", async (req: AuthRequest, res) => {
  try {
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
        daysOverdue: sql<number>`((NOW() AT TIME ZONE 'Asia/Kolkata')::date - ${invoicesTable.dueDate}::date)`,
      })
      .from(invoicesTable)
      .innerJoin(
        customersTable,
        eq(invoicesTable.customerId, customersTable.id),
      )
      .where(
        and(
          eq(invoicesTable.organizationId, req.adminUser!.organizationId),
          sql`${invoicesTable.outstandingBalance}::numeric > 0`,
          sql`${invoicesTable.dueDate}::date < (NOW() AT TIME ZONE 'Asia/Kolkata')::date`,
        ),
      )
      .orderBy(sql`${invoicesTable.dueDate}::date ASC`);
    res.json(
      rows.map((r) => ({
        ...r,
        billAmount: Number(r.billAmount),
        outstandingBalance: Number(r.outstandingBalance),
        daysOverdue: Number(r.daysOverdue),
      })),
    );
  } catch (err) {
    req.log?.error({ err }, "Failed overdue");
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.get("/aging", async (req: AuthRequest, res) => {
  try {
    const rows = await db
      .select({
        invoiceId: invoicesTable.id,
        invoiceNumber: invoicesTable.invoiceNumber,
        dueDate: invoicesTable.dueDate,
        outstandingBalance: invoicesTable.outstandingBalance,
        customerId: customersTable.id,
        customerName: customersTable.name,
        daysPastDue: sql<number>`((NOW() AT TIME ZONE 'Asia/Kolkata')::date - ${invoicesTable.dueDate}::date)`,
      })
      .from(invoicesTable)
      .innerJoin(
        customersTable,
        eq(invoicesTable.customerId, customersTable.id),
      )
      .where(
        and(
          eq(invoicesTable.organizationId, req.adminUser!.organizationId),
          sql`${invoicesTable.outstandingBalance}::numeric > 0`,
        ),
      )
      .orderBy(sql`${invoicesTable.dueDate}::date ASC`);

    const buckets: any = {
      current: { label: "Not Due", amount: 0, count: 0 },
      d1_30: { label: "1-30 Days", amount: 0, count: 0 },
      d31_60: { label: "31-60 Days", amount: 0, count: 0 },
      d61_90: { label: "61-90 Days", amount: 0, count: 0 },
      d90plus: { label: "90+ Days", amount: 0, count: 0 },
    };

    const invoices = rows.map((r) => {
      const days = Number(r.daysPastDue);
      const amount = Number(r.outstandingBalance);
      const key =
        days <= 0
          ? "current"
          : days <= 30
            ? "d1_30"
            : days <= 60
              ? "d31_60"
              : days <= 90
                ? "d61_90"
                : "d90plus";
      buckets[key].amount += amount;
      buckets[key].count += 1;
      return {
        ...r,
        outstandingBalance: amount,
        daysPastDue: days,
        bucket: key,
      };
    });

    res.json({ buckets, invoices });
  } catch (err) {
    req.log?.error({ err }, "Failed aging");
    res.status(500).json({ error: "Failed to fetch aging report" });
  }
});

router.get("/invoice-payments/:invoiceId", async (req: AuthRequest, res) => {
  try {
    const invoiceId = Number(req.params.invoiceId);
    const rows = await db
      .select({
        paymentId: paymentsTable.id,
        paymentDate: paymentsTable.paymentDate,
        paymentMode: paymentsTable.paymentMode,
        slipNumber: paymentsTable.slipNumber,
        notes: paymentsTable.notes,
        amount: paymentAllocationsTable.amount,
      })
      .from(paymentAllocationsTable)
      .innerJoin(
        paymentsTable,
        eq(paymentAllocationsTable.paymentId, paymentsTable.id),
      )
      .where(
        and(
          eq(
            paymentAllocationsTable.organizationId,
            req.adminUser!.organizationId,
          ),
          eq(paymentAllocationsTable.invoiceId, invoiceId),
        ),
      )
      .orderBy(desc(paymentsTable.paymentDate));
    res.json(rows.map((r) => ({ ...r, amount: Number(r.amount) })));
  } catch (err) {
    req.log?.error({ err }, "Failed invoice payment history");
    res.status(500).json({ error: "Failed to fetch invoice payment history" });
  }
});

router.get("/payment-history", async (req: AuthRequest, res) => {
  try {
    const { customerId, fromDate, toDate } = req.query;
    const conditions: any[] = [
      eq(paymentsTable.organizationId, req.adminUser!.organizationId),
    ];
    if (customerId)
      conditions.push(
        eq(paymentsTable.customerId, parseInt(customerId as string)),
      );
    if (fromDate)
      conditions.push(gte(paymentsTable.paymentDate, fromDate as string));
    if (toDate)
      conditions.push(lte(paymentsTable.paymentDate, toDate as string));
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
      .innerJoin(
        customersTable,
        eq(paymentsTable.customerId, customersTable.id),
      )
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(paymentsTable.paymentDate));
    res.json(
      rows.map((r) => ({ ...r, amount: Number(r.amount), allocations: [] })),
    );
  } catch (err) {
    req.log?.error({ err }, "Failed payment history");
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.get("/date-wise-collection", async (req: AuthRequest, res) => {
  try {
    const organizationId = req.adminUser!.organizationId,
      { fromDate, toDate } = req.query;
    const rows = await db.execute(
      sql`SELECT payment_date AS date, SUM(amount::numeric) AS amount, COUNT(*) AS count FROM payments WHERE organization_id=${organizationId} AND payment_date >= ${fromDate || "2000-01-01"} AND payment_date <= ${toDate || "2099-12-31"} GROUP BY payment_date ORDER BY payment_date DESC`,
    );
    res.json(
      (rows.rows as any[]).map((r) => ({
        date: r.date,
        amount: Number(r.amount),
        count: Number(r.count),
      })),
    );
  } catch (err) {
    req.log?.error({ err }, "Failed collection");
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.get("/monthly-collection", async (req: AuthRequest, res) => {
  try {
    const organizationId = req.adminUser!.organizationId,
      year = req.query.year
        ? parseInt(req.query.year as string)
        : new Date().getFullYear();
    const rows = await db.execute(
      sql`SELECT EXTRACT(MONTH FROM payment_date::date) AS month, EXTRACT(YEAR FROM payment_date::date) AS year, SUM(amount::numeric) AS amount FROM payments WHERE organization_id=${organizationId} AND EXTRACT(YEAR FROM payment_date::date)=${year} GROUP BY month,year ORDER BY month`,
    );
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    res.json(
      (rows.rows as any[]).map((r) => ({
        year: Number(r.year),
        month: Number(r.month),
        amount: Number(r.amount),
        label: months[Number(r.month) - 1],
      })),
    );
  } catch (err) {
    req.log?.error({ err }, "Failed monthly");
    res.status(500).json({ error: "Failed to fetch report" });
  }
});
export default router;
