import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useCreateCustomer, getGetCustomersQueryKey } from "@workspace/api-client-react";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

function Field({ label, value, onChangeText, placeholder, keyboardType = "default", required = false, multiline = false }: any) {
  const colors = useColors();
  return (
    <View style={fieldStyles.wrap}>
      <Text style={[fieldStyles.label, { color: colors.mutedForeground }]}>{label}{required && " *"}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        style={[fieldStyles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }, multiline && fieldStyles.multiline]}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular" },
  multiline: { height: 80, textAlignVertical: "top" },
});

export default function AddCustomerScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useCreateCustomer();

  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [dueDays, setDueDays] = useState("30");

  const handleSave = async () => {
    if (!name.trim() || !ownerName.trim() || !mobile.trim() || !address.trim()) {
      Alert.alert("Validation", "Please fill all required fields");
      return;
    }
    try {
      await mutateAsync({ data: {
        name: name.trim(),
        ownerName: ownerName.trim(),
        mobile: mobile.trim(),
        gstNumber: gstNumber.trim() || undefined,
        address: address.trim(),
        creditLimit: parseFloat(creditLimit) || 0,
        dueDays: parseInt(dueDays) || 30,
      }});
      queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
      router.back();
    } catch {
      Alert.alert("Error", "Failed to add store. Please try again.");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Store Name" value={name} onChangeText={setName} placeholder="e.g. City Medical Store" required />
        <Field label="Owner Name" value={ownerName} onChangeText={setOwnerName} placeholder="e.g. Rahul Sharma" required />
        <Field label="Mobile Number" value={mobile} onChangeText={setMobile} placeholder="10-digit mobile" keyboardType="phone-pad" required />
        <Field label="GST Number (Optional)" value={gstNumber} onChangeText={setGstNumber} placeholder="e.g. 29ABCDE1234F1Z5" />
        <Field label="Address" value={address} onChangeText={setAddress} placeholder="Full address" required multiline />
        <Field label="Credit Limit (₹)" value={creditLimit} onChangeText={setCreditLimit} placeholder="e.g. 100000" keyboardType="numeric" />
        <Field label="Due Days" value={dueDays} onChangeText={setDueDays} placeholder="e.g. 30" keyboardType="numeric" />

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }, isPending && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={isPending}
          activeOpacity={0.8}
        >
          {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Store</Text>}
        </TouchableOpacity>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 16 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
