import React, { useMemo, useState } from "react";
import {
  View, FlatList, StyleSheet, TouchableOpacity, Text,
  ScrollView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PaymentCard } from "@/components/PaymentCard";
import { EmptyState } from "@/components/EmptyState";
import { useGetPayments, useGetCustomers, getGetPaymentsQueryKey, getGetDashboardStatsQueryKey, getGetInvoicesQueryKey, getGetCustomersQueryKey } from "@workspace/api-client-react";
import { generateReceiptPdf } from "@/lib/generatePdf";
import { shareReceiptOnWhatsApp } from "@/lib/shareWhatsApp";
import { getToken } from "@/lib/apiToken";
import type { Payment } from "@workspace/api-client-react";

const MODE_FILTERS = ["all", "cash", "upi", "bank_transfer", "cheque"] as const;
const MODE_LABELS: Record<string, string> = { all: "All Modes", cash: "Cash", upi: "UPI", bank_transfer: "Bank", cheque: "Cheque" };
const PERIODS = ["all", "today", "week", "month"] as const;
const PERIOD_LABELS: Record<string, string> = { all: "All Time", today: "Today", week: "7 Days", month: "This Month" };

function fmt(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
function fmtDate(value: string) {
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}-${m}-${y.slice(-2)}` : value;
}
function iso(d: Date) { return d.toISOString().slice(0, 10); }

export default function PaymentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("all");
  const [period, setPeriod] = useState("all");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [showStores, setShowStores] = useState(false);
  const isWeb = Platform.OS === "web";
  const { isDesktop } = useBreakpoint();
  const { data: customers } = useGetCustomers({});

  const range = useMemo(() => {
    const now = new Date();
    const today = iso(now);
    if (period === "today") return { fromDate: today, toDate: today };
    if (period === "week") { const d = new Date(now); d.setDate(d.getDate() - 6); return { fromDate: iso(d), toDate: today }; }
    if (period === "month") return { fromDate: `${today.slice(0, 7)}-01`, toDate: today };
    return {};
  }, [period]);

  const { data: payments, isLoading, refetch } = useGetPayments({
    paymentMode: mode === "all" ? undefined : mode,
    customerId: customerId ?? undefined,
    ...range,
  });

  const total = (payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const headerPaddingTop = isDesktop ? 20 : isWeb ? 79 : insets.top + 12;
  const selectedStore = customers?.find(c => c.id === customerId)?.name || "All Stores";

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetPaymentsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
  };

  const handleDelete = (p: Payment) => {
    Alert.alert(
      "Delete Payment",
      `Delete ${fmt(p.amount)} payment for ${p.customerName}? The amount will be added back to the linked bill(s).`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          try {
            const token = getToken();
            const domain = process.env.EXPO_PUBLIC_DOMAIN || "pharma-pay-tracker.onrender.com";
            const res = await fetch(`https://${domain}/api/payments/${p.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Failed to delete payment");
            refreshAll();
          } catch (e: any) { Alert.alert("Error", e.message || "Failed to delete payment"); }
        }},
      ],
    );
  };

  const handleReceipt = (p: Payment) => generateReceiptPdf({ id: p.id, customerName: p.customerName, amount: p.amount, paymentDate: p.paymentDate, paymentMode: p.paymentMode, notes: (p as any).notes });
  const handleWhatsApp = (p: Payment) => shareReceiptOnWhatsApp({ id: p.id, customerName: p.customerName, amount: p.amount, paymentDate: p.paymentDate, paymentMode: p.paymentMode, notes: (p as any).notes });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: headerPaddingTop, backgroundColor: colors.card, borderBottomColor: colors.border, paddingHorizontal: isDesktop ? 28 : 20 }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Payments</Text>
          <Text style={[styles.subtitle, { color: colors.paid }]}>{payments?.length ?? 0} payments · {fmt(total)}</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.paid }]} onPress={() => router.push("/payment/add")}>
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filtersWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {PERIODS.map(f => <TouchableOpacity key={f} style={[styles.filterChip, { backgroundColor: period === f ? colors.primary : colors.card, borderColor: period === f ? colors.primary : colors.border }]} onPress={() => setPeriod(f)}><Text style={[styles.filterText, { color: period === f ? "#fff" : colors.mutedForeground }]}>{PERIOD_LABELS[f]}</Text></TouchableOpacity>)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {MODE_FILTERS.map(f => <TouchableOpacity key={f} style={[styles.filterChip, { backgroundColor: mode === f ? colors.primary : colors.card, borderColor: mode === f ? colors.primary : colors.border }]} onPress={() => setMode(f)}><Text style={[styles.filterText, { color: mode === f ? "#fff" : colors.mutedForeground }]}>{MODE_LABELS[f]}</Text></TouchableOpacity>)}
        </ScrollView>
        <TouchableOpacity style={[styles.storeBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowStores(!showStores)}>
          <Feather name="users" size={14} color={colors.primary} />
          <Text style={[styles.storeText, { color: colors.foreground }]} numberOfLines={1}>{selectedStore}</Text>
          <Feather name={showStores ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
        {showStores && <View style={[styles.storePicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.storeItem} onPress={() => { setCustomerId(null); setShowStores(false); }}><Text style={{ color: colors.foreground }}>All Stores</Text></TouchableOpacity>
          {(customers ?? []).map(c => <TouchableOpacity key={c.id} style={styles.storeItem} onPress={() => { setCustomerId(c.id); setShowStores(false); }}><Text style={{ color: colors.foreground }}>{c.name}</Text></TouchableOpacity>)}
        </View>}
      </View>

      {isLoading ? <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View> : (
        <FlatList
          data={payments ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <View>
              <PaymentCard payment={item} onReceipt={() => handleReceipt(item)} onWhatsApp={() => handleWhatsApp(item)} />
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.primary + "55" }]} onPress={() => router.push(`/payment/edit/${item.id}` as any)}><Feather name="edit-2" size={13} color={colors.primary} /><Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.destructive + "55" }]} onPress={() => handleDelete(item)}><Feather name="trash-2" size={13} color={colors.destructive} /><Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>Delete</Text></TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="credit-card" title="No payments found" subtitle="Try changing filters" />}
          contentContainerStyle={{ paddingBottom: insets.bottom + (isWeb ? 34 : 90), paddingTop: 4 }}
          onRefresh={refetch}
          refreshing={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  filtersWrap: { paddingHorizontal: 16, paddingVertical: 8, gap: 7 },
  filterRow: { gap: 7 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, borderWidth: 1 },
  filterText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  storeBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
  storeText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  storePicker: { borderWidth: 1, borderRadius: 10, maxHeight: 180, overflow: "hidden" },
  storeItem: { paddingHorizontal: 12, paddingVertical: 10 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginHorizontal: 16, marginTop: -2, marginBottom: 6 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});
