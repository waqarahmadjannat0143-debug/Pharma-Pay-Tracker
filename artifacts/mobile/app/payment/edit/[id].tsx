import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { getToken } from "@/lib/apiToken";
import { getGetPaymentsQueryKey, getGetDashboardStatsQueryKey, getGetInvoicesQueryKey, getGetCustomersQueryKey } from "@workspace/api-client-react";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const MODES = [
  { key: "cash", label: "Cash", icon: "dollar-sign" as const },
  { key: "upi", label: "UPI", icon: "smartphone" as const },
  { key: "bank_transfer", label: "Bank Transfer", icon: "briefcase" as const },
  { key: "cheque", label: "Cheque", icon: "file-text" as const },
];

function displayDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}-${m}-${y.slice(-2)}` : iso;
}
function toIsoDate(v: string) {
  const m = v.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{2}|\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]), month = Number(m[2]);
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function EditPaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("cash");
  const [notes, setNotes] = useState("");
  const [bills, setBills] = useState<string[]>([]);
  const domain = process.env.EXPO_PUBLIC_DOMAIN || "pharma-pay-tracker.onrender.com";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`https://${domain}/api/payments/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Failed to load payment");
        setCustomerName(body.customerName || "");
        setDate(displayDate(body.paymentDate));
        setAmount(String(body.amount));
        setMode(body.paymentMode || "cash");
        setNotes(body.notes || "");
        setBills((body.allocations || []).map((a: any) => `#${a.invoiceNumber}`));
      } catch (e: any) { Alert.alert("Error", e.message || "Failed to load payment", [{ text: "OK", onPress: () => router.back() }]); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const save = async () => {
    const isoDate = toIsoDate(date);
    const numericAmount = Number(amount);
    if (!isoDate) { Alert.alert("Validation", "Date DD-MM-YY format me dalo"); return; }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) { Alert.alert("Validation", "Valid amount dalo"); return; }
    setSaving(true);
    try {
      const res = await fetch(`https://${domain}/api/payments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ paymentDate: isoDate, amount: numericAmount, paymentMode: mode, notes: notes.trim() || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to edit payment");
      queryClient.invalidateQueries({ queryKey: getGetPaymentsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetInvoicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/date-wise-collection"] });
      Alert.alert("Updated", "Payment successfully update ho gaya.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert("Error", e.message || "Failed to edit payment"); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={[styles.loader, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  const inputStyle = [styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content}>
        <View style={[styles.info, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.store, { color: colors.foreground }]}>{customerName}</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>Linked bills: {bills.join(", ") || "—"}</Text>
          <Text style={[styles.warning, { color: colors.warning }]}>Amount edit karne par payment inhi linked bills me dobara adjust hoga.</Text>
        </View>

        <View style={styles.field}><Text style={[styles.label, { color: colors.mutedForeground }]}>Payment Date</Text><TextInput value={date} onChangeText={setDate} placeholder="DD-MM-YY" placeholderTextColor={colors.mutedForeground} style={inputStyle} keyboardType="numbers-and-punctuation" /></View>
        <View style={styles.field}><Text style={[styles.label, { color: colors.mutedForeground }]}>Amount (₹)</Text><TextInput value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.mutedForeground} style={inputStyle} keyboardType="numeric" /></View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Payment Mode</Text>
          <View style={styles.modes}>{MODES.map(m => <TouchableOpacity key={m.key} onPress={() => setMode(m.key)} style={[styles.modeBtn, { borderColor: mode === m.key ? colors.primary : colors.border, backgroundColor: mode === m.key ? colors.primary + "15" : colors.card }]}><Feather name={m.icon} size={16} color={mode === m.key ? colors.primary : colors.mutedForeground} /><Text style={{ color: mode === m.key ? colors.primary : colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12 }}>{m.label}</Text></TouchableOpacity>)}</View>
        </View>

        <View style={styles.field}><Text style={[styles.label, { color: colors.mutedForeground }]}>Notes</Text><TextInput value={notes} onChangeText={setNotes} multiline style={[inputStyle, { height: 80, textAlignVertical: "top" }]} /></View>

        <TouchableOpacity style={[styles.save, { backgroundColor: colors.primary }, saving && { opacity: .6 }]} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}</TouchableOpacity>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, loader: { flex: 1, alignItems: "center", justifyContent: "center" }, content: { padding: 18, gap: 16 },
  info: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 }, store: { fontSize: 16, fontFamily: "Inter_700Bold" }, sub: { fontSize: 11, fontFamily: "Inter_400Regular" }, warning: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 4 },
  field: { gap: 6 }, label: { fontSize: 12, fontFamily: "Inter_500Medium" }, input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  modes: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, modeBtn: { minWidth: "45%", flex: 1, flexDirection: "row", gap: 7, alignItems: "center", padding: 11, borderRadius: 10, borderWidth: 1 },
  save: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 }, saveText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
});
