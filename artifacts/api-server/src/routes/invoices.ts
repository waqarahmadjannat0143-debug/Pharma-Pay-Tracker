import { Router } from "express";
import { db, customersTable, invoicesTable } from "@workspace/db";
import { eq, and, ilike, inArray, sql, desc, gte, lte } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";

const router = Router();
router.use(requireAuth as any);

function autoStatus(outstandingBalance: number, billAmount: number, dueDate: string): string {
  const today = new Date().toISOString().split("T")[0];
  if (outstandingBalance <= 0) return "paid";
  if (outstandingBalance < billAmount) return "partial";
  if (dueDate < today) return "overdue";
  return "pending";
}

router.get("/", async (req: AuthRequest, res) => {
  try {
    const { search, status, customerId, fromDate, toDate } = req.query;
    const conditions: any[] = [];
    if (customerId) conditions.push(eq(invoicesTable.customerId, parseInt(customerId as string)));
    if (status) conditions.push(eq(invoicesTable.status, status as string));
    if (fromDate) conditions.push(gte(invoicesTable.invoiceDate, fromDate as string));
    if (toDate) conditions.push(lte(invoicesTable.invoiceDate, toDate as string));

    const rows = await db
      .select({
        id: invoicesTable.id,
        customerId: invoicesTable.customerId,
        customerName: customersTable.name,
        invoiceNumber: invoicesTable.invoiceNumber,
        invoiceDate: invoicesTable.invoiceDate,
        billAmount: invoicesTable.billAmount,
        dueDate: invoicesTable.dueDate,
        outstandingBalance: invoicesTable.outstandingBalance,
        status: invoicesTable.status,
        createdAt: invoicesTable.createdAt,
      })
      .from(invoicesTable)
      .innerJoin(customersTable, eq(invoicesTable.customerId, customersTable.id))
      .where(
        and(
          ...conditions,
          search ? ilike(sql`CONCAT(${customersTable.name}, ' ', ${invoicesTable.invoiceNumber})`, `%${search}%`) : undefined
        )
      )
      .orderBy(desc(invoicesTable.invoiceDate));

    res.json(rows.map(r => ({
      ...r,
      billAmount: Number(r.billAmount),
      outstandingBalance: Number(r.outstandingBalance),
    })));
  } catch (err) {
    req.log?.error({ err }, "Failed to list invoices");
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.post("/", async (req: AuthRequest, res) => {
  try {
    const { customerId, invoiceNumber, invoiceDate, billAmount, dueDate } = req.body;
    const today = new Date().toISOString().split("T")[0];
    const status = dueDate < today ? "overdue" : "pending";
    const [invoice] = await db.insert(invoicesTable).values({
      customerId,
      invoiceNumber,
      invoiceDate,
      billAmount: String(billAmount),
      dueDate,
      outstandingBalance: String(billAmount),
      status,
    }).returning();
    const [customer] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, customerId));
    res.status(201).json({
      ...invoice,
      customerName: customer?.name || "",
      billAmount: Number(invoice.billAmount),
      outstandingBalance: Number(invoice.outstandingBalance),
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to create invoice");
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [row] = await db
      .select({
        id: invoicesTable.id,
        customerId: invoicesTable.customerId,
        customerName: customersTable.name,
        invoiceNumber: invoicesTable.invoiceNumber,
        invoiceDate: invoicesTable.invoiceDate,
        billAmount: invoicesTable.billAmount,
        dueDate: invoicesTable.dueDate,
        outstandingBalance: invoicesTable.outstandingBalance,
        status: invoicesTable.status,
        createdAt: invoicesTable.createdAt,
      })
      .from(invoicesTable)
      .innerJoin(customersTable, eq(invoicesTable.customerId, customersTable.id))
      .where(eq(invoicesTable.id, id));
    if (!row) { res.status(404).json({ error: "Invoice not found" }); return; }
    res.json({ ...row, billAmount: Number(row.billAmount), outstandingBalance: Number(row.outstandingBalance) });
  } catch (err) {
    req.log?.error({ err }, "Failed to get invoice");
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

router.patch("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { invoiceNumber, invoiceDate, billAmount, dueDate, status } = req.body;
    const updates: Record<string, any> = {};
    if (invoiceNumber !== undefined) updates.invoiceNumber = invoiceNumber;
    if (invoiceDate !== undefined) updates.invoiceDate = invoiceDate;
    if (billAmount !== undefined) updates.billAmount = String(billAmount);
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (status !== undefined) updates.status = status;

    const [updated] = await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Invoice not found" }); return; }
    const [customer] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, updated.customerId));
    res.json({
      ...updated,
      customerName: customer?.name || "",
      billAmount: Number(updated.billAmount),
      outstandingBalance: Number(updated.outstandingBalance),
    });
  } catch (err) {
    req.log?.error({ err }, "Failed to update invoice");
    res.status(500).json({ error: "Failed to update invoice" });
  }
});

router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
    res.json({ success: true, message: "Invoice deleted" });
  } catch (err) {
    req.log?.error({ err }, "Failed to delete invoice");
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

export default router;
