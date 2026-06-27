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
import { PaymentCard } from "@/components/PaymentCard";
import { EmptyState } from "@/components/EmptyState";
import { useGetPayments } from "@workspace/api-client-react";
import { generateReceiptPdf } from "@/lib/generatePdf";
import { shareReceiptOnWhatsApp } from "@/lib/shareWhatsApp";
import type { Payment } from "@workspace/api-client-react";

const MODE_FILTERS = ["all", "cash", "upi", "bank_transfer", "cheque"] as const;
const MODE_LABELS: Record<string, string> = { all: "All", cash: "Cash", upi: "UPI", bank_transfer: "Bank", cheque: "Cheque" };
const MODE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  cash: "dollar-sign",
  upi: "smartphone",
  bank_transfer: "briefcase",
  cheque: "file-text",
};

function fmt(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function DesktopTable({
  payments, onReceipt, onWhatsApp,
}: {
  payments: Payment[];
  onReceipt: (p: Payment) => void;
  onWhatsApp: (p: Payment) => void;
}) {
  const colors = useColors();
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={[dt.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[dt.headerRow, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 2 }]}>Customer</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1.5 }]}>Date</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1.2 }]}>Mode</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1.5, textAlign: "right" }]}>Amount</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1.5 }]}>Reference</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1.5, textAlign: "center" }]}>Actions</Text>
        </View>
        {payments.map((p, i) => {
          const isLast = i === payments.length - 1;
          const icon = MODE_ICONS[p.paymentMode] ?? "credit-card";
          return (
            <View
              key={p.id}
              style={[dt.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              <View style={[{ flex: 2, flexDirection: "row", alignItems: "center", gap: 8 }]}>
                <View style={[dt.modeIcon, { backgroundColor: colors.paid + "20" }]}>
                  <Feather name={icon} size={14} color={colors.paid} />
                </View>
                <Text style={[dt.cell, { color: colors.foreground, fontFamily: "Inter_600SemiBold", flex: 1 }]} numberOfLines={1}>
                  {p.customerName}
                </Text>
              </View>
              <Text style={[dt.cell, { flex: 1.5, color: colors.mutedForeground }]} numberOfLines={1}>
                {fmtDate(p.paymentDate)}
              </Text>
              <Text style={[dt.cell, { flex: 1.2, color: colors.mutedForeground }]} numberOfLines={1}>
                {MODE_LABELS[p.paymentMode] ?? p.paymentMode}
              </Text>
              <Text style={[dt.cell, { flex: 1.5, textAlign: "right", color: colors.paid, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
                {fmt(p.amount)}
              </Text>
              <Text style={[dt.cell, { flex: 1.5, color: colors.mutedForeground }]} numberOfLines={1}>
                {(p as any).referenceNumber ?? "—"}
              </Text>
              <View style={[{ flex: 1.5, flexDirection: "row", justifyContent: "center", gap: 6 }]}>
                <TouchableOpacity
                  style={[dt.actionBtn, { borderColor: colors.border }]}
                  onPress={() => onReceipt(p)}
                >
                  <Feather name="download" size={12} color={colors.mutedForeground} />
                  <Text style={[dt.actionBtnText, { color: colors.mutedForeground }]}>PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[dt.actionBtn, { borderColor: "#25D36660", backgroundColor: "#25D36612" }]}
                  onPress={() => onWhatsApp(p)}
                >
                  <Feather name="message-circle" size={12} color="#25D366" />
                  <Text style={[dt.actionBtnText, { color: "#25D366" }]}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

export default function PaymentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState("all");
  const isWeb = Platform.OS === "web";
  const { isDesktop } = useBreakpoint();

  const { data: payments, isLoading, refetch } = useGetPayments({
    paymentMode: mode === "all" ? undefined : mode,
  });

  const total = (payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  const headerPaddingTop = isDesktop ? 20 : isWeb ? 67 + 12 : insets.top + 12;

  const handleReceipt = (p: Payment) =>
    generateReceiptPdf({
      id: p.id,
      customerName: p.customerName,
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentMode: p.paymentMode,
      referenceNumber: (p as any).referenceNumber,
      notes: (p as any).notes,
    });

  const handleWhatsApp = (p: Payment) =>
    shareReceiptOnWhatsApp({
      id: p.id,
      customerName: p.customerName,
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentMode: p.paymentMode,
      referenceNumber: (p as any).referenceNumber,
      notes: (p as any).notes,
    });

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
          <Text style={[styles.title, { color: colors.foreground }]}>Payments</Text>
          {payments && payments.length > 0 && (
            <Text style={[styles.subtitle, { color: colors.paid }]}>
              {payments.length} payments · Total: {fmt(total)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.paid }]}
          onPress={() => router.push("/payment/add")}
        >
          <Feather name="plus" size={18} color="#fff" />
          {isDesktop && <Text style={styles.addBtnText}>Record Payment</Text>}
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterRow, { paddingHorizontal: isDesktop ? 28 : 16 }]}
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
      ) : isDesktop ? (
        payments && payments.length > 0 ? (
          <View style={{ flex: 1, paddingHorizontal: 28, paddingBottom: 28 }}>
            <DesktopTable
              payments={payments}
              onReceipt={handleReceipt}
              onWhatsApp={handleWhatsApp}
            />
          </View>
        ) : (
          <EmptyState icon="credit-card" title="No payments found" subtitle="Click 'Record Payment' to get started" />
        )
      ) : (
        <FlatList
          data={payments ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <PaymentCard
              payment={item}
              onPress={() => {}}
              onReceipt={() => handleReceipt(item)}
              onWhatsApp={() => handleWhatsApp(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState icon="credit-card" title="No payments found" subtitle="Tap + to record a payment" />
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
  subtitle: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10, justifyContent: "center" },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  filterScroll: { maxHeight: 48 },
  filterRow: { paddingVertical: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingTop: 4 },
});

const dt = StyleSheet.create({
  table: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 12, paddingHorizontal: 16 },
  th: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", paddingVertical: 12, paddingHorizontal: 16, alignItems: "center" },
  cell: { fontSize: 13, fontFamily: "Inter_500Medium" },
  modeIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  actionBtnText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
