import { Router } from "express";
import {
  db,
  customersTable,
  invoicesTable,
  paymentsTable,
  paymentAllocationsTable,
} from "@workspace/db";
import { eq, and, desc, gte, lte, asc, inArray, gt } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";

const router = Router();
router.use(requireAuth as any);

function indiaToday() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

function statusForBalance(
  balance: number,
  billAmount: number,
  dueDate: string,
) {
  if (balance <= 0.001) return "paid";
  const today = indiaToday();
  if (dueDate < today) return "overdue";
  if (balance < billAmount - 0.001) return "partial";
  return "pending";
}

router.get("/", async (req: AuthRequest, res) => {
  try {
    const { customerId, fromDate, toDate, paymentMode } = req.query;
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
    if (paymentMode)
      conditions.push(eq(paymentsTable.paymentMode, paymentMode as string));
    const rows = await db
      .select({
        id: paymentsTable.id,
        customerId: paymentsTable.customerId,
        customerName: customersTable.name,
        paymentDate: paymentsTable.paymentDate,
        amount: paymentsTable.amount,
        paymentMode: paymentsTable.paymentMode,
        slipNumber: paymentsTable.slipNumber,
        notes: paymentsTable.notes,
        createdAt: paymentsTable.createdAt,
      })
      .from(paymentsTable)
      .innerJoin(
        customersTable,
        eq(paymentsTable.customerId, customersTable.id),
      )
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(paymentsTable.paymentDate), desc(paymentsTable.id));
    const result = await Promise.all(
      rows.map(async (row) => {
        const allocations = await db
          .select({
            invoiceId: paymentAllocationsTable.invoiceId,
            amount: paymentAllocationsTable.amount,
            invoiceNumber: invoicesTable.invoiceNumber,
          })
          .from(paymentAllocationsTable)
          .innerJoin(
            invoicesTable,
            eq(paymentAllocationsTable.invoiceId, invoicesTable.id),
          )
          .where(
            and(
              eq(
                paymentAllocationsTable.organizationId,
                req.adminUser!.organizationId,
              ),
              eq(paymentAllocationsTable.paymentId, row.id),
            ),
          );
        return {
          ...row,
          amount: Number(row.amount),
          allocations: allocations.map((a) => ({
            ...a,
            amount: Number(a.amount),
          })),
        };
      }),
    );
    res.json(result);
  } catch (err) {
    req.log?.error({ err }, "Failed to list payments");
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const organizationId = req.adminUser!.organizationId;
    const {
      customerId,
      paymentDate,
      amount,
      paymentMode,
      slipNumber,
      notes,
      invoiceIds,
    } = req.body;
    const numericAmount = Number(amount);
    if (
      !customerId ||
      !paymentDate ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      !paymentMode
    ) {
      res.status(400).json({ error: "Invalid payment data" });
      return;
    }
    let pendingInvoices = await db
      .select()
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.organizationId, organizationId),
          eq(invoicesTable.customerId, customerId),
          inArray(invoicesTable.status, ["pending", "partial", "overdue"]),
          gt(invoicesTable.outstandingBalance, "0"),
          Array.isArray(invoiceIds) && invoiceIds.length
            ? inArray(
                invoicesTable.id,
                invoiceIds.map((x: unknown) => Number(x)),
              )
            : undefined,
        ),
      )
      .orderBy(asc(invoicesTable.invoiceDate));
    if (Array.isArray(invoiceIds) && invoiceIds.length) {
      const requestedIds = invoiceIds.map((x: unknown) => Number(x));
      const found = new Set(pendingInvoices.map((i) => i.id));
      if (requestedIds.some((x: number) => !found.has(x))) {
        res.status(400).json({
          error: "One or more selected invoices are invalid or already paid",
        });
        return;
      }
      pendingInvoices = [...pendingInvoices].sort(
        (a, b) => requestedIds.indexOf(a.id) - requestedIds.indexOf(b.id),
      );
      const available = pendingInvoices.reduce(
        (s, i) => s + Number(i.outstandingBalance),
        0,
      );
      if (numericAmount > available + 0.001) {
        res.status(400).json({
          error: "Payment amount cannot exceed selected invoice outstanding",
        });
        return;
      }
    }
    if (!pendingInvoices.length) {
      res
        .status(400)
        .json({ error: "No pending invoices available for payment" });
      return;
    }
    const result = await db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(paymentsTable)
        .values({
          organizationId,
          customerId,
          paymentDate,
          amount: numericAmount.toFixed(2),
          paymentMode,
          slipNumber: slipNumber?.trim() || null,
          notes: notes || null,
        })
        .returning();
      let remaining = numericAmount;
      const allocations: any[] = [];
      for (const invoice of pendingInvoices) {
        if (remaining <= 0.001) break;
        const outstanding = Number(invoice.outstandingBalance);
        const allocated = Math.min(remaining, outstanding);
        const balance = outstanding - allocated;
        await tx
          .update(invoicesTable)
          .set({
            outstandingBalance: Math.max(balance, 0).toFixed(2),
            status: statusForBalance(
              balance,
              Number(invoice.billAmount),
              invoice.dueDate,
            ),
          })
          .where(
            and(
              eq(invoicesTable.id, invoice.id),
              eq(invoicesTable.organizationId, organizationId),
            ),
          );
        await tx.insert(paymentAllocationsTable).values({
          organizationId,
          paymentId: payment.id,
          invoiceId: invoice.id,
          amount: allocated.toFixed(2),
        });
        allocations.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: allocated,
        });
        remaining -= allocated;
      }
      return { payment, allocations };
    });
    const [customer] = await db
      .select({ name: customersTable.name })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, customerId),
          eq(customersTable.organizationId, organizationId),
        ),
      );
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
    const id = Number(req.params.id);
    const [row] = await db
      .select({
        id: paymentsTable.id,
        customerId: paymentsTable.customerId,
        customerName: customersTable.name,
        paymentDate: paymentsTable.paymentDate,
        amount: paymentsTable.amount,
        paymentMode: paymentsTable.paymentMode,
        slipNumber: paymentsTable.slipNumber,
        notes: paymentsTable.notes,
        createdAt: paymentsTable.createdAt,
      })
      .from(paymentsTable)
      .innerJoin(
        customersTable,
        eq(paymentsTable.customerId, customersTable.id),
      )
      .where(
        and(
          eq(paymentsTable.id, id),
          eq(paymentsTable.organizationId, req.adminUser!.organizationId),
        ),
      );
    if (!row) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    const allocations = await db
      .select({
        invoiceId: paymentAllocationsTable.invoiceId,
        amount: paymentAllocationsTable.amount,
        invoiceNumber: invoicesTable.invoiceNumber,
      })
      .from(paymentAllocationsTable)
      .innerJoin(
        invoicesTable,
        eq(paymentAllocationsTable.invoiceId, invoicesTable.id),
      )
      .where(
        and(
          eq(
            paymentAllocationsTable.organizationId,
            req.adminUser!.organizationId,
          ),
          eq(paymentAllocationsTable.paymentId, id),
        ),
      );
    res.json({
      ...row,
      amount: Number(row.amount),
      allocations: allocations.map((a) => ({ ...a, amount: Number(a.amount) })),
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to get payment");
    res.status(500).json({ error: "Failed to fetch payment" });
  }
});

router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const organizationId = req.adminUser!.organizationId;
    const id = Number(req.params.id);
    const { paymentDate, amount, paymentMode, slipNumber, notes } = req.body;
    const numericAmount = Number(amount);
    if (
      !Number.isInteger(id) ||
      !paymentDate ||
      !paymentMode ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      res.status(400).json({ error: "Invalid payment data" });
      return;
    }
    const result = await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(paymentsTable)
        .where(
          and(
            eq(paymentsTable.id, id),
            eq(paymentsTable.organizationId, organizationId),
          ),
        );
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");
      const allocations = await tx
        .select()
        .from(paymentAllocationsTable)
        .where(
          and(
            eq(paymentAllocationsTable.organizationId, organizationId),
            eq(paymentAllocationsTable.paymentId, id),
          ),
        )
        .orderBy(asc(paymentAllocationsTable.id));
      if (!allocations.length) throw new Error("NO_ALLOCATIONS");
      const ids = [...new Set(allocations.map((a) => a.invoiceId))];
      const invoiceRows = await tx
        .select()
        .from(invoicesTable)
        .where(
          and(
            inArray(invoicesTable.id, ids),
            eq(invoicesTable.organizationId, organizationId),
          ),
        );
      if (invoiceRows.length !== ids.length) throw new Error("MISSING_INVOICE");
      const map = new Map(invoiceRows.map((i) => [i.id, i]));
      // Calculate balances as if this payment never existed. Do not mutate DB until validation passes.
      const restored = new Map<number, number>();
      for (const invoice of invoiceRows)
        restored.set(invoice.id, Number(invoice.outstandingBalance));
      for (const a of allocations) {
        const invoice = map.get(a.invoiceId)!;
        restored.set(
          a.invoiceId,
          Math.min(
            Number(invoice.billAmount),
            (restored.get(a.invoiceId) || 0) + Number(a.amount),
          ),
        );
      }
      const available = ids.reduce((sum, x) => sum + (restored.get(x) || 0), 0);
      if (numericAmount > available + 0.001) throw new Error("AMOUNT_TOO_HIGH");
      // Restore linked invoices, remove old allocations, then allocate edited amount again.
      for (const invoiceId of ids) {
        const invoice = map.get(invoiceId)!;
        const bal = restored.get(invoiceId) || 0;
        await tx
          .update(invoicesTable)
          .set({
            outstandingBalance: bal.toFixed(2),
            status: statusForBalance(
              bal,
              Number(invoice.billAmount),
              invoice.dueDate,
            ),
          })
          .where(
            and(
              eq(invoicesTable.id, invoiceId),
              eq(invoicesTable.organizationId, organizationId),
            ),
          );
      }
      await tx
        .delete(paymentAllocationsTable)
        .where(
          and(
            eq(paymentAllocationsTable.organizationId, organizationId),
            eq(paymentAllocationsTable.paymentId, id),
          ),
        );
      let remaining = numericAmount;
      for (const invoiceId of ids) {
        if (remaining <= 0.001) break;
        const invoice = map.get(invoiceId)!;
        const start = restored.get(invoiceId) || 0;
        const allocated = Math.min(remaining, start);
        const bal = start - allocated;
        await tx
          .update(invoicesTable)
          .set({
            outstandingBalance: Math.max(0, bal).toFixed(2),
            status: statusForBalance(
              bal,
              Number(invoice.billAmount),
              invoice.dueDate,
            ),
          })
          .where(
            and(
              eq(invoicesTable.id, invoiceId),
              eq(invoicesTable.organizationId, organizationId),
            ),
          );
        await tx
          .insert(paymentAllocationsTable)
          .values({
            organizationId,
            paymentId: id,
            invoiceId,
            amount: allocated.toFixed(2),
          });
        remaining -= allocated;
      }
      const [updated] = await tx
        .update(paymentsTable)
        .set({
          paymentDate,
          amount: numericAmount.toFixed(2),
          paymentMode,
          slipNumber: slipNumber?.trim() || null,
          notes: notes || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(paymentsTable.id, id),
            eq(paymentsTable.organizationId, organizationId),
          ),
        )
        .returning();
      return updated;
    });
    res.json({ ...result, amount: Number(result.amount) });
  } catch (err: any) {
    const code = err?.message;
    if (code === "PAYMENT_NOT_FOUND") {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    if (code === "NO_ALLOCATIONS") {
      res.status(400).json({
        error:
          "Old payment has no bill allocation. Delete it and record it again.",
      });
      return;
    }
    if (code === "MISSING_INVOICE") {
      res.status(400).json({
        error:
          "A linked bill no longer exists, so this payment cannot be edited safely.",
      });
      return;
    }
    if (code === "AMOUNT_TOO_HIGH") {
      res.status(400).json({
        error:
          "Edited amount is higher than the linked bills available balance.",
      });
      return;
    }
    req.log?.error({ err }, "Failed to edit payment");
    res.status(500).json({
      error: "Payment edit failed on server. Please retry after latest deploy.",
    });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const organizationId = req.adminUser!.organizationId;
    const id = Number(req.params.id);
    await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(paymentsTable)
        .where(
          and(
            eq(paymentsTable.id, id),
            eq(paymentsTable.organizationId, organizationId),
          ),
        );
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");
      const allocations = await tx
        .select()
        .from(paymentAllocationsTable)
        .where(
          and(
            eq(paymentAllocationsTable.organizationId, organizationId),
            eq(paymentAllocationsTable.paymentId, id),
          ),
        );
      for (const a of allocations) {
        const [invoice] = await tx
          .select()
          .from(invoicesTable)
          .where(
            and(
              eq(invoicesTable.id, a.invoiceId),
              eq(invoicesTable.organizationId, organizationId),
            ),
          );
        if (!invoice) continue;
        const bal = Math.min(
          Number(invoice.billAmount),
          Number(invoice.outstandingBalance) + Number(a.amount),
        );
        await tx
          .update(invoicesTable)
          .set({
            outstandingBalance: bal.toFixed(2),
            status: statusForBalance(
              bal,
              Number(invoice.billAmount),
              invoice.dueDate,
            ),
          })
          .where(
            and(
              eq(invoicesTable.id, invoice.id),
              eq(invoicesTable.organizationId, organizationId),
            ),
          );
      }
      await tx
        .delete(paymentAllocationsTable)
        .where(
          and(
            eq(paymentAllocationsTable.organizationId, organizationId),
            eq(paymentAllocationsTable.paymentId, id),
          ),
        );
      await tx
        .delete(paymentsTable)
        .where(
          and(
            eq(paymentsTable.id, id),
            eq(paymentsTable.organizationId, organizationId),
          ),
        );
    });
    res.json({ ok: true });
  } catch (err: any) {
    if (err?.message === "PAYMENT_NOT_FOUND") {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    req.log?.error({ err }, "Failed to delete payment");
    res.status(500).json({ error: "Failed to delete payment" });
  }
});
export default router;
