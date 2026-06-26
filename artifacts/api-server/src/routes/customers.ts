import { Router } from "express";
import { db, customersTable, invoicesTable, paymentsTable } from "@workspace/db";
import { eq, ilike, sql, desc, and, asc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";
import { logger } from "../lib/logger";

const router = Router();
router.use(requireAuth as any);

router.get("/", async (req: AuthRequest, res) => {
  try {
    const search = req.query.search as string | undefined;
    const rows = await db
      .select({
        id: customersTable.id,
        name: customersTable.name,
        ownerName: customersTable.ownerName,
        mobile: customersTable.mobile,
        gstNumber: customersTable.gstNumber,
        address: customersTable.address,
        creditLimit: customersTable.creditLimit,
        dueDays: customersTable.dueDays,
        createdAt: customersTable.createdAt,
        totalOutstanding: sql<number>`COALESCE(SUM(CASE WHEN ${invoicesTable.outstandingBalance}::numeric > 0 THEN ${invoicesTable.outstandingBalance}::numeric ELSE 0 END), 0)`,
      })
      .from(customersTable)
      .leftJoin(invoicesTable, eq(invoicesTable.customerId, customersTable.id))
      .where(search ? ilike(customersTable.name, `%${search}%`) : undefined)
      .groupBy(customersTable.id)
      .orderBy(asc(customersTable.name));

    res.json(rows.map(r => ({
      ...r,
      creditLimit: Number(r.creditLimit),
      totalOutstanding: Number(r.totalOutstanding),
    })));
  } catch (err) {
    req.log?.error({ err }, "Failed to list customers");
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const { name, ownerName, mobile, gstNumber, address, creditLimit, dueDays } = req.body;
    const [customer] = await db.insert(customersTable).values({
      name, ownerName, mobile, gstNumber: gstNumber || null, address,
      creditLimit: String(creditLimit || 0),
      dueDays: dueDays || 30,
    }).returning();
    res.status(201).json({ ...customer, creditLimit: Number(customer.creditLimit), totalOutstanding: 0 });
  } catch (err) {
    req.log?.error({ err }, "Failed to create customer");
    res.status(500).json({ error: "Failed to create customer" });
  }
});

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [row] = await db
      .select({
        id: customersTable.id,
        name: customersTable.name,
        ownerName: customersTable.ownerName,
        mobile: customersTable.mobile,
        gstNumber: customersTable.gstNumber,
        address: customersTable.address,
        creditLimit: customersTable.creditLimit,
        dueDays: customersTable.dueDays,
        createdAt: customersTable.createdAt,
        totalOutstanding: sql<number>`COALESCE(SUM(CASE WHEN ${invoicesTable.outstandingBalance}::numeric > 0 THEN ${invoicesTable.outstandingBalance}::numeric ELSE 0 END), 0)`,
      })
      .from(customersTable)
      .leftJoin(invoicesTable, eq(invoicesTable.customerId, customersTable.id))
      .where(eq(customersTable.id, id))
      .groupBy(customersTable.id);

    if (!row) { res.status(404).json({ error: "Customer not found" }); return; }
    res.json({ ...row, creditLimit: Number(row.creditLimit), totalOutstanding: Number(row.totalOutstanding) });
  } catch (err) {
    req.log?.error({ err }, "Failed to get customer");
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

router.patch("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, ownerName, mobile, gstNumber, address, creditLimit, dueDays } = req.body;
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (ownerName !== undefined) updates.ownerName = ownerName;
    if (mobile !== undefined) updates.mobile = mobile;
    if (gstNumber !== undefined) updates.gstNumber = gstNumber || null;
    if (address !== undefined) updates.address = address;
    if (creditLimit !== undefined) updates.creditLimit = String(creditLimit);
    if (dueDays !== undefined) updates.dueDays = dueDays;

    const [updated] = await db.update(customersTable).set(updates).where(eq(customersTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Customer not found" }); return; }

    const [row] = await db
      .select({
        id: customersTable.id,
        name: customersTable.name,
        ownerName: customersTable.ownerName,
        mobile: customersTable.mobile,
        gstNumber: customersTable.gstNumber,
        address: customersTable.address,
        creditLimit: customersTable.creditLimit,
        dueDays: customersTable.dueDays,
        createdAt: customersTable.createdAt,
        totalOutstanding: sql<number>`COALESCE(SUM(CASE WHEN ${invoicesTable.outstandingBalance}::numeric > 0 THEN ${invoicesTable.outstandingBalance}::numeric ELSE 0 END), 0)`,
      })
      .from(customersTable)
      .leftJoin(invoicesTable, eq(invoicesTable.customerId, customersTable.id))
      .where(eq(customersTable.id, id))
      .groupBy(customersTable.id);

    res.json({ ...row, creditLimit: Number(row.creditLimit), totalOutstanding: Number(row.totalOutstanding) });
  } catch (err) {
    req.log?.error({ err }, "Failed to update customer");
    res.status(500).json({ error: "Failed to update customer" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.delete(customersTable).where(eq(customersTable.id, id));
    res.json({ success: true, message: "Customer deleted" });
  } catch (err) {
    req.log?.error({ err }, "Failed to delete customer");
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

router.get("/:id/ledger", async (req: AuthRequest, res) => {
  try {
    const customerId = parseInt(req.params.id as string);
    const invoices = await db.select().from(invoicesTable)
      .where(eq(invoicesTable.customerId, customerId))
      .orderBy(asc(invoicesTable.invoiceDate));
    const payments = await db.select().from(paymentsTable)
      .where(eq(paymentsTable.customerId, customerId))
      .orderBy(asc(paymentsTable.paymentDate));

    const entries: any[] = [];
    invoices.forEach(inv => entries.push({ date: inv.invoiceDate, type: "invoice", invoiceNumber: inv.invoiceNumber, amount: Number(inv.billAmount), balance: 0, notes: null }));
    payments.forEach(pay => entries.push({ date: pay.paymentDate, type: "payment", invoiceNumber: null, amount: Number(pay.amount), balance: 0, notes: pay.notes }));
    entries.sort((a, b) => a.date.localeCompare(b.date));

    let balance = 0;
    entries.forEach(e => {
      if (e.type === "invoice") balance += e.amount;
      else balance -= e.amount;
      e.balance = balance;
    });

    res.json(entries);
  } catch (err) {
    req.log?.error({ err }, "Failed to get ledger");
    res.status(500).json({ error: "Failed to fetch ledger" });
  }
});

router.get("/:id/invoices", async (req: AuthRequest, res) => {
  try {
    const customerId = parseInt(req.params.id as string);
    const [customer] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, customerId));
    const invoices = await db.select().from(invoicesTable)
      .where(eq(invoicesTable.customerId, customerId))
      .orderBy(desc(invoicesTable.invoiceDate));
    res.json(invoices.map(inv => ({
      ...inv,
      customerName: customer?.name || "",
      billAmount: Number(inv.billAmount),
      outstandingBalance: Number(inv.outstandingBalance),
    })));
  } catch (err) {
    req.log?.error({ err }, "Failed to get customer invoices");
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

export default router;
