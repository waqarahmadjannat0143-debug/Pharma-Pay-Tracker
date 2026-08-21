import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { InvoiceCard } from "@/components/InvoiceCard";
import { EmptyState } from "@/components/EmptyState";
import {
  useGetCustomer, useDeleteCustomer, useGetCustomerInvoices,
  getGetCustomersQueryKey, getGetCustomerQueryKey,
} from "@workspace/api-client-react";

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0 });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={infoStyles.row}>
      <Text style={[infoStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  label: { fontSize: 13, fontFamily: "Inter_400Regular" },
  value: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, textAlign: "right" },
});

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const customerId = parseInt(id);
  const { data: customer, isLoading } = useGetCustomer(customerId);
  const { data: invoices } = useGetCustomerInvoices(customerId);
  const { mutateAsync: deleteCustomer } = useDeleteCustomer();

  const handleDelete = () => {
    Alert.alert("Delete Store", "Are you sure? This will delete all associated invoices.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteCustomer({ id: customerId });
          queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
          router.back();
        },
      },
    ]);
  };

  if (isLoading) {
    return <View style={[styles.loader, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  if (!customer) {
    return <View style={[styles.loader, { backgroundColor: colors.background }]}><Text style={{ color: colors.mutedForeground }}>Store not found</Text></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (isWeb ? 34 : 20) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{customer.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.heroName}>{customer.name}</Text>
          <Text style={styles.heroOwner}>{customer.ownerName}</Text>
          {customer.totalOutstanding > 0 && (
            <View style={styles.outstandingBadge}>
              <Text style={styles.outstandingText}>Outstanding: {formatCurrency(customer.totalOutstanding)}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
            onPress={() => router.push({ pathname: "/register/[customerId]", params: { customerId: id, customerName: customer.name } } as any)}
          >
            <Feather name="calendar" size={16} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Register</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/customer/edit/${id}`)}
          >
            <Feather name="edit-2" size={16} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.paid + "15", borderColor: colors.paid + "40" }]}
            onPress={() => router.push({ pathname: "/payment/add", params: { customerId: id, customerName: customer.name } })}
          >
            <Feather name="plus-circle" size={16} color={colors.paid} />
            <Text style={[styles.actionBtnText, { color: colors.paid }]}>Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: "/report/ledger", params: { customerId: id, customerName: customer.name } })}
          >
            <Feather name="book" size={16} color={colors.mutedForeground} />
            <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>Ledger</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "40" }]}
            onPress={handleDelete}
          >
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Delete</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Store Information</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Mobile" value={customer.mobile} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="GST Number" value={customer.gstNumber || "Not provided"} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Address" value={customer.address} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Credit Limit" value={formatCurrency(customer.creditLimit)} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Due Days" value={`${customer.dueDays} days`} />
        </View>

        <View style={styles.invoicesHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Invoices ({invoices?.length ?? 0})</Text>
          <TouchableOpacity
            style={[styles.addInvoiceBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({ pathname: "/invoice/add", params: { customerId: id, customerName: customer.name } })}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={styles.addInvoiceBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {invoices && invoices.length > 0 ? (
          invoices.map(inv => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              showCustomer={false}
              onPress={() => router.push(`/invoice/${inv.id}`)}
            />
          ))
        ) : (
          <EmptyState icon="file-text" title="No invoices" subtitle="Add an invoice for this store" />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { gap: 12 },
  hero: { padding: 24, alignItems: "center", gap: 8, paddingTop: 32, paddingBottom: 28 },
  heroAvatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  heroAvatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  heroName: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  heroOwner: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  outstandingBadge: { backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  outstandingText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actionRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  card: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, overflow: "hidden" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", paddingVertical: 14 },
  divider: { height: 1 },
  invoicesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  addInvoiceBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addInvoiceBtnText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
