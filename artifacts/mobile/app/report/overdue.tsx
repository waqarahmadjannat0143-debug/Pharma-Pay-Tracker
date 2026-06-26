import React from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { EmptyState } from "@/components/EmptyState";
import { useGetOverdueReport } from "@workspace/api-client-react";

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0 });
}

export default function OverdueReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { data, isLoading } = useGetOverdueReport();

  const total = (data ?? []).reduce((sum, r) => sum + r.outstandingBalance, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {data && data.length > 0 && (
        <View style={[styles.totalBar, { backgroundColor: colors.overdue + "15", borderColor: colors.overdue + "30" }]}>
          <View>
            <Text style={[styles.totalLabel, { color: colors.overdue }]}>Total Overdue</Text>
            <Text style={[styles.totalSub, { color: colors.mutedForeground }]}>{data.length} invoice(s)</Text>
          </View>
          <Text style={[styles.totalAmount, { color: colors.overdue }]}>{formatCurrency(total)}</Text>
        </View>
      )}
      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={item => String(item.invoiceId)}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.overdue + "40" }]}>
              <View style={styles.top}>
                <Text style={[styles.invoiceNo, { color: colors.primary }]}>#{item.invoiceNumber}</Text>
                <View style={[styles.daysBadge, { backgroundColor: colors.overdue + "20" }]}>
                  <Text style={[styles.daysText, { color: colors.overdue }]}>{item.daysOverdue}d overdue</Text>
                </View>
              </View>
              <Text style={[styles.customer, { color: colors.foreground }]}>{item.customerName}</Text>
              <Text style={[styles.mobile, { color: colors.mutedForeground }]}>{item.mobile}</Text>
              <View style={styles.amounts}>
                <View>
                  <Text style={[styles.amtLabel, { color: colors.mutedForeground }]}>Bill Amount</Text>
                  <Text style={[styles.amtValue, { color: colors.foreground }]}>{formatCurrency(item.billAmount)}</Text>
                </View>
                <View style={styles.amtRight}>
                  <Text style={[styles.amtLabel, { color: colors.mutedForeground }]}>Outstanding</Text>
                  <Text style={[styles.amtValue, { color: colors.overdue }]}>{formatCurrency(item.outstandingBalance)}</Text>
                </View>
              </View>
              <Text style={[styles.dueDate, { color: colors.overdue }]}>Due: {item.dueDate}</Text>
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="check-circle" title="No Overdue Invoices" subtitle="All invoices are on time" />}
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
  totalSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  totalAmount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { marginHorizontal: 16, marginVertical: 4, borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  invoiceNo: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  daysBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  daysText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  customer: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  mobile: { fontSize: 12, fontFamily: "Inter_400Regular" },
  amounts: { flexDirection: "row", justifyContent: "space-between" },
  amtRight: { alignItems: "flex-end" },
  amtLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  amtValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  dueDate: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
