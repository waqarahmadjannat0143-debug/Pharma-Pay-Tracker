import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/StatusBadge";
import { useGetInvoice, useDeleteInvoice, getGetInvoicesQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { generateInvoicePdf } from "@/lib/generatePdf";

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const colors = useColors();
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[rowStyles.value, { color: valueColor || colors.foreground }]}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 },
  label: { fontSize: 13, fontFamily: "Inter_400Regular" },
  value: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [pdfLoading, setPdfLoading] = useState(false);

  const invoiceId = parseInt(id);
  const { data: invoice, isLoading } = useGetInvoice(invoiceId);
  const { mutateAsync: deleteInvoice } = useDeleteInvoice();

  const handleExportPdf = async () => {
    if (!invoice) return;
    setPdfLoading(true);
    await generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      billAmount: invoice.billAmount,
      outstandingBalance: invoice.outstandingBalance,
      status: invoice.status,
      notes: (invoice as any).notes,
    });
    setPdfLoading(false);
  };

  const handleDelete = () => {
    Alert.alert("Delete Invoice", "Are you sure you want to delete this invoice?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteInvoice({ id: invoiceId });
          queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
          router.back();
        },
      },
    ]);
  };

  if (isLoading) return <View style={[styles.loader, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!invoice) return <View style={[styles.loader, { backgroundColor: colors.background }]}><Text style={{ color: colors.mutedForeground }}>Invoice not found</Text></View>;

  const isOverdue = invoice.status === "overdue";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (isWeb ? 34 : 20) }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: isOverdue ? colors.overdue : colors.primary }]}>
          <Text style={styles.invoiceNo}>#{invoice.invoiceNumber}</Text>
          <Text style={styles.customerName}>{invoice.customerName}</Text>
          <Text style={styles.heroAmount}>{formatCurrency(invoice.billAmount)}</Text>
          <StatusBadge status={invoice.status} />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
            onPress={handleExportPdf}
            disabled={pdfLoading}
          >
            {pdfLoading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Feather name="download" size={16} color={colors.primary} />
            }
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>
              {pdfLoading ? "Generating..." : "Export PDF"}
            </Text>
          </TouchableOpacity>
          {invoice.outstandingBalance > 0 && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.paid + "15", borderColor: colors.paid + "40" }]}
              onPress={() => router.push({ pathname: "/payment/add", params: { customerId: String(invoice.customerId), customerName: invoice.customerName } })}
            >
              <Feather name="plus-circle" size={16} color={colors.paid} />
              <Text style={[styles.actionBtnText, { color: colors.paid }]}>Record Payment</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}
            onPress={handleDelete}
          >
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Delete</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Invoice Details</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Due Date" value={formatDate(invoice.dueDate)} valueColor={isOverdue ? colors.overdue : undefined} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Bill Amount" value={formatCurrency(invoice.billAmount)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Outstanding Balance" value={formatCurrency(invoice.outstandingBalance)} valueColor={invoice.outstandingBalance > 0 ? colors.overdue : colors.paid} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Amount Paid" value={formatCurrency(invoice.billAmount - invoice.outstandingBalance)} valueColor={colors.paid} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { gap: 12 },
  hero: { padding: 28, alignItems: "center", gap: 8 },
  invoiceNo: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)" },
  customerName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  heroAmount: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -1 },
  actionRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, overflow: "hidden" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", paddingVertical: 14 },
  divider: { height: 1 },
});
