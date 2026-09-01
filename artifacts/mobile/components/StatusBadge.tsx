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
  const bg = (colorMap[status] || colors.mutedForeground) + "14";
  const fg = colorMap[status] || colors.mutedForeground;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>
        {labels[status] || status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
