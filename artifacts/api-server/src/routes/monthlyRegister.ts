import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";
const router = Router();
router.use(requireAuth as any);
function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, monthNo] = month.split("-").map(Number),
    nextYear = monthNo === 12 ? year + 1 : year,
    nextMonth = monthNo === 12 ? 1 : monthNo + 1;
  return {
    from: `${year}-${String(monthNo).padStart(2, "0")}-01`,
    to: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

router.get("/", async (req: AuthRequest, res) => {
  try {
    const organizationId = req.adminUser!.organizationId;
    const month = String(req.query.month || ""),
      range = monthRange(month);
    if (!range) {
      res.status(400).json({ error: "Valid month (YYYY-MM) is required" });
      return;
    }
    const result = await db.execute(
      sql`select c.id::int as "agencyId",c.name as "agencyName",count(i.id)::int as "totalBills",1::int as "totalStores",coalesce(sum(i.bill_amount),0)::float8 as "totalBillAmount",coalesce(sum(i.bill_amount-i.outstanding_balance),0)::float8 as "totalPaid",coalesce(sum(i.outstanding_balance),0)::float8 as "totalRemaining" from customers c left join invoices i on i.customer_id=c.id and i.organization_id=${organizationId} and i.invoice_date>=${range.from}::date and i.invoice_date<${range.to}::date where c.organization_id=${organizationId} group by c.id,c.name order by c.id`,
    );
    const agencies = (result.rows as any[]).map((row) => ({
      ...row,
      status:
        Number(row.totalBills) === 0
          ? "no_transaction"
          : Number(row.totalRemaining) <= 0.001
            ? "paid"
            : Number(row.totalPaid) > 0.001
              ? "partial"
              : "outstanding",
    }));
    const summary = agencies.reduce(
      (out, row) => ({
        totalAgencies: out.totalAgencies + 1,
        totalStores: out.totalStores + 1,
        totalBills: out.totalBills + Number(row.totalBills),
        totalBillAmount: out.totalBillAmount + Number(row.totalBillAmount),
        totalPaid: out.totalPaid + Number(row.totalPaid),
        totalRemaining: out.totalRemaining + Number(row.totalRemaining),
      }),
      {
        totalAgencies: 0,
        totalStores: 0,
        totalBills: 0,
        totalBillAmount: 0,
        totalPaid: 0,
        totalRemaining: 0,
      },
    );
    res.json({ month, summary, agencies });
  } catch (err) {
    req.log?.error({ err }, "Failed monthly register");
    res.status(500).json({ error: "Failed to load monthly register" });
  }
});

router.get("/agency/:agencyId", async (req: AuthRequest, res) => {
  try {
    const organizationId = req.adminUser!.organizationId;
    const agencyId = Number(req.params.agencyId),
      month = String(req.query.month || ""),
      range = monthRange(month);
    if (!Number.isInteger(agencyId) || !range) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    const result = await db.execute(
      sql`select i.id,i.invoice_number as "invoiceNumber",i.invoice_date as "invoiceDate",i.bill_amount::float8 as "billAmount",(i.bill_amount-i.outstanding_balance)::float8 as "paidAmount",i.outstanding_balance::float8 as "remainingAmount",i.status,c.name as "storeName",c.name as "agencyName",lp.payment_date as "paymentDate",lp.payment_mode as "paymentMode",lp.slip_number as "slipNumber",lp.notes from invoices i join customers c on c.id=i.customer_id and c.organization_id=${organizationId} left join lateral(select p.payment_date,p.payment_mode,p.slip_number,p.notes from payment_allocations pa join payments p on p.id=pa.payment_id and p.organization_id=${organizationId} where pa.organization_id=${organizationId} and pa.invoice_id=i.id order by p.payment_date desc,p.id desc limit 1)lp on true where i.organization_id=${organizationId} and i.customer_id=${agencyId} and i.invoice_date>=${range.from}::date and i.invoice_date<${range.to}::date order by i.invoice_date,i.id`,
    );
    const bills = result.rows as any[];
    res.json({
      month,
      agencyId,
      agencyName: bills[0]?.agencyName || "Agency",
      bills,
    });
  } catch (err) {
    req.log?.error({ err }, "Failed agency bills");
    res.status(500).json({ error: "Failed to load agency bills" });
  }
});
export default router;
