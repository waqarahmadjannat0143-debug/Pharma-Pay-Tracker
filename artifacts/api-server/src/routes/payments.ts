import { Router } from "express";
import { db, customersTable, invoicesTable, paymentsTable, paymentAllocationsTable } from "@workspace/db";
import { eq, and, desc, gte, lte, asc, inArray, gt } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";

const router = Router();
router.use(requireAuth as any);

function statusForBalance(balance: number, billAmount: number, dueDate: string) {
  if (balance <= 0.001) return "paid";
  const today = new Date().toISOString().slice(0, 10);
  if (dueDate < today) return "overdue";
  if (balance < billAmount - 0.001) return "partial";
  return "pending";
}

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
      .orderBy(desc(paymentsTable.paymentDate), desc(paymentsTable.id));

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
    const { customerId, paymentDate, amount, paymentMode, notes, invoiceIds } = req.body;
    const numericAmount = Number(amount);

    if (!customerId || !paymentDate || !Number.isFinite(numericAmount) || numericAmount <= 0 || !paymentMode) {
      res.status(400).json({ error: "Invalid payment data" });
      return;
    }

    let pendingInvoices = await db
      .select()
      .from(invoicesTable)
      .where(and(
        eq(invoicesTable.customerId, customerId),
        inArray(invoicesTable.status, ["pending", "partial", "overdue"]),
        gt(invoicesTable.outstandingBalance, "0"),
        Array.isArray(invoiceIds) && invoiceIds.length > 0
          ? inArray(invoicesTable.id, invoiceIds.map((id: unknown) => Number(id)))
          : undefined,
      ))
      .orderBy(asc(invoicesTable.invoiceDate));

    if (Array.isArray(invoiceIds) && invoiceIds.length > 0) {
      const requestedIds = invoiceIds.map((id: unknown) => Number(id));
      const foundIds = new Set(pendingInvoices.map(i => i.id));
      if (requestedIds.some((id: number) => !foundIds.has(id))) {
        res.status(400).json({ error: "One or more selected invoices are invalid or already paid" });
        return;
      }
      pendingInvoices = [...pendingInvoices].sort((a, b) => requestedIds.indexOf(a.id) - requestedIds.indexOf(b.id));
      const selectedOutstanding = pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.outstandingBalance), 0);
      if (numericAmount > selectedOutstanding + 0.001) {
        res.status(400).json({ error: "Payment amount cannot exceed selected invoice outstanding" });
        return;
      }
    }

    if (pendingInvoices.length === 0) {
      res.status(400).json({ error: "No pending invoices available for payment" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [payment] = await tx.insert(paymentsTable).values({
        customerId,
        paymentDate,
        amount: numericAmount.toFixed(2),
        paymentMode,
        notes: notes || null,
      }).returning();

      let remaining = numericAmount;
      const allocations: { invoiceId: number; invoiceNumber: string; amount: number }[] = [];

      for (const invoice of pendingInvoices) {
        if (remaining <= 0) break;
        const outstanding = Number(invoice.outstandingBalance);
        const allocated = Math.min(remaining, outstanding);
        const newBalance = outstanding - allocated;
        const newStatus = statusForBalance(newBalance, Number(invoice.billAmount), invoice.dueDate);

        await tx.update(invoicesTable).set({
          outstandingBalance: Math.max(newBalance, 0).toFixed(2),
          status: newStatus,
        }).where(eq(invoicesTable.id, invoice.id));

        await tx.insert(paymentAllocationsTable).values({
          paymentId: payment.id,
          invoiceId: invoice.id,
          amount: allocated.toFixed(2),
        });
        allocations.push({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, amount: allocated });
        remaining -= allocated;
      }
      return { payment, allocations };
    });

    const [customer] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, customerId));
    res.status(201).json({
      ...result.payment,
      customerName: customer?.name || "",
      amount: Number(result.payment.amount),
      allocations: result.allocations,
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

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { paymentDate, amount, paymentMode, notes } = req.body;
    const numericAmount = Number(amount);
    if (!paymentDate || !paymentMode || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: "Invalid payment data" });
      return;
    }

    const updated = await db.transaction(async (tx) => {
      const [payment] = await tx.select().from(paymentsTable).where(eq(paymentsTable.id, id));
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");

      const allocations = await tx.select().from(paymentAllocationsTable).where(eq(paymentAllocationsTable.paymentId, id));
      const invoiceIds = allocations.map(a => a.invoiceId);
      if (!invoiceIds.length) throw new Error("NO_ALLOCATIONS");

      const invoiceRows = await tx.select().from(invoicesTable).where(inArray(invoicesTable.id, invoiceIds));
      const invoiceMap = new Map(invoiceRows.map(i => [i.id, i]));

      for (const allocation of allocations) {
        const invoice = invoiceMap.get(allocation.invoiceId);
        if (!invoice) continue;
        const restoredBalance = Math.min(Number(invoice.billAmount), Number(invoice.outstandingBalance) + Number(allocation.amount));
        await tx.update(invoicesTable).set({
          outstandingBalance: restoredBalance.toFixed(2),
          status: statusForBalance(restoredBalance, Number(invoice.billAmount), invoice.dueDate),
        }).where(eq(invoicesTable.id, invoice.id));
        invoice.outstandingBalance = restoredBalance.toFixed(2);
      }

      const available = invoiceIds.reduce((sum, invoiceId) => {
        const invoice = invoiceMap.get(invoiceId);
        return sum + (invoice ? Number(invoice.outstandingBalance) : 0);
      }, 0);
      if (numericAmount > available + 0.001) throw new Error("AMOUNT_TOO_HIGH");

      await tx.delete(paymentAllocationsTable).where(eq(paymentAllocationsTable.paymentId, id));
      const [newPayment] = await tx.update(paymentsTable).set({
        paymentDate,
        amount: numericAmount.toFixed(2),
        paymentMode,
        notes: notes || null,
      }).where(eq(paymentsTable.id, id)).returning();

      let remaining = numericAmount;
      for (const invoiceId of invoiceIds) {
        if (remaining <= 0.001) break;
        const invoice = invoiceMap.get(invoiceId);
        if (!invoice) continue;
        const outstanding = Number(invoice.outstandingBalance);
        const allocated = Math.min(remaining, outstanding);
        const newBalance = outstanding - allocated;
        await tx.update(invoicesTable).set({
          outstandingBalance: Math.max(newBalance, 0).toFixed(2),
          status: statusForBalance(newBalance, Number(invoice.billAmount), invoice.dueDate),
        }).where(eq(invoicesTable.id, invoiceId));
        await tx.insert(paymentAllocationsTable).values({ paymentId: id, invoiceId, amount: allocated.toFixed(2) });
        remaining -= allocated;
      }
      return newPayment;
    });

    res.json({ ...updated, amount: Number(updated.amount) });
  } catch (err: any) {
    if (err?.message === "PAYMENT_NOT_FOUND") { res.status(404).json({ error: "Payment not found" }); return; }
    if (err?.message === "AMOUNT_TOO_HIGH") { res.status(400).json({ error: "Edited amount exceeds the selected bills available outstanding" }); return; }
    if (err?.message === "NO_ALLOCATIONS") { res.status(400).json({ error: "This payment has no bill allocations and cannot be edited safely" }); return; }
    req.log?.error({ err }, "Failed to edit payment");
    res.status(500).json({ error: "Failed to edit payment" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.transaction(async (tx) => {
      const [payment] = await tx.select().from(paymentsTable).where(eq(paymentsTable.id, id));
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");
      const allocations = await tx.select().from(paymentAllocationsTable).where(eq(paymentAllocationsTable.paymentId, id));
      for (const allocation of allocations) {
        const [invoice] = await tx.select().from(invoicesTable).where(eq(invoicesTable.id, allocation.invoiceId));
        if (!invoice) continue;
        const restoredBalance = Math.min(Number(invoice.billAmount), Number(invoice.outstandingBalance) + Number(allocation.amount));
        await tx.update(invoicesTable).set({
          outstandingBalance: restoredBalance.toFixed(2),
          status: statusForBalance(restoredBalance, Number(invoice.billAmount), invoice.dueDate),
        }).where(eq(invoicesTable.id, invoice.id));
      }
      await tx.delete(paymentAllocationsTable).where(eq(paymentAllocationsTable.paymentId, id));
      await tx.delete(paymentsTable).where(eq(paymentsTable.id, id));
    });
    res.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "PAYMENT_NOT_FOUND") { res.status(404).json({ error: "Payment not found" }); return; }
    req.log?.error({ err }, "Failed to delete payment");
    res.status(500).json({ error: "Failed to delete payment" });
  }
});

export default router;
