import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
}

export function StatsCard({
  title,
  value,
  subtitle,
  color,
  icon,
}: StatsCardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        {icon && (
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: (color || colors.primary) + "20" },
            ]}
          >
            {icon}
          </View>
        )}
        <Text
          style={[styles.title, { color: colors.mutedForeground }]}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
      <Text
        style={[styles.value, { color: color || colors.primary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    gap: 6,
    minHeight: 112,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    flex: 1,
    lineHeight: 14,
  },
  value: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
});
