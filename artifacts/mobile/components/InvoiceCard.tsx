import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "./StatusBadge";
import type { Invoice } from "@workspace/api-client-react";

interface InvoiceCardProps {
  invoice: Invoice;
  onPress?: () => void;
  showCustomer?: boolean;
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

export function InvoiceCard({ invoice, onPress, showCustomer = true }: InvoiceCardProps) {
  const colors = useColors();
  const isOverdue = invoice.status === "overdue";
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: isOverdue ? colors.overdue + "40" : colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.top}>
        <View style={styles.left}>
          <Text style={[styles.invoiceNo, { color: colors.primary }]}>#{invoice.invoiceNumber}</Text>
          {showCustomer && <Text style={[styles.customer, { color: colors.foreground }]} numberOfLines={1}>{invoice.customerName}</Text>}
        </View>
        <StatusBadge status={invoice.status} />
      </View>
      <View style={styles.bottom}>
        <View style={styles.amountRow}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Bill</Text>
          <Text style={[styles.amount, { color: colors.foreground }]}>{formatCurrency(invoice.billAmount)}</Text>
        </View>
        {invoice.outstandingBalance > 0 && (
          <View style={styles.amountRow}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Outstanding</Text>
            <Text style={[styles.outstanding, { color: colors.overdue }]}>{formatCurrency(invoice.outstandingBalance)}</Text>
          </View>
        )}
        <View style={styles.dates}>
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>Inv: {formatDate(invoice.invoiceDate)}</Text>
          <Text style={[styles.dateText, { color: isOverdue ? colors.overdue : colors.mutedForeground }]}>Due: {formatDate(invoice.dueDate)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 4,
    gap: 10,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  left: { flex: 1, gap: 2 },
  invoiceNo: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  customer: { fontSize: 12, fontFamily: "Inter_500Medium" },
  bottom: { gap: 6 },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 12, fontFamily: "Inter_400Regular" },
  amount: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  outstanding: { fontSize: 14, fontFamily: "Inter_700Bold" },
  dates: { flexDirection: "row", justifyContent: "space-between" },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
