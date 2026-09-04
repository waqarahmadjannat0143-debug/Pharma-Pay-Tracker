import { Router } from "express";
import {
  db,
  customersTable,
  invoicesTable,
  agenciesTable,
} from "@workspace/db";
import { eq, and, ilike, sql, desc, gte, lte } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";
const router = Router();
router.use(requireAuth as any);
const indiaToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
const statusFor = (balance: number, bill: number, due: string) =>
  balance <= 0.001
    ? "paid"
    : due < indiaToday()
      ? "overdue"
      : balance < bill - 0.001
        ? "partial"
        : "pending";
const fields = {
  id: invoicesTable.id,
  customerId: invoicesTable.customerId,
  customerName: customersTable.name,
  agencyId: invoicesTable.agencyId,
  agencyName: agenciesTable.name,
  invoiceNumber: invoicesTable.invoiceNumber,
  invoiceDate: invoicesTable.invoiceDate,
  billAmount: invoicesTable.billAmount,
  dueDate: invoicesTable.dueDate,
  outstandingBalance: invoicesTable.outstandingBalance,
  status: invoicesTable.status,
  createdAt: invoicesTable.createdAt,
};
router.get("/", async (req: AuthRequest, res) => {
  try {
    const { search, status, customerId, fromDate, toDate } = req.query,
      c: any[] = [
        eq(invoicesTable.organizationId, req.adminUser!.organizationId),
      ];
    if (customerId) c.push(eq(invoicesTable.customerId, Number(customerId)));
    if (status)
      c.push(
        status === "overdue"
          ? sql`${invoicesTable.outstandingBalance}::numeric > 0 AND ${invoicesTable.dueDate}::date < (NOW() AT TIME ZONE 'Asia/Kolkata')::date`
          : eq(invoicesTable.status, String(status)),
      );
    if (fromDate) c.push(gte(invoicesTable.invoiceDate, String(fromDate)));
    if (toDate) c.push(lte(invoicesTable.invoiceDate, String(toDate)));
    const rows = await db
      .select(fields)
      .from(invoicesTable)
      .innerJoin(
        customersTable,
        and(
          eq(invoicesTable.customerId, customersTable.id),
          eq(customersTable.organizationId, req.adminUser!.organizationId),
        ),
      )
      .leftJoin(
        agenciesTable,
        and(
          eq(invoicesTable.agencyId, agenciesTable.id),
          eq(agenciesTable.organizationId, req.adminUser!.organizationId),
        ),
      )
      .where(
        and(
          ...c,
          search
            ? ilike(
                sql`concat(${customersTable.name},' ',coalesce(${agenciesTable.name},''),' ',${invoicesTable.invoiceNumber})`,
                `%${search}%`,
              )
            : undefined,
        ),
      )
      .orderBy(desc(invoicesTable.invoiceDate));
    res.json(
      rows.map((r) => {
        const billAmount = Number(r.billAmount),
          outstandingBalance = Number(r.outstandingBalance);
        return {
          ...r,
          billAmount,
          outstandingBalance,
          status: statusFor(outstandingBalance, billAmount, r.dueDate),
        };
      }),
    );
  } catch (err) {
    req.log?.error({ err });
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});
router.post("/", async (req: AuthRequest, res) => {
  try {
    const organizationId = req.adminUser!.organizationId,
      { customerId, invoiceNumber, invoiceDate, billAmount, dueDate } =
        req.body;
    if (
      !customerId ||
      !invoiceNumber ||
      !invoiceDate ||
      !dueDate ||
      Number(billAmount) <= 0
    ) {
      res
        .status(400)
        .json({ error: "Store and valid bill details are required" });
      return;
    }
    const [customer] = await db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.id, Number(customerId)),
          eq(customersTable.organizationId, organizationId),
        ),
      );
    if (!customer) {
      res.status(400).json({ error: "Invalid store" });
      return;
    }
    const [invoice] = await db
      .insert(invoicesTable)
      .values({
        organizationId,
        customerId: Number(customerId),
        invoiceNumber: String(invoiceNumber).trim(),
        invoiceDate,
        billAmount: String(billAmount),
        dueDate,
        outstandingBalance: String(billAmount),
        status: statusFor(Number(billAmount), Number(billAmount), dueDate),
      })
      .returning();
    res
      .status(201)
      .json({
        ...invoice,
        billAmount: Number(invoice.billAmount),
        outstandingBalance: Number(invoice.outstandingBalance),
      });
  } catch (err) {
    req.log?.error({ err });
    res.status(500).json({ error: "Failed to create invoice" });
  }
});
router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const [row] = await db
      .select(fields)
      .from(invoicesTable)
      .innerJoin(
        customersTable,
        eq(invoicesTable.customerId, customersTable.id),
      )
      .leftJoin(agenciesTable, eq(invoicesTable.agencyId, agenciesTable.id))
      .where(
        and(
          eq(invoicesTable.id, Number(req.params.id)),
          eq(invoicesTable.organizationId, req.adminUser!.organizationId),
        ),
      );
    if (!row) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    const billAmount = Number(row.billAmount),
      outstandingBalance = Number(row.outstandingBalance);
    res.json({
      ...row,
      billAmount,
      outstandingBalance,
      status: statusFor(outstandingBalance, billAmount, row.dueDate),
    });
  } catch (err) {
    req.log?.error({ err });
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});
router.patch("/:id", async (req: AuthRequest, res) => {
  try {
    const organizationId = req.adminUser!.organizationId,
      id = Number(req.params.id),
      [old] = await db
        .select()
        .from(invoicesTable)
        .where(
          and(
            eq(invoicesTable.id, id),
            eq(invoicesTable.organizationId, organizationId),
          ),
        );
    if (!old) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    const paid = Number(old.billAmount) - Number(old.outstandingBalance),
      bill =
        req.body.billAmount === undefined
          ? Number(old.billAmount)
          : Number(req.body.billAmount),
      due = req.body.dueDate ?? old.dueDate;
    if (!Number.isFinite(bill) || bill <= 0 || bill + 0.001 < paid) {
      res
        .status(400)
        .json({ error: "Bill amount cannot be less than already paid amount" });
      return;
    }
    const balance = Math.max(0, bill - paid),
      updates: any = {
        billAmount: String(bill),
        outstandingBalance: String(balance),
        status: statusFor(balance, bill, due),
      };
    for (const key of ["invoiceNumber", "invoiceDate", "dueDate"]) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.agencyId !== undefined) {
      const agencyId = Number(req.body.agencyId) || null;
      if (agencyId) {
        const [a] = await db
          .select({ id: agenciesTable.id })
          .from(agenciesTable)
          .where(
            and(
              eq(agenciesTable.id, agencyId),
              eq(agenciesTable.organizationId, organizationId),
            ),
          );
        if (!a) {
          res.status(400).json({ error: "Invalid agency" });
          return;
        }
      }
      updates.agencyId = agencyId;
    }
    const [updated] = await db
      .update(invoicesTable)
      .set(updates)
      .where(
        and(
          eq(invoicesTable.id, id),
          eq(invoicesTable.organizationId, organizationId),
        ),
      )
      .returning();
    res.json({
      ...updated,
      billAmount: Number(updated.billAmount),
      outstandingBalance: Number(updated.outstandingBalance),
    });
  } catch (err) {
    req.log?.error({ err });
    res.status(500).json({ error: "Failed to update invoice" });
  }
});
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await db
      .delete(invoicesTable)
      .where(
        and(
          eq(invoicesTable.id, Number(req.params.id)),
          eq(invoicesTable.organizationId, req.adminUser!.organizationId),
        ),
      );
    res.json({ success: true });
  } catch (err) {
    req.log?.error({ err });
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});
export default router;
