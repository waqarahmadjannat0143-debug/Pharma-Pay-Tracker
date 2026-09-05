import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { InvoiceCard } from "@/components/InvoiceCard";
import { EmptyState } from "@/components/EmptyState";
import {
  useGetCustomer,
  useDeleteCustomer,
  useGetCustomerInvoices,
  getGetCustomersQueryKey,
  getGetCustomerQueryKey,
} from "@workspace/api-client-react";

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0 });
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={infoStyles.row}>
      <Text style={[infoStyles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[infoStyles.value, { color: colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  label: { fontSize: 13, fontFamily: "Inter_400Regular" },
  value: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    textAlign: "right",
  },
});

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [purchasePeriod, setPurchasePeriod] = useState<"month" | "lifetime">(
    "month",
  );
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));

  const customerId = parseInt(id);
  const { data: customer, isLoading } = useGetCustomer(customerId);
  const { data: invoices } = useGetCustomerInvoices(customerId);
  const { mutateAsync: deleteCustomer } = useDeleteCustomer();

  const purchaseSummary = useMemo(() => {
    const selected = (invoices || []).filter(
      (invoice) =>
        purchasePeriod === "lifetime" ||
        String(invoice.invoiceDate).slice(0, 7) === selectedMonth,
    );
    return selected.reduce(
      (summary, invoice) => {
        const total = Number(invoice.billAmount || 0);
        const remaining = Number(invoice.outstandingBalance || 0);
        return {
          bills: summary.bills + 1,
          total: summary.total + total,
          paid: summary.paid + Math.max(0, total - remaining),
          remaining: summary.remaining + remaining,
        };
      },
      { bills: 0, total: 0, paid: 0, remaining: 0 },
    );
  }, [invoices, purchasePeriod, selectedMonth]);

  const moveMonth = (offset: number) => {
    const date = new Date(`${selectedMonth}-01T00:00:00`);
    date.setMonth(date.getMonth() + offset);
    setSelectedMonth(monthKey(date));
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Store",
      "Are you sure? This will delete all associated invoices.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteCustomer({ id: customerId });
            queryClient.invalidateQueries({
              queryKey: getGetCustomersQueryKey(),
            });
            router.back();
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Store not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (isWeb ? 34 : 20) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>
              {customer.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.heroName}>{customer.name}</Text>
          <Text style={styles.heroOwner}>{customer.ownerName}</Text>
          {customer.totalOutstanding > 0 && (
            <View style={styles.outstandingBadge}>
              <Text style={styles.outstandingText}>
                Outstanding: {formatCurrency(customer.totalOutstanding)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push(`/customer/edit/${id}`)}
          >
            <Feather name="edit-2" size={16} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>
              Edit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.paid + "15",
                borderColor: colors.paid + "40",
              },
            ]}
            onPress={() =>
              router.push({
                pathname: "/payment/add",
                params: { customerId: id, customerName: customer.name },
              })
            }
          >
            <Feather name="plus-circle" size={16} color={colors.paid} />
            <Text style={[styles.actionBtnText, { color: colors.paid }]}>
              Payment
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() =>
              router.push({
                pathname: "/report/ledger",
                params: { customerId: id, customerName: customer.name },
              })
            }
          >
            <Feather name="book" size={16} color={colors.mutedForeground} />
            <Text
              style={[styles.actionBtnText, { color: colors.mutedForeground }]}
            >
              Ledger
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.destructive + "15",
                borderColor: colors.destructive + "40",
              },
            ]}
            onPress={handleDelete}
          >
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[styles.actionBtnText, { color: colors.destructive }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Store Information
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Mobile" value={customer.mobile} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow
            label="GST Number"
            value={customer.gstNumber || "Not provided"}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Address" value={customer.address} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow
            label="Credit Limit"
            value={formatCurrency(customer.creditLimit)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Due Days" value={`${customer.dueDays} days`} />
        </View>

        <View
          style={[
            styles.purchaseCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.purchaseTopRow}>
            <View>
              <Text
                style={[styles.purchaseTitle, { color: colors.foreground }]}
              >
                Purchase Summary
              </Text>
              <Text
                style={[
                  styles.purchaseSubtitle,
                  { color: colors.mutedForeground },
                ]}
              >
                Is store se purchase ki clear position
              </Text>
            </View>
            <View
              style={[styles.periodSwitch, { backgroundColor: colors.muted }]}
            >
              <TouchableOpacity
                onPress={() => setPurchasePeriod("month")}
                style={[
                  styles.periodButton,
                  purchasePeriod === "month" && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.periodText,
                    {
                      color:
                        purchasePeriod === "month"
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  Month
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPurchasePeriod("lifetime")}
                style={[
                  styles.periodButton,
                  purchasePeriod === "lifetime" && {
                    backgroundColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.periodText,
                    {
                      color:
                        purchasePeriod === "lifetime"
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  Lifetime
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {purchasePeriod === "month" && (
            <View
              style={[
                styles.monthSelector,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => moveMonth(-1)}
                style={styles.monthArrow}
              >
                <Feather name="chevron-left" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.monthText, { color: colors.foreground }]}>
                {monthLabel(selectedMonth)}
              </Text>
              <TouchableOpacity
                onPress={() => moveMonth(1)}
                style={styles.monthArrow}
              >
                <Feather
                  name="chevron-right"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}

          <View
            style={[styles.totalPurchase, { backgroundColor: colors.primary }]}
          >
            <View>
              <Text
                style={[
                  styles.totalPurchaseLabel,
                  { color: colors.primaryForeground },
                ]}
              >
                TOTAL PURCHASE
              </Text>
              <Text
                style={[
                  styles.totalPurchaseValue,
                  { color: colors.primaryForeground },
                ]}
              >
                {formatCurrency(purchaseSummary.total)}
              </Text>
            </View>
            <View style={styles.billCountBadge}>
              <Text style={styles.billCountText}>
                {purchaseSummary.bills} bills
              </Text>
            </View>
          </View>

          <View style={styles.purchaseStats}>
            <View
              style={[
                styles.purchaseStat,
                { backgroundColor: colors.paid + "12" },
              ]}
            >
              <Text style={[styles.purchaseStatLabel, { color: colors.paid }]}>
                PAID
              </Text>
              <Text style={[styles.purchaseStatValue, { color: colors.paid }]}>
                {formatCurrency(purchaseSummary.paid)}
              </Text>
            </View>
            <View
              style={[
                styles.purchaseStat,
                { backgroundColor: colors.overdue + "12" },
              ]}
            >
              <Text
                style={[styles.purchaseStatLabel, { color: colors.overdue }]}
              >
                BAKI
              </Text>
              <Text
                style={[styles.purchaseStatValue, { color: colors.overdue }]}
              >
                {formatCurrency(purchaseSummary.remaining)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.invoicesHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Invoices ({invoices?.length ?? 0})
          </Text>
          <TouchableOpacity
            style={[styles.addInvoiceBtn, { backgroundColor: colors.primary }]}
            onPress={() =>
              router.push({
                pathname: "/invoice/add",
                params: { customerId: id, customerName: customer.name },
              })
            }
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={styles.addInvoiceBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {invoices && invoices.length > 0 ? (
          invoices.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              showCustomer={false}
              onPress={() => router.push(`/invoice/${inv.id}`)}
            />
          ))
        ) : (
          <EmptyState
            icon="file-text"
            title="No invoices"
            subtitle="Add an invoice for this store"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { gap: 12 },
  hero: {
    padding: 24,
    alignItems: "center",
    gap: 8,
    paddingTop: 32,
    paddingBottom: 28,
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  heroName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  heroOwner: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  outstandingBadge: {
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  outstandingText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  actionRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    paddingVertical: 14,
  },
  divider: { height: 1 },
  purchaseCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    gap: 13,
  },
  purchaseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  purchaseTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  purchaseSubtitle: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  periodSwitch: { flexDirection: "row", padding: 3, borderRadius: 10 },
  periodButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  periodText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  monthSelector: {
    borderWidth: 1,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 5,
    minHeight: 42,
  },
  monthArrow: { padding: 8 },
  monthText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  totalPurchase: {
    borderRadius: 13,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalPurchaseLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    opacity: 0.85,
  },
  totalPurchaseValue: {
    fontSize: 25,
    fontFamily: "Inter_700Bold",
    marginTop: 5,
  },
  billCountBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  billCountText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  purchaseStats: { flexDirection: "row", gap: 9 },
  purchaseStat: { flex: 1, borderRadius: 11, padding: 12 },
  purchaseStatLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  purchaseStatValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginTop: 7,
  },
  invoicesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  addInvoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addInvoiceBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
