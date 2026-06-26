import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { EmptyState } from "@/components/EmptyState";
import { useGetDateWiseCollection, useGetMonthlyCollectionReport } from "@workspace/api-client-react";

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0 });
}

export default function CollectionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [tab, setTab] = useState<"daily" | "monthly">("monthly");
  const year = new Date().getFullYear();

  const { data: daily, isLoading: dailyLoading } = useGetDateWiseCollection();
  const { data: monthly, isLoading: monthlyLoading } = useGetMonthlyCollectionReport({ year });

  const isLoading = tab === "daily" ? dailyLoading : monthlyLoading;

  const tabStyle = (active: boolean) => ({
    flex: 1,
    paddingVertical: 10,
    alignItems: "center" as const,
    borderRadius: 8,
    backgroundColor: active ? colors.primary : "transparent",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <TouchableOpacity style={tabStyle(tab === "monthly")} onPress={() => setTab("monthly")}>
          <Text style={{ color: tab === "monthly" ? "#fff" : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Monthly ({year})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={tabStyle(tab === "daily")} onPress={() => setTab("daily")}>
          <Text style={{ color: tab === "daily" ? "#fff" : colors.mutedForeground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>Date-wise</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : tab === "monthly" ? (
        <FlatList
          data={monthly ?? []}
          keyExtractor={item => `${item.year}-${item.month}`}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.period, { color: colors.foreground }]}>{item.label} {item.year}</Text>
              <Text style={[styles.amount, { color: colors.paid }]}>{formatCurrency(item.amount)}</Text>
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="calendar" title="No data" subtitle="No collections recorded this year" />}
          contentContainerStyle={{ paddingBottom: insets.bottom + (isWeb ? 34 : 20) }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={daily ?? []}
          keyExtractor={item => item.date}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View>
                <Text style={[styles.period, { color: colors.foreground }]}>{item.date}</Text>
                <Text style={[styles.count, { color: colors.mutedForeground }]}>{item.count} payment(s)</Text>
              </View>
              <Text style={[styles.amount, { color: colors.paid }]}>{formatCurrency(item.amount)}</Text>
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="bar-chart-2" title="No data" subtitle="No collection data available" />}
          contentContainerStyle={{ paddingBottom: insets.bottom + (isWeb ? 34 : 20) }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: "row", margin: 16, borderRadius: 10, padding: 4, borderWidth: 1 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginVertical: 4, borderRadius: 12, borderWidth: 1, padding: 16 },
  period: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  count: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  amount: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
