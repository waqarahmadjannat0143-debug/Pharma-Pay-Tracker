import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
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
  const [y, m, d] = dateStr.split("-");
  return y && m && d ? `${d}-${m}-${y}` : dateStr;
}

function statusAccent(status: string, colors: any) {
  switch (status) {
    case "paid": return colors.paid;
    case "partial": return colors.partial;
    case "overdue": return colors.overdue;
    default: return colors.primary;
  }
}

export function InvoiceCard({ invoice, onPress, showCustomer = true }: InvoiceCardProps) {
  const colors = useColors();
  const accent = statusAccent(invoice.status, colors);
  const isOverdue = invoice.status === "overdue";
  const paidAmount = invoice.billAmount - invoice.outstandingBalance;
  const paidPct = invoice.billAmount > 0 ? (paidAmount / invoice.billAmount) * 100 : 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.72 : 1}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <Text style={[styles.invoiceNo, { color: colors.primary }]}>#{invoice.invoiceNumber}</Text>
            {showCustomer && (
              <Text style={[styles.customer, { color: colors.foreground }]} numberOfLines={1}>
                {invoice.customerName}
              </Text>
            )}
          </View>
          <View style={styles.topRight}>
            <Text style={[styles.billAmount, { color: colors.foreground }]}>
              {formatCurrency(invoice.billAmount)}
            </Text>
            <StatusBadge status={invoice.status} />
          </View>
        </View>

        {invoice.outstandingBalance > 0 && (
          <View style={styles.outstandingRow}>
            <Text style={[styles.outstandingLabel, { color: colors.mutedForeground }]}>Outstanding</Text>
            <Text style={[styles.outstandingValue, { color: colors.overdue }]}>
              {formatCurrency(invoice.outstandingBalance)}
            </Text>
          </View>
        )}

        {invoice.billAmount > 0 && invoice.status !== "pending" && (
          <View style={styles.progressWrap}>
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${paidPct}%`, backgroundColor: colors.paid }]} />
            </View>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
              {Math.round(paidPct)}% paid
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.dateChip}>
            <Feather name="calendar" size={10} color={colors.mutedForeground} />
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{formatDate(invoice.invoiceDate)}</Text>
          </View>
          <View style={styles.dateChip}>
            <Feather name="clock" size={10} color={isOverdue ? colors.overdue : colors.mutedForeground} />
            <Text style={[styles.dateText, { color: isOverdue ? colors.overdue : colors.mutedForeground }]}>
              Due {formatDate(invoice.dueDate)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", borderRadius: 14, borderWidth: 1, marginHorizontal: 16, marginVertical: 4, overflow: "hidden" },
  accentBar: { width: 4 },
  body: { flex: 1, padding: 14, gap: 10 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  topLeft: { flex: 1, gap: 2 },
  topRight: { alignItems: "flex-end", gap: 4 },
  invoiceNo: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  customer: { fontSize: 14, fontFamily: "Inter_700Bold" },
  billAmount: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  outstandingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  outstandingLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  outstandingValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  progressWrap: { gap: 4 },
  progressTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  footer: { flexDirection: "row", gap: 12 },
  dateChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
