import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

import { formatDateDDMMYY, ddmmyyToISO, formatDateInput, formatLocalISODate } from "@/lib/dateFormat";
import { EmptyState } from "@/components/EmptyState";
import { useGetPayments, getGetPaymentsQueryKey } from "@workspace/api-client-react";



function formatCurrency(amount: number) { return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0 }); }
const iso = formatLocalISODate;

type Preset = "today" | "week" | "previousMonth" | "month" | "year" | "custom" | "all";


export default function CollectionScreen() {
  const colors = useColors(); const insets = useSafeAreaInsets();
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

  const [agency, setAgency] = useState<number | null>(null);
  const [mode, setMode] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"payments" | "agencies">("payments");
  const ready = Boolean(range.fromDate && range.toDate && range.fromDate <= range.toDate);
  const report = useGetPayments(
    { fromDate: range.fromDate, toDate: range.toDate },
    { query: { queryKey: getGetPaymentsQueryKey({ fromDate: range.fromDate, toDate: range.toDate }), enabled: ready, staleTime: 0, refetchOnMount: "always" } },
  );
  const rows = ready ? report.data ?? [] : [];
  const agencies = Array.from(new Map(rows.map(p => [p.customerId, p.customerName])).entries())
    .sort((a, b) => a[1].localeCompare(b[1]));
  const filtered = rows.filter(p => {
    const receipt = (p as typeof p & { slipNumber?: string }).slipNumber || "";
    const text = [p.customerName, receipt, p.notes, ...(p.allocations ?? []).map(a => a.invoiceNumber)].join(" ").toLowerCase();
    return (agency === null || p.customerId === agency) &&
      (mode === "all" || p.paymentMode === mode) && text.includes(search.trim().toLowerCase());
  });
  const total = filtered.reduce((sum, p) => sum + p.amount, 0);
  const count = filtered.length;
  const grouped = Array.from(filtered.reduce((map, p) => {
    const row = map.get(p.customerId) ?? { id: p.customerId, name: p.customerName, amount: 0, count: 0 };
    row.amount += p.amount; row.count++;
    map.set(p.customerId, row); return map;
  }, new Map<number, { id: number; name: string; amount: number; count: number }>()).values())
    .sort((a, b) => b.amount - a.amount);
  const modes = [["all", "All modes"], ["cash", "Cash"], ["upi", "UPI"], ["bank_transfer", "Bank"], ["cheque", "Cheque"]];
  const modeLabel = (key: string) => modes.find(m => m[0] === key)?.[1] || key;
  const chip = (label: string, active: boolean, press: () => void) =>
    <TouchableOpacity key={label} accessibilityRole="button" onPress={press} style={[styles.chip, { backgroundColor: active ? colors.primary : colors.card, borderColor: colors.border }]}>
      <Text style={{ color: active ? "#fff" : colors.foreground }}>{label}</Text>
    </TouchableOpacity>;
  const chips: { key: Preset; label: string }[] = [{ key: "today", label: "Today" }, { key: "week", label: "7 Days" }, { key: "previousMonth", label: "Previous Month" }, { key: "month", label: "This Month" }, { key: "year", label: "This Year" }, { key: "all", label: "All" }, { key: "custom", label: "Custom" }];
  const customDatesValid = Boolean(range.fromDate && range.toDate);
  const customReady = Boolean(customDatesValid && range.fromDate! <= range.toDate!);

  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
    contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {chips.map(c => chip(c.label, preset === c.key, () => setPreset(c.key)))}
    </View>
    {preset === "custom" && <>
      <View style={styles.customRow}>
        <TextInput accessibilityLabel="From date" value={customFrom} onChangeText={v => setCustomFrom(formatDateInput(v))} placeholder="From DD-MM-YY" keyboardType="number-pad" maxLength={8} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
        <TextInput accessibilityLabel="To date" value={customTo} onChangeText={v => setCustomTo(formatDateInput(v))} placeholder="To DD-MM-YY" keyboardType="number-pad" maxLength={8} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
      </View>
      {!ready && <Text style={{ color: colors.overdue }}>Enter valid dates; From date must be on or before To date.</Text>}
    </>}
    <TextInput accessibilityLabel="Search agency, bill or receipt" value={search} onChangeText={setSearch}
      placeholder="Search agency, bill or receipt" placeholderTextColor={colors.mutedForeground}
      style={[styles.input, { flex: 0, color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} />
    <Text style={{ color: colors.mutedForeground }}>AGENCY</Text>
    <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
      {chip("All agencies", agency === null, () => setAgency(null))}
      {agencies.map(([id, name]) => chip(name, agency === id, () => setAgency(id)))}
    </ScrollView>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {modes.map(([key, label]) => chip(label, mode === key, () => setMode(key)))}
      {chip("Reset filters", false, () => { setPreset("month"); setAgency(null); setMode("all"); setSearch(""); })}
    </View>
    {report.isError ? <View style={styles.box}>
      <Text style={{ color: colors.overdue }}>Report could not load. Totals are unavailable.</Text>
      {chip("Retry", true, () => { void report.refetch(); })}
    </View> : !ready ? null : report.isLoading ? <ActivityIndicator color={colors.primary} /> : <>
      <View style={[styles.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={{ color: colors.mutedForeground }}>FILTERED COLLECTION</Text>
        <Text style={[styles.big, { color: colors.paid }]}>{formatCurrency(total)}</Text>
        <Text style={{ color: colors.foreground }}>{count} payments · {grouped.length} agencies</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {modes.slice(1).map(([key, label]) => <Text key={key} style={{ color: colors.mutedForeground }}>
            {label}: {formatCurrency(filtered.filter(p => p.paymentMode === key).reduce((sum, p) => sum + p.amount, 0))}
          </Text>)}
        </View>
        {chip(report.isFetching ? "Refreshing…" : "Refresh report", false, () => { void report.refetch(); })}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {chip("Payment details", view === "payments", () => setView("payments"))}
        {chip("Agency totals", view === "agencies", () => setView("agencies"))}
      </View>
      {!filtered.length && <EmptyState icon="bar-chart-2" title="No payments" subtitle="No payments match these filters" />}
      {view === "agencies" ? grouped.map(g => <TouchableOpacity key={g.id}
        onPress={() => { setAgency(g.id); setView("payments"); }}
        style={[styles.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.name, { color: colors.foreground }]}>{g.name}</Text>
        <Text style={{ color: colors.paid }}>{formatCurrency(g.amount)} · {g.count} payments</Text>
        <Text style={{ color: colors.mutedForeground }}>Tap to see payments</Text>
      </TouchableOpacity>) : filtered.map((p, index) => <View key={p.id}>
        {(index === 0 || filtered[index - 1].paymentDate !== p.paymentDate) && <Text style={{ color: colors.mutedForeground, marginBottom: 8 }}>
          {formatDateDDMMYY(p.paymentDate)} · {formatCurrency(filtered.filter(x => x.paymentDate === p.paymentDate).reduce((sum, x) => sum + x.amount, 0))}
        </Text>}
        <View style={[styles.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.name, { color: colors.foreground }]}>{p.customerName}</Text>
          <Text style={[styles.name, { color: colors.paid }]}>{formatCurrency(p.amount)}</Text>
          <Text style={{ color: colors.mutedForeground }}>{modeLabel(p.paymentMode)} · Payment #{p.id}</Text>
          {!!(p as typeof p & { slipNumber?: string }).slipNumber && <Text style={{ color: colors.foreground }}>Receipt: {(p as typeof p & { slipNumber?: string }).slipNumber}</Text>}
          {(p.allocations ?? []).map(a => <Text key={a.invoiceId} style={{ color: colors.foreground }}>Bill {a.invoiceNumber}: {formatCurrency(a.amount)}</Text>)}
          {!p.allocations?.length && <Text style={{ color: colors.mutedForeground }}>No bill allocation recorded</Text>}
          {!!p.notes && <Text style={{ color: colors.mutedForeground }}>{p.notes}</Text>}
        </View>
      </View>)}
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  customRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  box: { padding: 16, borderWidth: 1, borderRadius: 14, gap: 8 },
  big: { fontSize: 30, fontFamily: "Inter_700Bold" },
  name: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
});
