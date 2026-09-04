import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
export default function Privacy() {
  const c = useColors();
  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={s.page}
    >
      <Text style={[s.title, { color: c.foreground }]}>
        MedPay Privacy Policy
      </Text>
      <Text style={[s.date, { color: c.mutedForeground }]}>
        Effective: 4 September 2026
      </Text>
      <Section
        title="What MedPay stores"
        text="MedPay stores account details, business/store names, invoice details, payment records, notes, receipt numbers and backups that you choose to create. This data is used only to provide the payment-management features you request."
      />
      <Section
        title="How data is used"
        text="Your data is used for login, workspace isolation, calculations, dashboards, reports, monthly registers, backup and restore. MedPay does not sell your data or use it for advertising."
      />
      <Section
        title="Storage and security"
        text="App data is sent over HTTPS and stored in the MedPay cloud database. Passwords are stored as secure hashes. Each business workspace is isolated from other workspaces by authenticated ownership checks."
      />
      <Section
        title="Sharing"
        text="MedPay does not share business records with third parties except infrastructure providers required to operate the app, or when legally required. Exported backup files are shared only when you choose a destination on your device."
      />
      <Section
        title="Retention and deletion"
        text="Records remain available while your account is active. You can permanently delete your account and workspace from Account & Plan → Delete account and all data. Deletion removes stores, invoices, payments and allocations and cannot be undone."
      />
      <Section
        title="Your responsibility"
        text="Do not enter unnecessary patient medical information. MedPay is a business ledger and payment-management tool, not a clinical record system or banking service."
      />
      <Section
        title="Policy updates"
        text="Material changes will be reflected on this page with a new effective date."
      />
      <Section
        title="Contact"
        text="For privacy questions or account-deletion help, email drforex83@gmail.com."
      />
    </ScrollView>
  );
}
function Section({ title, text }: { title: string; text: string }) {
  const c = useColors();
  return (
    <View style={s.section}>
      <Text style={[s.heading, { color: c.foreground }]}>{title}</Text>
      <Text style={[s.body, { color: c.mutedForeground }]}>{text}</Text>
    </View>
  );
}
const s = StyleSheet.create({
  page: { padding: 22, maxWidth: 800, width: "100%", alignSelf: "center" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  date: { fontSize: 13, marginTop: 4, marginBottom: 18 },
  section: { marginBottom: 18, gap: 5 },
  heading: { fontSize: 16, fontFamily: "Inter_700Bold" },
  body: { fontSize: 14, lineHeight: 22, fontFamily: "Inter_400Regular" },
});
