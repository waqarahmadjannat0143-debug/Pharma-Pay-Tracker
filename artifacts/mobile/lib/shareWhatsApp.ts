import { Linking, Alert, Platform } from "react-native";

function fmt(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const statusLabel: Record<string, string> = {
  pending: "Pending",
  partial: "Partially Paid",
  paid: "Paid ✅",
  overdue: "Overdue ⚠️",
};

export interface InvoiceShareData {
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  billAmount: number;
  outstandingBalance: number;
  status: string;
  phone?: string;
}

export interface ReceiptShareData {
  id: number;
  customerName: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  referenceNumber?: string;
  notes?: string;
  phone?: string;
}

const modeLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};

async function openWhatsApp(phone: string | undefined, text: string) {
  const encoded = encodeURIComponent(text);
  const urls =
    phone && phone.length >= 10
      ? [
          `whatsapp://send?phone=91${phone.replace(/\D/g, "")}&text=${encoded}`,
          `https://wa.me/91${phone.replace(/\D/g, "")}?text=${encoded}`,
        ]
      : [
          `whatsapp://send?text=${encoded}`,
          `https://wa.me/?text=${encoded}`,
        ];

  for (const url of urls) {
    const canOpen =
      Platform.OS === "web" ? true : await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return;
    }
  }

  Alert.alert(
    "WhatsApp Not Found",
    "Please install WhatsApp to share via it, or copy the message manually.",
    [{ text: "OK" }]
  );
}

export async function shareInvoiceOnWhatsApp(data: InvoiceShareData) {
  const paidAmount = data.billAmount - data.outstandingBalance;
  const lines = [
    `*📄 Invoice from MedPay*`,
    ``,
    `Invoice No: *#${data.invoiceNumber}*`,
    `Store: ${data.customerName}`,
    `Date: ${fmtDate(data.invoiceDate)}`,
    `Due Date: ${fmtDate(data.dueDate)}`,
    ``,
    `Bill Amount: *${fmt(data.billAmount)}*`,
    paidAmount > 0 ? `Amount Paid: ${fmt(paidAmount)}` : null,
    data.outstandingBalance > 0
      ? `Outstanding: *${fmt(data.outstandingBalance)}*`
      : null,
    `Status: ${statusLabel[data.status] ?? data.status}`,
    ``,
    data.outstandingBalance > 0
      ? `Kindly clear the outstanding amount at the earliest. Thank you! 🙏`
      : `Thank you for your prompt payment! 🙏`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  await openWhatsApp(data.phone, lines);
}

export async function shareReceiptOnWhatsApp(data: ReceiptShareData) {
  const lines = [
    `*🧾 Payment Receipt — MedPay*`,
    ``,
    `Store: ${data.customerName}`,
    `Amount Paid: *${fmt(data.amount)}*`,
    `Date: ${fmtDate(data.paymentDate)}`,
    `Mode: ${modeLabels[data.paymentMode] ?? data.paymentMode}`,
    data.referenceNumber ? `Ref No: ${data.referenceNumber}` : null,
    data.notes ? `Note: ${data.notes}` : null,
    ``,
    `Thank you for your payment! ✅`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  await openWhatsApp(data.phone, lines);
}
