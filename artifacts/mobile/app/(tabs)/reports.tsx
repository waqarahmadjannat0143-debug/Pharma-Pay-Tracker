import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useBreakpoint } from "@/hooks/useBreakpoint";

const reportItems = [
  {
    title: "Outstanding Report",
    subtitle: "View all pending amounts by store",
    description: "See every medical store's outstanding balance at a glance. Identify who owes the most and take action.",
    icon: "alert-circle" as const,
    path: "/report/outstanding",
    color: "#DC2626",
  },
  {
    title: "Overdue Report",
    subtitle: "Invoices past their due date",
    description: "All invoices that have crossed their due date. Follow up with stores to recover overdue payments.",
    icon: "clock" as const,
    path: "/report/overdue",
    color: "#D97706",
  },
  {
    title: "Customer Ledger",
    subtitle: "Complete ledger for a store",
    description: "View the full transaction history — invoices, payments, and running balance — for any medical store.",
    icon: "book" as const,
    path: "/report/ledger",
    color: "#1565C0",
  },
  {
    title: "Collection Report",
    subtitle: "Date-wise & monthly collections",
    description: "Track how much has been collected on each day or month. Monitor agency revenue trends over time.",
    icon: "bar-chart-2" as const,
    path: "/report/collection",
    color: "#059669",
  },
];

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { isDesktop } = useBreakpoint();

  const headerPaddingTop = isDesktop ? 20 : isWeb ? 67 + 12 : insets.top + 12;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        paddingTop: headerPaddingTop,
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
        paddingHorizontal: isDesktop ? 28 : 20,
      }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Reports</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Financial analytics & insights</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            padding: isDesktop ? 28 : 16,
            paddingBottom: insets.bottom + (isWeb ? 34 : 90),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isDesktop ? (
          /* Desktop: 2-column grid */
          <View style={styles.desktopGrid}>
            {reportItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.desktopCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(item.path as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.desktopIconWrap, { backgroundColor: item.color + "15" }]}>
                  <Feather name={item.icon} size={28} color={item.color} />
                </View>
                <Text style={[styles.desktopCardTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.desktopCardDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
                <View style={[styles.desktopCardFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.desktopCardAction, { color: item.color }]}>Open Report</Text>
                  <Feather name="arrow-right" size={14} color={item.color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          /* Mobile: list */
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Financial Reports</Text>
            {reportItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(item.path as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: item.color + "20" }]}>
                  <Feather name={item.icon} size={22} color={item.color} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.title}</Text>
                  <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>{item.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  content: { gap: 10 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  item: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1, gap: 3 },
  itemTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  itemSub: { fontSize: 12, fontFamily: "Inter_400Regular" },

  /* Desktop */
  desktopGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  desktopCard: {
    flex: 1,
    minWidth: 280,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  desktopIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  desktopCardTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  desktopCardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  desktopCardFooter: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 12, borderTopWidth: 1, marginTop: 4 },
  desktopCardAction: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
