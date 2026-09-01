import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useBreakpoint } from "@/hooks/useBreakpoint";
const reportItems = [
  {
    title: "Outstanding Report",
    subtitle: "View all pending amounts by store",
    icon: "alert-circle" as const,
    path: "/report/outstanding",
    color: "#DC2626",
  },
  {
    title: "Bill Aging",
    subtitle: "0-30, 31-60, 61-90 & 90+ day dues",
    icon: "calendar" as const,
    path: "/report/aging",
    color: "#F59E0B",
  },
  {
    title: "Overdue Report",
    subtitle: "Invoices past their due date",
    icon: "clock" as const,
    path: "/report/overdue",
    color: "#DC2626",
  },
  {
    title: "Customer Ledger",
    subtitle: "Complete ledger for a store",
    icon: "book" as const,
    path: "/report/ledger",
    color: "#2563EB",
  },
  {
    title: "Collection Report",
    subtitle: "Date-wise & monthly collections",
    icon: "bar-chart-2" as const,
    path: "/report/collection",
    color: "#14B8A6",
  },
  {
    title: "Backup & Restore",
    subtitle: "Keep a full copy of your MedPay data",
    icon: "shield" as const,
    path: "/backup",
    color: "#16A34A",
  },
];
export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { isDesktop } = useBreakpoint();
  const top = isDesktop ? 20 : isWeb ? 79 : insets.top + 12;
  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          s.header,
          {
            paddingTop: top,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[s.title, { color: colors.foreground }]}>Reports</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
          Financial analytics & data safety
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: insets.bottom + 90 },
        ]}
      >
        {reportItems.map((x, i) => (
          <TouchableOpacity
            key={i}
            style={[
              s.item,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push(x.path as any)}
          >
            <View style={[s.icon, { backgroundColor: x.color + "20" }]}>
              <Feather name={x.icon} size={22} color={x.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.itemTitle, { color: colors.foreground }]}>
                {x.title}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                {x.subtitle}
              </Text>
            </View>
            <Feather
              name="chevron-right"
              size={18}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 10 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
});
