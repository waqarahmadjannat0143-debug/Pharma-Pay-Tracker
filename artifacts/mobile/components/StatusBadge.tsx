import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

type Status = "paid" | "partial" | "pending" | "overdue";

interface StatusBadgeProps {
  status: Status | string;
}

const labels: Record<string, string> = {
  paid: "Paid",
  partial: "Partial",
  pending: "Pending",
  overdue: "Overdue",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = useColors();
  const colorMap: Record<string, string> = {
    paid: colors.paid,
    partial: colors.warning,
    pending: colors.pending,
    overdue: colors.overdue,
  };
  const bg = (colorMap[status] || colors.mutedForeground) + "20";
  const fg = colorMap[status] || colors.mutedForeground;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{labels[status] || status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
