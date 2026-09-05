import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  medpayApi,
  MonthlyRegister as MonthlyRegisterData,
  RegisterAgency,
} from "@/lib/medpayApi";

const money = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key: string) =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

export default function MonthlyRegister() {
  const colors = useColors(),
    router = useRouter(),
    [month, setMonth] = useState(monthKey(new Date())),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const q = useQuery({
    queryKey: ["global-monthly-register", month],
    queryFn: () =>
      medpayApi<MonthlyRegisterData>(`/api/monthly-register?month=${month}`),
  });
  const move = (by: number) => {
    const d = new Date(`${month}-01T00:00:00`);
    d.setMonth(d.getMonth() + by);
    setMonth(monthKey(d));
  };
  const open = (a: RegisterAgency) =>
    router.push({
      pathname: "/register/agency",
      params: { agencyId: String(a.agencyId), agencyName: a.agencyName, month },
    } as any);
  const agencies = q.data?.agencies || [],
    total = q.data?.summary;
  const category = (a: RegisterAgency) =>
    a.status === "no_transaction"
      ? "no_entry"
      : a.status === "paid"
        ? "paid"
        : a.status === "partial"
          ? "due"
          : "unpaid";
  const visible = useMemo(
    () =>
      agencies
        .filter((a) => {
          const matchesName = a.agencyName
            .toLowerCase()
            .includes(search.trim().toLowerCase());
          return matchesName && (filter === "all" || category(a) === filter);
        })
        .sort(
          (a, b) => a.serialNumber - b.serialNumber || a.agencyId - b.agencyId,
        ),
    [agencies, search, filter],
  );
  const filterItems = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "unpaid", label: "Unpaid" },
    { key: "due", label: "Due / Partial" },
    { key: "no_entry", label: "No Entry" },
  ];
  const topDue = [...agencies]
    .filter((a) => a.totalRemaining > 0)
    .sort((a, b) => b.totalRemaining - a.totalRemaining)
    .slice(0, 5);
  const maxDue = Math.max(...topDue.map((a) => a.totalRemaining), 1);
  const status = (a: RegisterAgency) =>
    a.status === "no_transaction"
      ? "NO ENTRY"
      : a.status === "paid"
        ? "PAID"
        : a.status === "partial"
          ? "DUE / PARTIAL"
          : "UNPAID";
  return (
    <View style={[s.page, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.title, { color: colors.foreground }]}>
          Agency Monthly Register
        </Text>
        <View
          style={[
            s.monthBar,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={() => move(-1)} style={s.arrow}>
            <Feather name="chevron-left" size={25} color={colors.primary} />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={[s.month, { color: colors.foreground }]}>
              {monthLabel(month)}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
              Month change karein
            </Text>
          </View>
          <TouchableOpacity onPress={() => move(1)} style={s.arrow}>
            <Feather name="chevron-right" size={25} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {!q.isLoading && !q.isError && (
          <View
            style={[
              s.graphCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={s.graphHeading}>
              <View>
                <Text style={[s.graphTitle, { color: colors.foreground }]}>
                  Top Agency Dues
                </Text>
                <Text style={[s.graphSub, { color: colors.mutedForeground }]}>
                  Selected month ka highest baki
                </Text>
              </View>
              <Feather name="bar-chart-2" size={20} color={colors.primary} />
            </View>
            {topDue.length === 0 ? (
              <View style={s.clearGraph}>
                <Feather name="check-circle" size={21} color={colors.paid} />
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                  Is month koi baki nahi hai
                </Text>
              </View>
            ) : (
              topDue.map((a) => (
                <View key={a.agencyId} style={s.graphRow}>
                  <View style={s.graphLabelRow}>
                    <Text
                      numberOfLines={1}
                      style={[s.graphName, { color: colors.foreground }]}
                    >
                      {a.agencyName}
                    </Text>
                    <Text style={[s.graphValue, { color: colors.overdue }]}>
                      {money(a.totalRemaining)}
                    </Text>
                  </View>
                  <View style={[s.track, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        s.fill,
                        {
                          backgroundColor: colors.overdue,
                          width:
                            `${Math.max(5, (a.totalRemaining / maxDue) * 100)}%` as any,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        )}
        <View
          style={[
            s.searchBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={17} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search agency..."
            placeholderTextColor={colors.mutedForeground}
            style={[s.searchInput, { color: colors.foreground }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={17} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filters}
        >
          {filterItems.map((f) => {
            const active = filter === f.key,
              count =
                f.key === "all"
                  ? agencies.length
                  : agencies.filter((a) => category(a) === f.key).length;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  s.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    s.filterText,
                    { color: active ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {f.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={[s.header, { backgroundColor: colors.primary }]}>
          <Text style={[s.head, s.agencyCol]}>S.NO / AGENCY</Text>
          <Text style={[s.head, s.statusCol]}>STATUS</Text>
          <Text style={[s.head, s.amountCol]}>BAKI</Text>
        </View>
        {q.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
        ) : q.isError ? (
          <Text
            style={{
              color: colors.destructive,
              textAlign: "center",
              padding: 25,
            }}
          >
            Register load nahi hua.
          </Text>
        ) : visible.length === 0 ? (
          <Text
            style={{
              color: colors.mutedForeground,
              textAlign: "center",
              padding: 30,
            }}
          >
            Is filter me koi agency nahi hai.
          </Text>
        ) : (
          visible.map((a) => {
            const inactive = a.status === "no_transaction",
              clear = a.status === "paid",
              partial = a.status === "partial",
              statusColor = inactive
                ? colors.mutedForeground
                : clear
                  ? colors.paid
                  : partial
                    ? colors.warning
                    : colors.overdue;
            return (
              <TouchableOpacity
                key={a.agencyId}
                onPress={() => open(a)}
                style={[
                  s.row,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    s.agencyCol,
                    { flexDirection: "row", gap: 9, alignItems: "center" },
                  ]}
                >
                  <Text style={[s.serial, { color: colors.primary }]}>
                    #{a.serialNumber}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.agencyName, { color: colors.foreground }]}>
                      {a.agencyName}
                    </Text>
                    <Text
                      style={{ color: colors.mutedForeground, fontSize: 10 }}
                    >
                      {a.totalBills} bill(s)
                      {inactive ? " · No transaction" : ""}
                    </Text>
                  </View>
                </View>
                <View style={s.statusCol}>
                  <View
                    style={[s.badge, { backgroundColor: statusColor + "18" }]}
                  >
                    <Text
                      style={{
                        color: statusColor,
                        fontSize: 10,
                        fontFamily: "Inter_700Bold",
                      }}
                    >
                      {status(a)}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    s.amountCol,
                    {
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: 7,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.amount,
                      {
                        color: inactive
                          ? colors.mutedForeground
                          : clear
                            ? colors.paid
                            : colors.overdue,
                      },
                    ]}
                  >
                    {money(a.totalRemaining)}
                  </Text>
                  <TouchableOpacity
                    onPress={(event) => {
                      event.stopPropagation();
                      router.push(`/customer/edit/${a.agencyId}` as any);
                    }}
                    hitSlop={8}
                  >
                    <Feather name="edit-2" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        {!q.isLoading && !q.isError && (
          <View
            style={[
              s.summaryCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={s.summaryHeader}>
              <View>
                <Text style={[s.summaryTitle, { color: colors.foreground }]}>
                  MONTHLY SUMMARY
                </Text>
                <Text style={[s.summarySub, { color: colors.mutedForeground }]}>
                  {total?.totalAgencies || 0} agencies ·{" "}
                  {total?.totalBills || 0} bills
                </Text>
              </View>
              <Feather name="pie-chart" size={21} color={colors.primary} />
            </View>
            <View style={s.summaryGrid}>
              <View
                style={[
                  s.summaryItem,
                  { backgroundColor: colors.primary + "12" },
                ]}
              >
                <Text style={[s.summaryLabel, { color: colors.primary }]}>
                  TOTAL
                </Text>
                <Text style={[s.summaryAmount, { color: colors.foreground }]}>
                  {money(total?.totalBillAmount || 0)}
                </Text>
              </View>
              <View
                style={[s.summaryItem, { backgroundColor: colors.paid + "12" }]}
              >
                <Text style={[s.summaryLabel, { color: colors.paid }]}>
                  PAID
                </Text>
                <Text style={[s.summaryAmount, { color: colors.paid }]}>
                  {money(total?.totalPaid || 0)}
                </Text>
              </View>
              <View
                style={[
                  s.summaryItem,
                  { backgroundColor: colors.overdue + "12" },
                ]}
              >
                <Text style={[s.summaryLabel, { color: colors.overdue }]}>
                  DUE / BAKI
                </Text>
                <Text style={[s.summaryAmount, { color: colors.overdue }]}>
                  {money(total?.totalRemaining || 0)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  page: { flex: 1 },
  content: {
    padding: 16,
    gap: 10,
    paddingBottom: 45,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 2 },
  monthBar: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  arrow: { padding: 8 },
  month: { fontSize: 18, fontFamily: "Inter_700Bold" },
  graphCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 11 },
  graphHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  graphTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  graphSub: { fontSize: 10, marginTop: 2 },
  graphRow: { gap: 5 },
  graphLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  graphName: { flex: 1, fontSize: 11, fontFamily: "Inter_600SemiBold" },
  graphValue: { fontSize: 11, fontFamily: "Inter_700Bold" },
  track: { height: 7, borderRadius: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
  clearGraph: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  searchBox: {
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  filters: { gap: 7, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  header: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 5,
  },
  head: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  agencyCol: { flex: 1.7 },
  statusCol: { flex: 0.8, alignItems: "center" },
  amountCol: { flex: 1, textAlign: "right" },
  row: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  serial: { fontSize: 11, width: 28, fontFamily: "Inter_700Bold" },
  agencyName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12 },
  amount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  summaryCard: {
    marginTop: 5,
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    gap: 13,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  summarySub: { fontSize: 10, marginTop: 3 },
  summaryGrid: { flexDirection: "row", gap: 7 },
  summaryItem: {
    flex: 1,
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 11,
    minHeight: 68,
  },
  summaryLabel: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
  },
  summaryAmount: { fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 8 },
});
