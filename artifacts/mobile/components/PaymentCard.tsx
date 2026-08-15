import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Payment } from "@workspace/api-client-react";

interface PaymentCardProps {
  payment: Payment;
  showCustomer?: boolean;
  onPress?: () => void;
  onReceipt?: () => void;
  onWhatsApp?: () => void;
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
  const [y, m, d] = dateStr.split("-");
  return y && m && d ? `${d}-${m}-${y}` : dateStr;
}

export function PaymentCard({ payment, showCustomer = true, onPress, onReceipt, onWhatsApp }: PaymentCardProps) {
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
          {showCustomer && (
            <Text style={[styles.customer, { color: colors.foreground }]} numberOfLines={1}>
              {payment.customerName}
            </Text>
          )}
          <Text style={[styles.mode, { color: colors.mutedForeground }]}>
            {modeLabels[payment.paymentMode] || payment.paymentMode}
          </Text>
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatDate(payment.paymentDate)}
          </Text>
        </View>
        <View style={styles.rightCol}>
          <Text style={[styles.amount, { color: colors.paid }]}>{formatCurrency(payment.amount)}</Text>
          <View style={styles.btnRow}>
            {onReceipt && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: colors.border }]}
                onPress={onReceipt}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="download" size={12} color={colors.mutedForeground} />
                <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>PDF</Text>
              </TouchableOpacity>
            )}
            {onWhatsApp && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: "#25D366" + "60", backgroundColor: "#25D366" + "12" }]}
                onPress={onWhatsApp}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="message-circle" size={12} color="#25D366" />
                <Text style={[styles.actionBtnText, { color: "#25D366" }]}>Send</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {payment.notes && (
        <Text style={[styles.notes, { color: colors.mutedForeground }]} numberOfLines={2}>
          {payment.notes}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, borderWidth: 1, marginHorizontal: 16, marginVertical: 4, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 2 },
  customer: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  mode: { fontSize: 12, fontFamily: "Inter_400Regular" },
  date: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rightCol: { alignItems: "flex-end", gap: 6 },
  amount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  btnRow: { flexDirection: "row", gap: 5 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  actionBtnText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  notes: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
});
