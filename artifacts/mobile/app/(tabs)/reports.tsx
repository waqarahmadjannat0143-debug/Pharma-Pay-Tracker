import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";

const reportItems = [
  { title: "Outstanding Report", subtitle: "View all pending amounts by store", icon: "alert-circle" as const, path: "/report/outstanding", color: "#DC2626" },
  { title: "Overdue Report", subtitle: "Invoices past their due date", icon: "clock" as const, path: "/report/overdue", color: "#D97706" },
  { title: "Customer Ledger", subtitle: "Complete ledger for a store", icon: "book" as const, path: "/report/ledger", color: "#1565C0" },
  { title: "Collection Report", subtitle: "Date-wise & monthly collections", icon: "bar-chart-2" as const, path: "/report/collection", color: "#059669" },
];

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        paddingTop: isWeb ? 67 + 12 : insets.top + 12,
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
      }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Reports</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (isWeb ? 34 : 90) }]}
        showsVerticalScrollIndicator={false}
      >
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 10 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  itemInfo: { flex: 1, gap: 3 },
  itemTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  itemSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
