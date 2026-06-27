import React, { useState } from "react";
import {
  View, FlatList, StyleSheet, TouchableOpacity, Text,
  ScrollView, Platform, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { InvoiceCard } from "@/components/InvoiceCard";
import { StatusBadge } from "@/components/StatusBadge";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { useGetInvoices } from "@workspace/api-client-react";
import type { Invoice } from "@workspace/api-client-react";

const STATUS_FILTERS = ["all", "pending", "partial", "overdue", "paid"] as const;
const STATUS_LABELS: Record<string, string> = { all: "All", pending: "Pending", partial: "Partial", overdue: "Overdue", paid: "Paid" };

function fmt(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
}

function DesktopTable({ invoices, onPress }: { invoices: Invoice[]; onPress: (id: number) => void }) {
  const colors = useColors();
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={[dt.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[dt.headerRow, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1 }]}>#</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 2 }]}>Customer</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1.2 }]}>Invoice Date</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1.2 }]}>Due Date</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1.3, textAlign: "right" }]}>Bill Amount</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1.3, textAlign: "right" }]}>Outstanding</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1, textAlign: "center" }]}>Status</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 0.6, textAlign: "center" }]}>View</Text>
        </View>
        {invoices.map((inv, i) => {
          const isLast = i === invoices.length - 1;
          const isOverdue = inv.status === "overdue";
          return (
            <TouchableOpacity
              key={inv.id}
              style={[dt.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => onPress(inv.id)}
              activeOpacity={0.7}
            >
              <Text style={[dt.cell, { flex: 1, color: colors.primary, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                #{inv.invoiceNumber}
              </Text>
              <Text style={[dt.cell, { flex: 2, color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                {inv.customerName}
              </Text>
              <Text style={[dt.cell, { flex: 1.2, color: colors.mutedForeground }]} numberOfLines={1}>
                {fmtDate(inv.invoiceDate)}
              </Text>
              <Text style={[dt.cell, { flex: 1.2, color: isOverdue ? colors.overdue : colors.mutedForeground }]} numberOfLines={1}>
                {fmtDate(inv.dueDate)}
              </Text>
              <Text style={[dt.cell, { flex: 1.3, textAlign: "right", color: colors.foreground }]} numberOfLines={1}>
                {fmt(inv.billAmount)}
              </Text>
              <Text style={[dt.cell, {
                flex: 1.3, textAlign: "right",
                color: inv.outstandingBalance > 0 ? colors.overdue : colors.paid,
                fontFamily: "Inter_700Bold",
              }]} numberOfLines={1}>
                {inv.outstandingBalance > 0 ? fmt(inv.outstandingBalance) : "Paid"}
              </Text>
              <View style={[{ flex: 1, alignItems: "center" }]}>
                <StatusBadge status={inv.status} />
              </View>
              <View style={[{ flex: 0.6, alignItems: "center" }]}>
                <Feather name="chevron-right" size={16} color={colors.primary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

export default function InvoicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const isWeb = Platform.OS === "web";
  const { isDesktop } = useBreakpoint();

  const { data: invoices, isLoading, refetch } = useGetInvoices({
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });

  const headerPaddingTop = isDesktop ? 20 : isWeb ? 67 + 12 : insets.top + 12;
  const totalBill = (invoices ?? []).reduce((s, inv) => s + inv.billAmount, 0);
  const totalOut = (invoices ?? []).reduce((s, inv) => s + inv.outstandingBalance, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        paddingTop: headerPaddingTop,
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
        paddingHorizontal: isDesktop ? 28 : 20,
      }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Invoices</Text>
          {invoices && invoices.length > 0 && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {invoices.length} invoices · Outstanding: {fmt(totalOut)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/invoice/add")}
        >
          <Feather name="plus" size={18} color="#fff" />
          {isDesktop && <Text style={styles.addBtnText}>New Invoice</Text>}
        </TouchableOpacity>
      </View>

      {/* Search + Filters */}
      <View style={[styles.filterWrap, { paddingHorizontal: isDesktop ? 28 : 16 }]}>
        <View style={isDesktop ? styles.filterRowDesktop : undefined}>
          <View style={isDesktop ? { flex: 1, maxWidth: 360 } : undefined}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search by invoice # or store..." />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            style={isDesktop ? styles.filterScrollDesktop : styles.filterScroll}
          >
            {STATUS_FILTERS.map(f => {
              const active = status === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, {
                    backgroundColor: active ? colors.primary : colors.muted,
                    borderColor: active ? colors.primary : colors.border,
                  }]}
                  onPress={() => setStatus(f)}
                >
                  <Text style={[styles.filterText, { color: active ? "#fff" : colors.mutedForeground }]}>
                    {STATUS_LABELS[f]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : isDesktop ? (
        invoices && invoices.length > 0 ? (
          <View style={{ flex: 1, paddingHorizontal: 28, paddingBottom: 28 }}>
            <DesktopTable invoices={invoices} onPress={id => router.push(`/invoice/${id}`)} />
          </View>
        ) : (
          <EmptyState icon="file-text" title={search || status !== "all" ? "No invoices found" : "No invoices yet"} subtitle="Click 'New Invoice' to get started" />
        )
      ) : (
        <FlatList
          data={invoices ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <InvoiceCard invoice={item} onPress={() => router.push(`/invoice/${item.id}`)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="file-text"
              title={search || status !== "all" ? "No invoices found" : "No invoices yet"}
              subtitle={search || status !== "all" ? "Try different filters" : "Tap + to add your first invoice"}
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10, justifyContent: "center" },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  filterWrap: { paddingVertical: 8 },
  filterRowDesktop: { flexDirection: "row", alignItems: "center", gap: 12 },
  filterScrollDesktop: { flex: 1 },
  filterScroll: { maxHeight: 48 },
  filterRow: { paddingVertical: 6, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingTop: 4 },
});

const dt = StyleSheet.create({
  table: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 12, paddingHorizontal: 16 },
  th: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", paddingVertical: 14, paddingHorizontal: 16, alignItems: "center" },
  cell: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
