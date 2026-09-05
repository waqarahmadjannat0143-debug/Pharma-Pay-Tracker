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
  if (amount >= 100000) return "₹" + (amount / 100000).toFixed(1) + "L";
  if (amount >= 1000) return "₹" + (amount / 1000).toFixed(1) + "K";
  return "₹" + amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

const AVATAR_COLORS = [
  "#9A650D",
  "#B88725",
  "#7A4E08",
  "#C49A3A",
  "#A87313",
  "#6F5A36",
];

function getAvatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
  const colors = useColors();
  const hasOutstanding = customer.totalOutstanding > 0;
  const avatarColor = getAvatarColor(customer.name);
  const initials = customer.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.serialBadge,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.serialText, { color: colors.primary }]}>
            #{customer.serialNumber}
          </Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.info}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {customer.name}
          </Text>
          <Text
            style={[styles.owner, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {customer.ownerName}
          </Text>
          <View style={styles.badgeRow}>
            <View
              style={[styles.mobileBadge, { backgroundColor: colors.muted }]}
            >
              <Feather name="phone" size={9} color={colors.mutedForeground} />
              <Text
                style={[styles.mobileText, { color: colors.mutedForeground }]}
              >
                {customer.mobile}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.right}>
          {hasOutstanding ? (
            <>
              <Text style={[styles.outstanding, { color: colors.overdue }]}>
                {formatCurrency(customer.totalOutstanding)}
              </Text>
              <Text
                style={[styles.dueLabel, { color: colors.mutedForeground }]}
              >
                outstanding
              </Text>
            </>
          ) : (
            <View
              style={[
                styles.clearedBadge,
                {
                  backgroundColor: colors.paid + "18",
                  borderColor: colors.paid + "40",
                },
              ]}
            >
              <Feather name="check-circle" size={11} color={colors.paid} />
              <Text style={[styles.clearedText, { color: colors.paid }]}>
                Clear
              </Text>
            </View>
          )}
          <Feather
            name="chevron-right"
            size={15}
            color={colors.border}
            style={{ marginTop: 4 }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  serialBadge: {
    minWidth: 35,
    height: 35,
    paddingHorizontal: 7,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  serialText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontFamily: "Inter_700Bold" },
  owner: { fontSize: 12, fontFamily: "Inter_400Regular" },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  mobileBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mobileText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  right: { alignItems: "flex-end", gap: 2 },
  outstanding: { fontSize: 15, fontFamily: "Inter_700Bold" },
  dueLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  clearedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
