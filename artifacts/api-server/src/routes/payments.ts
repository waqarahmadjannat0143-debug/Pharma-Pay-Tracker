import { Router } from "express";
import { db, customersTable, invoicesTable, paymentsTable, paymentAllocationsTable } from "@workspace/db";
import { eq, and, desc, gte, lte, asc, inArray, gt } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";

const router = Router();
router.use(requireAuth as any);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const { customerId, fromDate, toDate, paymentMode } = req.query;
    const conditions: any[] = [];
    if (customerId) conditions.push(eq(paymentsTable.customerId, parseInt(customerId as string)));
    if (fromDate) conditions.push(gte(paymentsTable.paymentDate, fromDate as string));
    if (toDate) conditions.push(lte(paymentsTable.paymentDate, toDate as string));
    if (paymentMode) conditions.push(eq(paymentsTable.paymentMode, paymentMode as string));

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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(paymentsTable.paymentDate));

    const result = await Promise.all(rows.map(async (row) => {
      const allocations = await db
        .select({
          invoiceId: paymentAllocationsTable.invoiceId,
          amount: paymentAllocationsTable.amount,
          invoiceNumber: invoicesTable.invoiceNumber,
        })
        .from(paymentAllocationsTable)
        .innerJoin(invoicesTable, eq(paymentAllocationsTable.invoiceId, invoicesTable.id))
        .where(eq(paymentAllocationsTable.paymentId, row.id));
      return {
        ...row,
        amount: Number(row.amount),
        allocations: allocations.map(a => ({ ...a, amount: Number(a.amount) })),
      };
    }));
    res.json(result);
  } catch (err) {
    req.log?.error({ err }, "Failed to list payments");
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const { customerId, paymentDate, amount, paymentMode, notes } = req.body;
    const [payment] = await db.insert(paymentsTable).values({
      customerId,
      paymentDate,
      amount: String(amount),
      paymentMode,
      notes: notes || null,
    }).returning();

    const pendingInvoices = await db
      .select()
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.customerId, customerId),
          inArray(invoicesTable.status, ["pending", "partial", "overdue"]),
          gt(invoicesTable.outstandingBalance, "0")
        )
      )
      .orderBy(asc(invoicesTable.invoiceDate));

    let remaining = parseFloat(amount);
    const allocations: { invoiceId: number; invoiceNumber: string; amount: number }[] = [];

    for (const invoice of pendingInvoices) {
      if (remaining <= 0) break;
      const outstanding = parseFloat(invoice.outstandingBalance as string);
      const allocated = Math.min(remaining, outstanding);
      const newBalance = outstanding - allocated;
      const newStatus = newBalance <= 0 ? "paid" : "partial";

      await db.update(invoicesTable).set({
        outstandingBalance: newBalance.toFixed(2),
        status: newStatus,
      }).where(eq(invoicesTable.id, invoice.id));

      await db.insert(paymentAllocationsTable).values({
        paymentId: payment.id,
        invoiceId: invoice.id,
        amount: allocated.toFixed(2),
      });

      allocations.push({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, amount: allocated });
      remaining -= allocated;
    }

    const [customer] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, customerId));
    res.status(201).json({
      ...payment,
      customerName: customer?.name || "",
      amount: Number(payment.amount),
      allocations,
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to record payment");
    res.status(500).json({ error: "Failed to record payment" });
  }
});

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [row] = await db
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
      .where(eq(paymentsTable.id, id));

    if (!row) { res.status(404).json({ error: "Payment not found" }); return; }
    const allocations = await db
      .select({
        invoiceId: paymentAllocationsTable.invoiceId,
        amount: paymentAllocationsTable.amount,
        invoiceNumber: invoicesTable.invoiceNumber,
      })
      .from(paymentAllocationsTable)
      .innerJoin(invoicesTable, eq(paymentAllocationsTable.invoiceId, invoicesTable.id))
      .where(eq(paymentAllocationsTable.paymentId, id));

    res.json({ ...row, amount: Number(row.amount), allocations: allocations.map(a => ({ ...a, amount: Number(a.amount) })) });
  } catch (err) {
    req.log?.error({ err }, "Failed to get payment");
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

export default router;
