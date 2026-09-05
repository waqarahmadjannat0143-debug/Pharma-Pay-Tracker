import { Router } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  agenciesTable,
  customersTable,
  invoicesTable,
  paymentsTable,
  paymentAllocationsTable,
} from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";
const router = Router();
router.use(requireAuth as any);
const BACKUP_VERSION = 3;

router.get("/export", async (req: AuthRequest, res) => {
  try {
    const organizationId = req.adminUser!.organizationId;
    const [agencies, customers, invoices, payments, paymentAllocations] =
      await Promise.all([
        db
          .select()
          .from(agenciesTable)
          .where(eq(agenciesTable.organizationId, organizationId)),
        db
          .select()
          .from(customersTable)
          .where(eq(customersTable.organizationId, organizationId)),
        db
          .select()
          .from(invoicesTable)
          .where(eq(invoicesTable.organizationId, organizationId)),
        db
          .select()
          .from(paymentsTable)
          .where(eq(paymentsTable.organizationId, organizationId)),
        db
          .select()
          .from(paymentAllocationsTable)
          .where(eq(paymentAllocationsTable.organizationId, organizationId)),
      ]);
    res.json({
      app: "MedPay",
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      data: { agencies, customers, invoices, payments, paymentAllocations },
      counts: {
        agencies: agencies.length,
        customers: customers.length,
        invoices: invoices.length,
        payments: payments.length,
        paymentAllocations: paymentAllocations.length,
      },
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to create backup");
    res.status(500).json({ error: "Failed to create backup" });
  }
});

router.post("/restore", async (req: AuthRequest, res) => {
  try {
    const organizationId = req.adminUser!.organizationId,
      b = req.body,
      d = b?.data;
    if (
      !b ||
      b.app !== "MedPay" ||
      ![1, 2, 3].includes(b.version) ||
      !d ||
      ![d.customers, d.invoices, d.payments, d.paymentAllocations].every(
        Array.isArray,
      )
    ) {
      res
        .status(400)
        .json({ error: "Invalid or unsupported MedPay backup file" });
      return;
    }
    const agencies = Array.isArray(d.agencies) ? d.agencies : [];
    const restored = await db.transaction(async (tx) => {
      await tx
        .delete(paymentAllocationsTable)
        .where(eq(paymentAllocationsTable.organizationId, organizationId));
      await tx
        .delete(paymentsTable)
        .where(eq(paymentsTable.organizationId, organizationId));
      await tx
        .delete(invoicesTable)
        .where(eq(invoicesTable.organizationId, organizationId));
      await tx
        .delete(customersTable)
        .where(eq(customersTable.organizationId, organizationId));
      await tx
        .delete(agenciesTable)
        .where(eq(agenciesTable.organizationId, organizationId));
      const agencyMap = new Map<number, number>(),
        customerMap = new Map<number, number>(),
        invoiceMap = new Map<number, number>(),
        paymentMap = new Map<number, number>();
      for (const row of agencies) {
        const oldId = Number(row.id);
        const [created] = await tx
          .insert(agenciesTable)
          .values({
            organizationId,
            name: String(row.name),
            normalizedName: String(row.normalizedName),
          })
          .returning({ id: agenciesTable.id });
        agencyMap.set(oldId, created.id);
      }
      for (const [index, row] of d.customers.entries()) {
        const oldId = Number(row.id),
          [created] = await tx
            .insert(customersTable)
            .values({
              organizationId,
              name: String(row.name),
              ownerName: String(row.ownerName),
              mobile: String(row.mobile),
              gstNumber: row.gstNumber || null,
              address: String(row.address),
              creditLimit: String(row.creditLimit || 0),
              dueDays: Number(row.dueDays || 30),
              serialNumber: Number(row.serialNumber || index + 1),
              registerNumber: Number(row.registerNumber || index + 1),
            })
            .returning({ id: customersTable.id });
        customerMap.set(oldId, created.id);
      }
      for (const row of d.invoices) {
        const customerId = customerMap.get(Number(row.customerId));
        if (!customerId) throw new Error("INVALID_CUSTOMER_REFERENCE");
        const oldId = Number(row.id),
          agencyId = row.agencyId
            ? agencyMap.get(Number(row.agencyId)) || null
            : null,
          [created] = await tx
            .insert(invoicesTable)
            .values({
              organizationId,
              customerId,
              agencyId,
              invoiceNumber: String(row.invoiceNumber),
              invoiceDate: String(row.invoiceDate),
              billAmount: String(row.billAmount),
              dueDate: String(row.dueDate),
              outstandingBalance: String(row.outstandingBalance),
              status: String(row.status || "pending"),
            })
            .returning({ id: invoicesTable.id });
        invoiceMap.set(oldId, created.id);
      }
      for (const row of d.payments) {
        const customerId = customerMap.get(Number(row.customerId));
        if (!customerId) throw new Error("INVALID_CUSTOMER_REFERENCE");
        const oldId = Number(row.id),
          [created] = await tx
            .insert(paymentsTable)
            .values({
              organizationId,
              customerId,
              paymentDate: String(row.paymentDate),
              amount: String(row.amount),
              paymentMode: String(row.paymentMode),
              slipNumber: row.slipNumber || null,
              notes: row.notes || null,
            })
            .returning({ id: paymentsTable.id });
        paymentMap.set(oldId, created.id);
      }
      for (const row of d.paymentAllocations) {
        const paymentId = paymentMap.get(Number(row.paymentId)),
          invoiceId = invoiceMap.get(Number(row.invoiceId));
        if (!paymentId || !invoiceId)
          throw new Error("INVALID_ALLOCATION_REFERENCE");
        await tx.insert(paymentAllocationsTable).values({
          organizationId,
          paymentId,
          invoiceId,
          amount: String(row.amount),
        });
      }
      return {
        agencies: agencies.length,
        customers: d.customers.length,
        invoices: d.invoices.length,
        payments: d.payments.length,
        paymentAllocations: d.paymentAllocations.length,
      };
    });
    res.json({ ok: true, restored });
  } catch (err: any) {
    if (String(err?.message).startsWith("INVALID_")) {
      res.status(400).json({ error: "Backup contains broken record links" });
      return;
    }
    req.log?.error({ err }, "Failed to restore backup");
    res.status(500).json({ error: "Failed to restore backup" });
  }
});
export default router;
