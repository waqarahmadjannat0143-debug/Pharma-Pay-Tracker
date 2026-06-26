import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Customer } from "@workspace/api-client-react";

interface CustomerCardProps {
  customer: Customer;
  onPress: () => void;
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
  const colors = useColors();
  const hasOutstanding = customer.totalOutstanding > 0;
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {customer.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{customer.name}</Text>
          <Text style={[styles.owner, { color: colors.mutedForeground }]} numberOfLines={1}>{customer.ownerName}</Text>
          <Text style={[styles.mobile, { color: colors.mutedForeground }]}>{customer.mobile}</Text>
        </View>
        <View style={styles.right}>
          {hasOutstanding ? (
            <Text style={[styles.outstanding, { color: colors.overdue }]}>
              {formatCurrency(customer.totalOutstanding)}
            </Text>
          ) : (
            <View style={[styles.clearedBadge, { backgroundColor: colors.paid + "20" }]}>
              <Text style={[styles.clearedText, { color: colors.paid }]}>Clear</Text>
            </View>
          )}
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
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
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  owner: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  mobile: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  outstanding: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  clearedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  clearedText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
