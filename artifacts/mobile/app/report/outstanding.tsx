import React from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { EmptyState } from "@/components/EmptyState";
import { useGetOutstandingReport } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0 });
}

export default function OutstandingReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { data, isLoading } = useGetOutstandingReport();

  const total = (data ?? []).reduce((sum, r) => sum + r.totalOutstanding, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {data && data.length > 0 && (
        <View style={[styles.totalBar, { backgroundColor: colors.overdue + "15", borderColor: colors.overdue + "30" }]}>
          <Text style={[styles.totalLabel, { color: colors.overdue }]}>Total Outstanding</Text>
          <Text style={[styles.totalAmount, { color: colors.overdue }]}>{formatCurrency(total)}</Text>
        </View>
      )}
      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={item => String(item.customerId)}
          renderItem={({ item, index }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardRow}>
                <View style={[styles.rank, { backgroundColor: index < 3 ? colors.overdue + "20" : colors.muted }]}>
                  <Text style={[styles.rankText, { color: index < 3 ? colors.overdue : colors.mutedForeground }]}>#{index + 1}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{item.customerName}</Text>
                  <Text style={[styles.mobile, { color: colors.mutedForeground }]}>{item.mobile} · {item.invoiceCount} invoice(s)</Text>
                  {item.oldestDueDate && <Text style={[styles.dueDate, { color: colors.warning }]}>Oldest due: {item.oldestDueDate}</Text>}
                </View>
                <Text style={[styles.amount, { color: colors.overdue }]}>{formatCurrency(item.totalOutstanding)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="check-circle" title="All Clear!" subtitle="No outstanding amounts" />}
          contentContainerStyle={{ paddingBottom: insets.bottom + (isWeb ? 34 : 20), paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  totalBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, margin: 16, borderRadius: 12, borderWidth: 1 },
  totalLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  totalAmount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { marginHorizontal: 16, marginVertical: 4, borderRadius: 12, borderWidth: 1, padding: 14 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  rank: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  mobile: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dueDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  amount: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
