import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
export default function DeleteAccountInfo() {
  const c = useColors();
  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={s.page}
    >
      <Text style={[s.title, { color: c.foreground }]}>
        Delete your MedPay account
      </Text>
      <Text style={[s.body, { color: c.mutedForeground }]}>
        To permanently delete your MedPay workspace and its data:
      </Text>
      {[
        "Open MedPay and sign in.",
        "Tap your profile/name on the Dashboard.",
        "Open Account & Plan.",
        "Enter your current password.",
        "Tap Delete account and all data, then confirm.",
      ].map((x, i) => (
        <View key={x} style={s.row}>
          <Text style={[s.num, { backgroundColor: c.primary, color: "#fff" }]}>
            {i + 1}
          </Text>
          <Text style={[s.step, { color: c.foreground }]}>{x}</Text>
        </View>
      ))}
      <Text style={[s.warning, { color: c.destructive }]}>
        Deletion is permanent and removes stores, invoices, payments,
        allocations and workspace account details. Export a backup first if you
        need a copy.
      </Text>
      <Text style={[s.body, { color: c.mutedForeground }]}>
        If you cannot sign in, request deletion from drforex83@gmail.com using
        the email registered with your MedPay account. Identity verification is
        required before deletion.
      </Text>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: {
    padding: 22,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
    gap: 15,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 4 },
  body: { fontSize: 14, lineHeight: 21 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  num: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: "center",
    lineHeight: 28,
    fontFamily: "Inter_700Bold",
  },
  step: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  warning: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
});
