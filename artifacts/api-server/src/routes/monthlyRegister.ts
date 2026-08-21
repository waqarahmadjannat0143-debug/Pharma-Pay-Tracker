import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/authMiddleware";

const router = Router();
router.use(requireAuth as any);

function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, monthNo] = month.split("-").map(Number);
  const nextYear = monthNo === 12 ? year + 1 : year;
  const nextMonth = monthNo === 12 ? 1 : monthNo + 1;
  return { from: `${year}-${String(monthNo).padStart(2, "0")}-01`, to: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01` };
}

router.get("/:customerId", async (req: AuthRequest, res) => {
  try {
    const customerId = Number(req.params.customerId);
    const month = String(req.query.month || "");
    const range = monthRange(month);
    if (!Number.isInteger(customerId) || !range) { res.status(400).json({ error: "Valid store and month (YYYY-MM) are required" }); return; }
    const result = await db.execute(sql`
      select coalesce(a.id, 0)::int as "agencyId",
             coalesce(a.name, 'Unassigned Agency') as "agencyName",
             count(i.id)::int as "totalBills",
             coalesce(sum(i.bill_amount), 0)::float8 as "totalBillAmount",
             coalesce(sum(i.bill_amount - i.outstanding_balance), 0)::float8 as "totalPaid",
             coalesce(sum(i.outstanding_balance), 0)::float8 as "totalRemaining"
      from invoices i
      left join agencies a on a.id = i.agency_id
      where i.customer_id = ${customerId}
        and i.invoice_date >= ${range.from}::date and i.invoice_date < ${range.to}::date
      group by a.id, a.name
      order by coalesce(a.name, 'Unassigned Agency')
    `);
    const agencies = (result.rows as any[]).map(row => ({ ...row,
      status: Number(row.totalRemaining) <= .001 ? "paid" : Number(row.totalPaid) > .001 ? "partial" : "outstanding",
    }));
    const summary = agencies.reduce((out, row) => ({
      totalAgencies: out.totalAgencies + 1,
      totalBills: out.totalBills + Number(row.totalBills),
      totalBillAmount: out.totalBillAmount + Number(row.totalBillAmount),
      totalPaid: out.totalPaid + Number(row.totalPaid),
      totalRemaining: out.totalRemaining + Number(row.totalRemaining),
    }), { totalAgencies: 0, totalBills: 0, totalBillAmount: 0, totalPaid: 0, totalRemaining: 0 });
    res.json({ month, summary, agencies });
  } catch (err) { req.log?.error({ err }, "Failed monthly register"); res.status(500).json({ error: "Failed to load monthly register" }); }
});

router.get("/:customerId/agency/:agencyId", async (req: AuthRequest, res) => {
  try {
    const customerId = Number(req.params.customerId), agencyId = Number(req.params.agencyId);
    const month = String(req.query.month || ""), range = monthRange(month);
    if (!Number.isInteger(customerId) || !Number.isInteger(agencyId) || !range) { res.status(400).json({ error: "Invalid request" }); return; }
    const result = await db.execute(sql`
      select i.id, i.invoice_number as "invoiceNumber", i.invoice_date as "invoiceDate",
             i.bill_amount::float8 as "billAmount", (i.bill_amount-i.outstanding_balance)::float8 as "paidAmount",
             i.outstanding_balance::float8 as "remainingAmount", i.status,
             coalesce(a.name, 'Unassigned Agency') as "agencyName",
             lp.payment_date as "paymentDate", lp.payment_mode as "paymentMode",
             lp.slip_number as "slipNumber", lp.notes
      from invoices i left join agencies a on a.id=i.agency_id
      left join lateral (
        select p.payment_date, p.payment_mode, p.slip_number, p.notes
        from payment_allocations pa join payments p on p.id=pa.payment_id
        where pa.invoice_id=i.id order by p.payment_date desc, p.id desc limit 1
      ) lp on true
      where i.customer_id=${customerId}
        and (${agencyId}=0 and i.agency_id is null or i.agency_id=${agencyId})
        and i.invoice_date>=${range.from}::date and i.invoice_date<${range.to}::date
      order by i.invoice_date, i.id
    `);
    const bills = result.rows as any[];
    res.json({ month, agencyId, agencyName: bills[0]?.agencyName || "Agency", bills });
  } catch (err) { req.log?.error({ err }, "Failed agency bills"); res.status(500).json({ error: "Failed to load agency bills" }); }
});

export default router;
