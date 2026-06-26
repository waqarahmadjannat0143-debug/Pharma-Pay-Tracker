import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Payment } from "@workspace/api-client-react";

interface PaymentCardProps {
  payment: Payment;
  showCustomer?: boolean;
  onPress?: () => void;
}

const modeIcons: Record<string, keyof typeof Feather.glyphMap> = {
  cash: "dollar-sign",
  upi: "smartphone",
  bank_transfer: "briefcase",
  cheque: "file-text",
};

const modeLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function PaymentCard({ payment, showCustomer = true, onPress }: PaymentCardProps) {
  const colors = useColors();
  const icon = modeIcons[payment.paymentMode] || "credit-card";
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: colors.paid + "20" }]}>
          <Feather name={icon} size={20} color={colors.paid} />
        </View>
        <View style={styles.info}>
          {showCustomer && <Text style={[styles.customer, { color: colors.foreground }]} numberOfLines={1}>{payment.customerName}</Text>}
          <Text style={[styles.mode, { color: colors.mutedForeground }]}>{modeLabels[payment.paymentMode] || payment.paymentMode}</Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>{formatDate(payment.paymentDate)}</Text>
        </View>
        <Text style={[styles.amount, { color: colors.paid }]}>{formatCurrency(payment.amount)}</Text>
      </View>
      {payment.notes && <Text style={[styles.notes, { color: colors.mutedForeground }]} numberOfLines={2}>{payment.notes}</Text>}
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
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 2 },
  customer: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  mode: { fontSize: 12, fontFamily: "Inter_400Regular" },
  date: { fontSize: 11, fontFamily: "Inter_400Regular" },
  amount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  notes: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
});
