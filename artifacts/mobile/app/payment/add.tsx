import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatDateDDMMYY, ddmmyyToISO } from "@/lib/dateFormat";
import {
  useRecordPayment, useGetCustomers, useGetCustomerInvoices,
  getGetPaymentsQueryKey, getGetDashboardStatsQueryKey,
  getGetInvoicesQueryKey, getGetCustomersQueryKey,
} from "@workspace/api-client-react";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

type PaymentMode = "cash" | "upi" | "bank_transfer" | "cheque";

const MODES: { key: PaymentMode; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "cash", label: "Cash", icon: "dollar-sign" },
  { key: "upi", label: "UPI", icon: "smartphone" },
  { key: "bank_transfer", label: "Bank Transfer", icon: "briefcase" },
  { key: "cheque", label: "Cheque", icon: "file-text" },
];

function todayDisplay() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getFullYear()).slice(-2)}`;
}

function money(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function AddPaymentScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ customerId?: string; customerName?: string }>();
  const { mutateAsync, isPending } = useRecordPayment();
  const { data: customers } = useGetCustomers({});

  const [selectedCustomerId, setSelectedCustomerId] = useState(params.customerId || "");
  const [selectedCustomerName, setSelectedCustomerName] = useState(params.customerName || "");
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [paymentDate, setPaymentDate] = useState(todayDisplay());
  const [notes, setNotes] = useState("");

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers ?? [];
    return (customers ?? []).filter(c => c.name.toLowerCase().includes(q));
  }, [customers, customerSearch]);

  const customerIdNumber = selectedCustomerId ? parseInt(selectedCustomerId) : 0;
  const { data: invoices, isLoading: invoicesLoading } = useGetCustomerInvoices(customerIdNumber);

  const pendingInvoices = useMemo(
    () => (invoices ?? []).filter(inv => inv.outstandingBalance > 0 && inv.status !== "paid"),
    [invoices],
  );

  const selectedTotal = useMemo(
    () => pendingInvoices.filter(inv => selectedInvoiceIds.includes(inv.id)).reduce((sum, inv) => sum + Number(inv.outstandingBalance || 0), 0),
    [pendingInvoices, selectedInvoiceIds],
  );

  const chooseCustomer = (id: number, name: string) => {
    setSelectedCustomerId(String(id));
    setSelectedCustomerName(name);
    setSelectedInvoiceIds([]);
    setAmount("");
    setCustomerSearch("");
    setShowCustomerPicker(false);
  };

  const toggleInvoice = (invoiceId: number) => {
    const next = selectedInvoiceIds.includes(invoiceId) ? selectedInvoiceIds.filter(id => id !== invoiceId) : [...selectedInvoiceIds, invoiceId];
    setSelectedInvoiceIds(next);
    const nextTotal = pendingInvoices.filter(inv => next.includes(inv.id)).reduce((sum, inv) => sum + Number(inv.outstandingBalance || 0), 0);
    setAmount(nextTotal > 0 ? nextTotal.toFixed(2) : "");
  };

  const handleSave = async () => {
    const isoDate = ddmmyyToISO(paymentDate);
    const numericAmount = parseFloat(amount);
    if (!selectedCustomerId) return Alert.alert("Validation", "Please select a medical store");
    if (selectedInvoiceIds.length === 0) return Alert.alert("Validation", "Please select at least one bill");
    if (!isoDate) return Alert.alert("Validation", "Enter date in DD-MM-YY format");
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return Alert.alert("Validation", "Please enter a valid payment amount");
    if (numericAmount > selectedTotal + 0.001) return Alert.alert("Validation", "Payment cannot exceed selected bills outstanding");

    try {
      const result = await mutateAsync({ data: {
        customerId: parseInt(selectedCustomerId), paymentDate: isoDate, amount: numericAmount,
        paymentMode, notes: notes.trim() || undefined, invoiceIds: selectedInvoiceIds,
      } as any });
      queryClient.invalidateQueries({ queryKey: getGetPaymentsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/date-wise-collection"] });
      const allocated = result.allocations?.length || 0;
      Alert.alert("Payment Recorded", `${money(numericAmount)} paid successfully.\n${allocated} bill(s) updated.`, [{ text: "OK", onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to record payment.");
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Medical Store *</Text>
          <TouchableOpacity style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => setShowCustomerPicker(v => !v)}>
            <Text style={[styles.selectorText, { color: selectedCustomerName ? colors.foreground : colors.mutedForeground }]}>{selectedCustomerName || "Select medical store"}</Text>
            <Feather name={showCustomerPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          {showCustomerPicker && (
            <View style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
                <Feather name="search" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  placeholder="Search agency / store"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.searchInput, { color: colors.foreground }]}
                  autoCorrect={false}
                />
                {!!customerSearch && <TouchableOpacity onPress={() => setCustomerSearch("")}><Feather name="x" size={16} color={colors.mutedForeground} /></TouchableOpacity>}
              </View>
              <ScrollView style={styles.customerList} contentContainerStyle={styles.customerListContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator>
                {filteredCustomers.length === 0 ? (
                  <Text style={[styles.noResults, { color: colors.mutedForeground }]}>No store found</Text>
                ) : filteredCustomers.map(c => (
                  <TouchableOpacity key={c.id} style={[styles.pickerItem, { borderBottomColor: colors.border }]} onPress={() => chooseCustomer(c.id, c.name)}>
                    <Text style={[styles.pickerText, { color: colors.foreground }]}>{c.name}</Text>
                    {c.totalOutstanding > 0 && <Text style={[styles.pickerSub, { color: colors.overdue }]}>Dues: {money(c.totalOutstanding)}</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {selectedCustomerId ? (
          <View style={styles.field}>
            <View style={styles.billsHeader}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Select Bills *</Text>
              {selectedInvoiceIds.length > 0 && <Text style={[styles.selectedTotal, { color: colors.primary }]}>Selected: {money(selectedTotal)}</Text>}
            </View>
            {invoicesLoading ? <View style={styles.billLoader}><ActivityIndicator color={colors.primary} /></View> : pendingInvoices.length === 0 ? (
              <View style={[styles.emptyBills, { borderColor: colors.border, backgroundColor: colors.card }]}><Feather name="check-circle" size={18} color={colors.paid} /><Text style={[styles.emptyBillsText, { color: colors.mutedForeground }]}>No pending bills for this store</Text></View>
            ) : (
              <View style={[styles.billList, { borderColor: colors.border, backgroundColor: colors.card }]}>
                {pendingInvoices.map((inv, index) => {
                  const selected = selectedInvoiceIds.includes(inv.id);
                  return (
                    <TouchableOpacity key={inv.id} style={[styles.billRow, index < pendingInvoices.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }, selected && { backgroundColor: colors.primary + "0D" }]} onPress={() => toggleInvoice(inv.id)} activeOpacity={0.75}>
                      <View style={[styles.checkbox, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" }]}>{selected && <Feather name="check" size={14} color="#fff" />}</View>
                      <View style={styles.billInfo}><Text style={[styles.billNo, { color: colors.foreground }]}>Bill #{inv.invoiceNumber}</Text><Text style={[styles.billMeta, { color: colors.mutedForeground }]}>{formatDateDDMMYY(inv.invoiceDate)} · Due {formatDateDDMMYY(inv.dueDate)}</Text></View>
                      <View style={styles.billAmounts}><Text style={[styles.billOutstanding, { color: colors.overdue }]}>{money(inv.outstandingBalance)}</Text><Text style={[styles.billOriginal, { color: colors.mutedForeground }]}>of {money(inv.billAmount)}</Text></View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Payment Date *</Text>
          <TextInput value={paymentDate} onChangeText={setPaymentDate} placeholder="DD-MM-YY" placeholderTextColor={colors.mutedForeground} keyboardType="numbers-and-punctuation" style={inputStyle} />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Amount (₹) *</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" style={inputStyle} />
          {selectedInvoiceIds.length > 0 && <Text style={[styles.amountHint, { color: colors.mutedForeground }]}>You can enter a lower amount for partial payment.</Text>}
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Payment Mode *</Text>
          <View style={styles.modesGrid}>{MODES.map(m => { const active = paymentMode === m.key; return <TouchableOpacity key={m.key} style={[styles.modeBtn, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + "15" : colors.card }]} onPress={() => setPaymentMode(m.key)}><Feather name={m.icon} size={18} color={active ? colors.primary : colors.mutedForeground} /><Text style={[styles.modeBtnText, { color: active ? colors.primary : colors.mutedForeground }]}>{m.label}</Text></TouchableOpacity>; })}</View>
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes (Optional)</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="e.g. Cheque #12345" placeholderTextColor={colors.mutedForeground} style={[inputStyle, styles.multiline]} multiline numberOfLines={3} />
        </View>
        <View style={[styles.autoNote, { backgroundColor: colors.accent, borderColor: colors.accentForeground + "30" }]}><Feather name="info" size={14} color={colors.accentForeground} /><Text style={[styles.autoNoteText, { color: colors.accentForeground }]}>Only the bills you select above will be adjusted.</Text></View>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.paid }, isPending && { opacity: 0.7 }]} onPress={handleSave} disabled={isPending} activeOpacity={0.8}>{isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Pay Selected Bills</Text>}</TouchableOpacity>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 20, gap: 16, paddingBottom: 40 }, field: { gap: 6 }, label: { fontSize: 12, fontFamily: "Inter_500Medium" }, input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular" }, multiline: { height: 80, textAlignVertical: "top" }, selector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 }, selectorText: { fontSize: 14, fontFamily: "Inter_400Regular" }, picker: { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: "hidden" }, searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderBottomWidth: 1 }, searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 }, customerList: { maxHeight: 260 }, customerListContent: { flexGrow: 1 }, pickerItem: { paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 }, pickerText: { fontSize: 14, fontFamily: "Inter_400Regular" }, pickerSub: { fontSize: 11, fontFamily: "Inter_500Medium" }, noResults: { padding: 16, textAlign: "center", fontSize: 12 }, billsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, selectedTotal: { fontSize: 12, fontFamily: "Inter_700Bold" }, billLoader: { paddingVertical: 18, alignItems: "center" }, emptyBills: { borderWidth: 1, borderRadius: 10, padding: 14, flexDirection: "row", gap: 8, alignItems: "center" }, emptyBillsText: { fontSize: 12, fontFamily: "Inter_400Regular" }, billList: { borderWidth: 1, borderRadius: 12, overflow: "hidden" }, billRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 }, checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" }, billInfo: { flex: 1, gap: 2 }, billNo: { fontSize: 13, fontFamily: "Inter_600SemiBold" }, billMeta: { fontSize: 10, fontFamily: "Inter_400Regular" }, billAmounts: { alignItems: "flex-end", gap: 1 }, billOutstanding: { fontSize: 13, fontFamily: "Inter_700Bold" }, billOriginal: { fontSize: 9, fontFamily: "Inter_400Regular" }, amountHint: { fontSize: 10, fontFamily: "Inter_400Regular" }, modesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, modeBtn: { flex: 1, minWidth: "45%", flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 }, modeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" }, autoNote: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 10, borderWidth: 1 }, autoNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 }, saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 }, saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
