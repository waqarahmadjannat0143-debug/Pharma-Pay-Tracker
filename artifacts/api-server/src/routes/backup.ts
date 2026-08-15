import { Router } from "express";
import { sql } from "drizzle-orm";
import {
  db,
  customersTable,
  invoicesTable,
  paymentsTable,
  paymentAllocationsTable,
} from "@workspace/db";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";

const router = Router();
router.use(requireAuth as any);

const BACKUP_VERSION = 1;

router.get("/export", async (req: AuthRequest, res) => {
  try {
    const [customers, invoices, payments, paymentAllocations] = await Promise.all([
      db.select().from(customersTable),
      db.select().from(invoicesTable),
      db.select().from(paymentsTable),
      db.select().from(paymentAllocationsTable),
    ]);

    res.json({
      app: "MedPay",
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      data: { customers, invoices, payments, paymentAllocations },
      counts: {
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
    const backup = req.body;
    if (
      !backup ||
      backup.app !== "MedPay" ||
      backup.version !== BACKUP_VERSION ||
      !backup.data ||
      !Array.isArray(backup.data.customers) ||
      !Array.isArray(backup.data.invoices) ||
      !Array.isArray(backup.data.payments) ||
      !Array.isArray(backup.data.paymentAllocations)
    ) {
      res.status(400).json({ error: "Invalid or unsupported MedPay backup file" });
      return;
    }

    const customers = backup.data.customers.map((row: any) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
    const invoices = backup.data.invoices.map((row: any) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
    const payments = backup.data.payments.map((row: any) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
    const paymentAllocations = backup.data.paymentAllocations.map((row: any) => ({
      ...row,
      createdAt: new Date(row.createdAt),
    }));

    const hasInvalidDate = [...customers, ...invoices, ...payments, ...paymentAllocations].some((row: any) =>
      row.createdAt instanceof Date && Number.isNaN(row.createdAt.getTime())
    );
    if (hasInvalidDate) {
      res.status(400).json({ error: "Backup contains invalid timestamps" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(paymentAllocationsTable);
      await tx.delete(paymentsTable);
      await tx.delete(invoicesTable);
      await tx.delete(customersTable);

      if (customers.length) await tx.insert(customersTable).values(customers);
      if (invoices.length) await tx.insert(invoicesTable).values(invoices);
      if (payments.length) await tx.insert(paymentsTable).values(payments);
      if (paymentAllocations.length) await tx.insert(paymentAllocationsTable).values(paymentAllocations);

      await tx.execute(sql`SELECT setval(pg_get_serial_sequence('customers','id'), COALESCE((SELECT MAX(id) FROM customers), 1), (SELECT COUNT(*) > 0 FROM customers))`);
      await tx.execute(sql`SELECT setval(pg_get_serial_sequence('invoices','id'), COALESCE((SELECT MAX(id) FROM invoices), 1), (SELECT COUNT(*) > 0 FROM invoices))`);
      await tx.execute(sql`SELECT setval(pg_get_serial_sequence('payments','id'), COALESCE((SELECT MAX(id) FROM payments), 1), (SELECT COUNT(*) > 0 FROM payments))`);
      await tx.execute(sql`SELECT setval(pg_get_serial_sequence('payment_allocations','id'), COALESCE((SELECT MAX(id) FROM payment_allocations), 1), (SELECT COUNT(*) > 0 FROM payment_allocations))`);
    });

    res.json({
      ok: true,
      restored: {
        customers: customers.length,
        invoices: invoices.length,
        payments: payments.length,
        paymentAllocations: paymentAllocations.length,
      },
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to restore backup");
    res.status(500).json({ error: "Failed to restore backup" });
  }
});

export default router;
