import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform, Alert } from "react-native";

function formatCurrency(amount: number) {
  return "\u20B9" + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function statusColor(status: string) {
  switch (status) {
    case "paid": return "#16a34a";
    case "partial": return "#d97706";
    case "overdue": return "#dc2626";
    default: return "#2563eb";
  }
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export async function generateInvoicePdf(invoice: {
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  billAmount: number;
  outstandingBalance: number;
  status: string;
  notes?: string | null;
}) {
  const paid = invoice.billAmount - invoice.outstandingBalance;
  const isOverdue = invoice.status === "overdue";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; }
    .page { max-width: 680px; margin: 0 auto; background: #fff; padding: 0; }
    .header { background: ${isOverdue ? "#dc2626" : "#1565C0"}; padding: 40px 36px 32px; color: #fff; }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 24px; opacity: 0.95; }
    .brand span { font-size: 11px; font-weight: 400; display: block; opacity: 0.7; margin-top: 2px; letter-spacing: 0; }
    .invoice-title { font-size: 13px; opacity: 0.75; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .invoice-number { font-size: 28px; font-weight: 800; letter-spacing: -1px; }
    .header-grid { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; }
    .customer-block { }
    .customer-label { font-size: 11px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .customer-name { font-size: 16px; font-weight: 700; }
    .amount-block { text-align: right; }
    .amount-label { font-size: 11px; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .amount-value { font-size: 30px; font-weight: 800; letter-spacing: -1px; }
    .status-badge {
      display: inline-block; padding: 4px 14px; border-radius: 99px;
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      background: ${statusColor(invoice.status)}22;
      color: ${statusColor(invoice.status)};
      border: 1.5px solid ${statusColor(invoice.status)}55;
      margin-top: 8px;
    }
    .body { padding: 32px 36px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    .info-table tr { border-bottom: 1px solid #f1f5f9; }
    .info-table tr:last-child { border-bottom: none; }
    .info-table td { padding: 11px 0; font-size: 14px; }
    .info-table td:first-child { color: #64748b; font-weight: 500; }
    .info-table td:last-child { text-align: right; font-weight: 600; color: #1e293b; }
    .overdue-value { color: #dc2626 !important; }
    .paid-value { color: #16a34a !important; }
    .summary-box { background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 28px; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .summary-row.total { border-top: 1.5px solid #e2e8f0; margin-top: 8px; padding-top: 12px; }
    .summary-row.total td, .summary-row.total span { font-size: 16px; font-weight: 800; color: #1e293b; }
    .outstanding { color: ${isOverdue ? "#dc2626" : "#d97706"}; }
    .notes-box { background: #fefce8; border-left: 3px solid #fbbf24; border-radius: 6px; padding: 14px 16px; margin-bottom: 20px; font-size: 13px; color: #78350f; line-height: 1.5; }
    .footer { border-top: 1px solid #e2e8f0; padding: 20px 36px; display: flex; justify-content: space-between; align-items: center; color: #94a3b8; font-size: 11px; }
    .footer strong { color: #1565C0; font-weight: 700; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">
      MedPay
      <span>Medical Agency Payment Manager</span>
    </div>
    <div class="invoice-title">Invoice</div>
    <div class="invoice-number">#${invoice.invoiceNumber}</div>
    <div class="header-grid">
      <div class="customer-block">
        <div class="customer-label">Billed To</div>
        <div class="customer-name">${invoice.customerName}</div>
        <div class="status-badge">${statusLabel(invoice.status)}</div>
      </div>
      <div class="amount-block">
        <div class="amount-label">Bill Amount</div>
        <div class="amount-value">${formatCurrency(invoice.billAmount)}</div>
      </div>
    </div>
  </div>

  <div class="body">
    <div class="section-title">Invoice Details</div>
    <table class="info-table">
      <tr><td>Invoice Date</td><td>${formatDate(invoice.invoiceDate)}</td></tr>
      <tr><td>Due Date</td><td class="${isOverdue ? "overdue-value" : ""}">${formatDate(invoice.dueDate)}</td></tr>
      <tr><td>Customer</td><td>${invoice.customerName}</td></tr>
    </table>

    <div class="section-title">Payment Summary</div>
    <div class="summary-box">
      <div class="summary-row"><span>Bill Amount</span><span>${formatCurrency(invoice.billAmount)}</span></div>
      <div class="summary-row"><span style="color:#16a34a">Amount Paid</span><span class="paid-value">${formatCurrency(paid)}</span></div>
      <div class="summary-row total"><span>Outstanding Balance</span><span class="outstanding">${formatCurrency(invoice.outstandingBalance)}</span></div>
    </div>

    ${invoice.notes ? `<div class="section-title">Notes</div><div class="notes-box">${invoice.notes}</div>` : ""}
  </div>

  <div class="footer">
    <span>Generated by <strong>MedPay</strong></span>
    <span>${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>
  </div>
</div>
</body>
</html>`;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    if (Platform.OS === "web") {
      Alert.alert("PDF Ready", "Use the print dialog to save as PDF.");
      await Print.printAsync({ html });
      return;
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Invoice #${invoice.invoiceNumber}`,
        UTI: "com.adobe.pdf",
      });
    } else {
      Alert.alert("PDF Saved", `Invoice saved to: ${uri}`);
    }
  } catch (err: any) {
    Alert.alert("Error", "Could not generate PDF. Please try again.");
  }
}

export async function generateReceiptPdf(payment: {
  id: number;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  referenceNumber?: string | null;
  notes?: string | null;
}) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1e293b; background: #fff; }
    .page { max-width: 400px; margin: 0 auto; padding: 0; }
    .header { background: #1565C0; padding: 32px 28px 24px; color: #fff; text-align: center; }
    .brand { font-size: 20px; font-weight: 800; margin-bottom: 20px; }
    .receipt-title { font-size: 12px; opacity: 0.75; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .amount { font-size: 36px; font-weight: 800; letter-spacing: -1px; }
    .badge { display: inline-block; background: #16a34a22; color: #16a34a; border: 1.5px solid #16a34a55; border-radius: 99px; padding: 3px 14px; font-size: 12px; font-weight: 700; margin-top: 10px; text-transform: uppercase; }
    .body { padding: 28px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .row span:first-child { color: #64748b; }
    .row span:last-child { font-weight: 600; }
    .footer { text-align: center; padding: 16px 28px 24px; color: #94a3b8; font-size: 11px; }
    .footer strong { color: #1565C0; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="brand">MedPay</div>
    <div class="receipt-title">Payment Receipt</div>
    <div class="amount">${formatCurrency(payment.amount)}</div>
    <div class="badge">Received</div>
  </div>
  <div class="body">
    <div class="row"><span>Customer</span><span>${payment.customerName}</span></div>
    <div class="row"><span>Date</span><span>${formatDate(payment.paymentDate)}</span></div>
    <div class="row"><span>Payment Mode</span><span>${payment.paymentMode.toUpperCase()}</span></div>
    ${payment.referenceNumber ? `<div class="row"><span>Reference No.</span><span>${payment.referenceNumber}</span></div>` : ""}
    ${payment.notes ? `<div class="row"><span>Notes</span><span>${payment.notes}</span></div>` : ""}
    <div class="row"><span>Receipt No.</span><span>RCP-${String(payment.id).padStart(5, "0")}</span></div>
  </div>
  <div class="footer">
    Generated by <strong>MedPay</strong> &bull; ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
  </div>
</div>
</body>
</html>`;

  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    if (Platform.OS === "web") {
      await Print.printAsync({ html });
      return;
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Receipt - ${payment.customerName}`,
        UTI: "com.adobe.pdf",
      });
    } else {
      Alert.alert("Receipt Saved", `Saved to: ${uri}`);
    }
  } catch (err: any) {
    Alert.alert("Error", "Could not generate receipt. Please try again.");
  }
}
