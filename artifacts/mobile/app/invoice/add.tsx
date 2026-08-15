import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatDateDDMMYY, ddmmyyToISO } from "@/lib/dateFormat";
import { useCreateInvoice, useGetCustomers, getGetInvoicesQueryKey, getGetCustomerInvoicesQueryKey } from "@workspace/api-client-react";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

function todayDisplay() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getFullYear()).slice(-2)}`;
}

export default function AddInvoiceScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ customerId?: string; customerName?: string }>();
  const { mutateAsync, isPending } = useCreateInvoice();
  const { data: customers } = useGetCustomers({});

  const [selectedCustomerId, setSelectedCustomerId] = useState(params.customerId || "");
  const [selectedCustomerName, setSelectedCustomerName] = useState(params.customerName || "");
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(todayDisplay());
  const [billAmount, setBillAmount] = useState("");
  const [dueDays, setDueDays] = useState("30");

  const invoiceIso = ddmmyyToISO(invoiceDate);
  const dueDate = (() => {
    if (!invoiceIso) return "";
    const d = new Date(invoiceIso + "T00:00:00");
    d.setDate(d.getDate() + parseInt(dueDays || "30"));
    return d.toISOString().split("T")[0];
  })();

  const handleSave = async () => {
    if (!selectedCustomerId || !invoiceNumber.trim() || !billAmount || !invoiceDate) {
      Alert.alert("Validation", "Please fill all required fields");
      return;
    }
    if (!invoiceIso) {
      Alert.alert("Validation", "Enter invoice date in DD-MM-YY format");
      return;
    }
    try {
      await mutateAsync({ data: {
        customerId: parseInt(selectedCustomerId),
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceIso,
        billAmount: parseFloat(billAmount),
        dueDate,
      }});
      queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
      if (selectedCustomerId) queryClient.invalidateQueries({ queryKey: getGetCustomerInvoicesQueryKey(parseInt(selectedCustomerId)) });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to add invoice.");
    }
  };

  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Medical Store *</Text>
          <TouchableOpacity style={[styles.selector, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => setShowCustomerPicker(!showCustomerPicker)}>
            <Text style={[styles.selectorText, { color: selectedCustomerName ? colors.foreground : colors.mutedForeground }]}>{selectedCustomerName || "Select medical store"}</Text>
            <Feather name={showCustomerPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          {showCustomerPicker && (
            <View style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                {(customers ?? []).map(c => (
                  <TouchableOpacity key={c.id} style={[styles.pickerItem, { borderBottomColor: colors.border }]} onPress={() => { setSelectedCustomerId(String(c.id)); setSelectedCustomerName(c.name); setShowCustomerPicker(false); }}>
                    <Text style={[styles.pickerText, { color: colors.foreground }]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Invoice Number *</Text>
          <TextInput value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="e.g. INV-001" placeholderTextColor={colors.mutedForeground} style={inputStyle} />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Invoice Date *</Text>
          <TextInput value={invoiceDate} onChangeText={setInvoiceDate} placeholder="DD-MM-YY" placeholderTextColor={colors.mutedForeground} keyboardType="numbers-and-punctuation" style={inputStyle} />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Bill Amount (₹) *</Text>
          <TextInput value={billAmount} onChangeText={setBillAmount} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" style={inputStyle} />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Due in (days)</Text>
          <TextInput value={dueDays} onChangeText={setDueDays} placeholder="30" placeholderTextColor={colors.mutedForeground} keyboardType="numeric" style={inputStyle} />
          {dueDate && <Text style={[styles.dueText, { color: colors.mutedForeground }]}>Due date: {formatDateDDMMYY(dueDate)}</Text>}
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, isPending && { opacity: 0.7 }]} onPress={handleSave} disabled={isPending} activeOpacity={0.8}>
          {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Invoice</Text>}
        </TouchableOpacity>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 20, gap: 16 }, field: { gap: 6 }, label: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular" },
  selector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  selectorText: { fontSize: 14, fontFamily: "Inter_400Regular" }, picker: { borderWidth: 1, borderRadius: 10, marginTop: 4, overflow: "hidden" },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1 }, pickerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  dueText: { fontSize: 11, fontFamily: "Inter_400Regular" }, saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});