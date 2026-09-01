import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform, TextInput } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { getToken } from "@/lib/apiToken";
import { formatDateDDMMYY, ddmmyyToISO } from "@/lib/dateFormat";
import { EmptyState } from "@/components/EmptyState";
import { useGetMonthlyCollectionReport } from "@workspace/api-client-react";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN || "pharma-pay-tracker.onrender.com"}`;

function formatCurrency(amount: number) { return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0 }); }
function iso(d: Date) { return d.toISOString().split("T")[0]; }
function formatDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6)].filter(Boolean).join("-");
}

type Preset = "today" | "week" | "previousMonth" | "month" | "year" | "custom" | "all";
type DailyCollection = { date: string; amount: number; count: number };

export default function CollectionScreen() {
  const colors = useColors(); const insets = useSafeAreaInsets(); const isWeb = Platform.OS === "web";
  const params = useLocalSearchParams<{ period?: string }>();
  const initialPreset = (["today","week","previousMonth","month","year","custom","all"].includes(params.period || "") ? params.period : "month") as Preset;
  const [preset, setPreset] = useState<Preset>(initialPreset); const [customFrom, setCustomFrom] = useState(""); const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    const now = new Date(); const today = iso(now);
    if (preset === "today") return { fromDate: today, toDate: today };
    if (preset === "week") { const d = new Date(now); d.setDate(d.getDate() - 6); return { fromDate: iso(d), toDate: today }; }
    if (preset === "previousMonth") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { fromDate: iso(first), toDate: iso(last) };
    }
    if (preset === "month") return { fromDate: `${today.slice(0,7)}-01`, toDate: today };
    if (preset === "year") return { fromDate: `${today.slice(0,4)}-01-01`, toDate: today };
    if (preset === "custom") return { fromDate: ddmmyyToISO(customFrom) || undefined, toDate: ddmmyyToISO(customTo) || undefined };
    return { fromDate: "2000-01-01", toDate: "2099-12-31" };
  }, [preset, customFrom, customTo]);

  const year = new Date().getFullYear();
  // Use the exact same endpoint and query key as Dashboard. This prevents the
  // two screens from showing different persisted-cache snapshots.
  const { data: overview, isLoading: dailyLoading } = useQuery<{ periodRows: DailyCollection[] }>({
    queryKey: ["dashboard-overview", range.fromDate, range.toDate],
    enabled: Boolean(range.fromDate && range.toDate && range.fromDate <= range.toDate),
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/dashboard/overview?fromDate=${range.fromDate}&toDate=${range.toDate}`, {
        headers: { Authorization: `Bearer ${getToken()}`, "Cache-Control": "no-cache" },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Collection report load failed");
      return body;
    },
  });
  const daily = overview?.periodRows ?? [];
  const { data: monthly } = useGetMonthlyCollectionReport({ year });
  const total = (daily ?? []).reduce((s, row) => s + row.amount, 0); const count = (daily ?? []).reduce((s, row) => s + row.count, 0);
  const chips: { key: Preset; label: string }[] = [{ key: "today", label: "Today" }, { key: "week", label: "7 Days" }, { key: "previousMonth", label: "Previous Month" }, { key: "month", label: "This Month" }, { key: "year", label: "This Year" }, { key: "all", label: "All" }, { key: "custom", label: "Custom" }];
  const customDatesValid = Boolean(range.fromDate && range.toDate);
  const customReady = Boolean(customDatesValid && range.fromDate! <= range.toDate!);

  return <View style={[styles.container, { backgroundColor: colors.background }]}>
    <View style={styles.filters}>
      <FlatList horizontal data={chips} keyExtractor={i => i.key} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} renderItem={({ item }) => { const active = preset === item.key; return <TouchableOpacity style={[styles.chip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]} onPress={() => setPreset(item.key)}><Text style={{ color: active ? "#fff" : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>{item.label}</Text></TouchableOpacity>; }} />
      {preset === "custom" && <><View style={styles.customRow}><TextInput value={customFrom} onChangeText={value => setCustomFrom(formatDateInput(value))} placeholder="From DD-MM-YY" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" maxLength={8} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} /><TextInput value={customTo} onChangeText={value => setCustomTo(formatDateInput(value))} placeholder="To DD-MM-YY" placeholderTextColor={colors.mutedForeground} keyboardType="number-pad" maxLength={8} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} /></View><Text style={[styles.customHint, { color: customReady ? colors.paid : customDatesValid ? colors.overdue : colors.mutedForeground }]}>{customReady ? `${customFrom} se ${customTo} ka report` : customDatesValid ? "From date, To date se pehle honi chahiye" : "Sirf 6 digits type karein — 010826 automatic 01-08-26 banega"}</Text></>}
    </View>
    <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}><View><Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>COLLECTION</Text><Text style={[styles.summaryAmount, { color: colors.paid }]}>{formatCurrency(total)}</Text></View><View style={{ alignItems: "flex-end" }}><Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>PAYMENTS</Text><Text style={[styles.summaryCount, { color: colors.foreground }]}>{count}</Text></View></View>
    {dailyLoading ? <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View> : <FlatList data={daily ?? []} keyExtractor={item => item.date} renderItem={({ item }) => <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><View><Text style={[styles.period, { color: colors.foreground }]}>{formatDateDDMMYY(item.date)}</Text><Text style={[styles.count, { color: colors.mutedForeground }]}>{item.count} payment(s)</Text></View><Text style={[styles.amount, { color: colors.paid }]}>{formatCurrency(item.amount)}</Text></View>} ListEmptyComponent={<EmptyState icon="bar-chart-2" title="No data" subtitle="No collection data in this period" />} contentContainerStyle={{ paddingBottom: insets.bottom + (isWeb ? 34 : 20) }} showsVerticalScrollIndicator={false} ListFooterComponent={preset === "year" && monthly && monthly.length ? <View style={[styles.yearBox, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.yearTitle, { color: colors.foreground }]}>Monthly breakdown</Text>{monthly.map(m => <View key={`${m.year}-${m.month}`} style={styles.monthRow}><Text style={{ color: colors.mutedForeground }}>{m.label} {m.year}</Text><Text style={{ color: colors.paid, fontFamily: "Inter_600SemiBold" }}>{formatCurrency(m.amount)}</Text></View>)}</View> : null} />}
  </View>;
}

const styles = StyleSheet.create({ container: { flex: 1 }, filters: { padding: 16, gap: 10 }, chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 }, customRow: { flexDirection: "row", gap: 8 }, input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, fontSize: 12 }, customHint: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: -3, paddingHorizontal: 2 }, summary: { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: "row", justifyContent: "space-between" }, summaryLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: .7 }, summaryAmount: { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 4 }, summaryCount: { fontSize: 24, fontFamily: "Inter_700Bold", marginTop: 4 }, loader: { flex: 1, alignItems: "center", justifyContent: "center" }, card: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginVertical: 4, borderRadius: 12, borderWidth: 1, padding: 16 }, period: { fontSize: 14, fontFamily: "Inter_600SemiBold" }, count: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 }, amount: { fontSize: 16, fontFamily: "Inter_700Bold" }, yearBox: { margin: 16, borderRadius: 12, borderWidth: 1, padding: 16, gap: 10 }, yearTitle: { fontFamily: "Inter_700Bold", fontSize: 14, marginBottom: 4 }, monthRow: { flexDirection: "row", justifyContent: "space-between" } });
