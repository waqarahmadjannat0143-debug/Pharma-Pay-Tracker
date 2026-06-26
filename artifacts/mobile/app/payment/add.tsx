import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  useRecordPayment, useGetCustomers,
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
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const handleSave = async () => {
    if (!selectedCustomerId || !amount || parseFloat(amount) <= 0) {
      Alert.alert("Validation", "Please select a store and enter a valid amount");
      return;
    }
    try {
      const result = await mutateAsync({ data: {
        customerId: parseInt(selectedCustomerId),
        paymentDate,
        amount: parseFloat(amount),
        paymentMode,
        notes: notes.trim() || undefined,
      }});
      queryClient.invalidateQueries({ queryKey: getGetPaymentsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });

      const allocated = result.allocations?.length || 0;
      Alert.alert(
        "Payment Recorded",
        `₹${parseFloat(amount).toLocaleString("en-IN")} recorded successfully.\n${allocated} invoice(s) updated.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch {
      Alert.alert("Error", "Failed to record payment.");
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Medical Store *</Text>
          <TouchableOpacity
            style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setShowCustomerPicker(!showCustomerPicker)}
          >
            <Text style={[styles.selectorText, { color: selectedCustomerName ? colors.foreground : colors.mutedForeground }]}>
              {selectedCustomerName || "Select medical store"}
            </Text>
            <Feather name={showCustomerPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          {showCustomerPicker && (
            <View style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                {(customers ?? []).map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.pickerItem, { borderBottomColor: colors.border }]}
                    onPress={() => { setSelectedCustomerId(String(c.id)); setSelectedCustomerName(c.name); setShowCustomerPicker(false); }}
                  >
                    <Text style={[styles.pickerText, { color: colors.foreground }]}>{c.name}</Text>
                    {c.totalOutstanding > 0 && (
                      <Text style={[styles.pickerSub, { color: colors.overdue }]}>
                        Dues: ₹{c.totalOutstanding.toLocaleString("en-IN")}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Payment Date *</Text>
          <TextInput value={paymentDate} onChangeText={setPaymentDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} style={inputStyle} />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Amount (₹) *</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" style={inputStyle} />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Payment Mode *</Text>
          <View style={styles.modesGrid}>
            {MODES.map(m => {
              const active = paymentMode === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.modeBtn, {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary + "15" : colors.card,
                  }]}
                  onPress={() => setPaymentMode(m.key)}
                >
                  <Feather name={m.icon} size={18} color={active ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.modeBtnText, { color: active ? colors.primary : colors.mutedForeground }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes (Optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Cheque #12345"
            placeholderTextColor={colors.mutedForeground}
            style={[inputStyle, styles.multiline]}
            multiline numberOfLines={3}
          />
        </View>

        <View style={[styles.autoNote, { backgroundColor: colors.accent, borderColor: colors.accentForeground + "30" }]}>
          <Feather name="info" size={14} color={colors.accentForeground} />
          <Text style={[styles.autoNoteText, { color: colors.accentForeground }]}>
            Payment will be auto-adjusted against oldest pending invoices first.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.paid }, isPending && { opacity: 0.7 }]}
          onPress={handleSave} disabled={isPending} activeOpacity={0.8}
        >
          {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Record Payment</Text>}
        </TouchableOpacity>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular" },
  multiline: { height: 80, textAlignVertical: "top" },
  selector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  selectorText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  picker: { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: "hidden" },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, gap: 2 },
  pickerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  pickerSub: { fontSize: 11, fontFamily: "Inter_500Medium" },
  modesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modeBtn: { flex: 1, minWidth: "45%", flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  modeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  autoNote: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 10, borderWidth: 1 },
  autoNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
