import React, { useState } from "react";
import { View, FlatList, StyleSheet, TouchableOpacity, Text, ScrollView, Platform, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { PaymentCard } from "@/components/PaymentCard";
import { EmptyState } from "@/components/EmptyState";
import { useGetPayments } from "@workspace/api-client-react";
import { generateReceiptPdf } from "@/lib/generatePdf";

const MODE_FILTERS = ["all", "cash", "upi", "bank_transfer", "cheque"] as const;
const MODE_LABELS: Record<string, string> = { all: "All", cash: "Cash", upi: "UPI", bank_transfer: "Bank", cheque: "Cheque" };

export default function PaymentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState("all");
  const isWeb = Platform.OS === "web";

  const { data: payments, isLoading, refetch } = useGetPayments({
    paymentMode: mode === "all" ? undefined : mode,
  });

  const total = (payments ?? []).reduce((sum, p) => sum + p.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        paddingTop: isWeb ? 67 + 12 : insets.top + 12,
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
      }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Payments</Text>
          {payments && payments.length > 0 && (
            <Text style={[styles.totalText, { color: colors.paid }]}>
              Total: ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.paid }]}
          onPress={() => router.push("/payment/add")}
        >
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {MODE_FILTERS.map(f => {
          const active = mode === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, {
                backgroundColor: active ? colors.primary : colors.muted,
                borderColor: active ? colors.primary : colors.border,
              }]}
              onPress={() => setMode(f)}
            >
              <Text style={[styles.filterText, { color: active ? "#fff" : colors.mutedForeground }]}>
                {MODE_LABELS[f]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={payments ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <PaymentCard
              payment={item}
              onPress={() => {}}
              onReceipt={() =>
                generateReceiptPdf({
                  id: item.id,
                  customerName: item.customerName,
                  amount: item.amount,
                  paymentDate: item.paymentDate,
                  paymentMode: item.paymentMode,
                  referenceNumber: (item as any).referenceNumber,
                  notes: (item as any).notes,
                })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="credit-card"
              title="No payments found"
              subtitle="Tap + to record a payment"
            />
          }
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (isWeb ? 34 : 90) }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  totalText: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  filterScroll: { maxHeight: 48 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingTop: 4 },
});
