import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { useColors } from "@/hooks/useColors";
import { getToken } from "@/lib/apiToken";

const apiDomain = process.env.EXPO_PUBLIC_DOMAIN || "pharma-pay-tracker.onrender.com";
const API = `https://${apiDomain}`;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${day}-${month}-${year} ${time}`;
}

export default function BackupScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<{ fileName: string; createdAt: string; counts: any } | null>(null);

  const authHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  });

  const createBackup = async () => {
    setCreating(true);
    try {
      const response = await fetch(`${API}/api/backup/export`, { headers: authHeaders() });
      if (!response.ok) throw new Error("Backup request failed");
      const backup = await response.json();

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `MedPay-Backup-${stamp}.medpaybackup`;
      const uri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup, null, 2));

      setLastBackup({ fileName, createdAt: backup.createdAt, counts: backup.counts });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/json",
          dialogTitle: "Save or share MedPay backup",
          UTI: "public.json",
        });
      } else {
        Alert.alert("Backup Created", `Backup saved inside the app as ${fileName}`);
      }
    } catch (e) {
      Alert.alert("Backup Failed", "Backup file could not be created. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const pickAndRestore = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "application/octet-stream", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets?.[0]) return;

      const asset = picked.assets[0];
      const raw = await FileSystem.readAsStringAsync(asset.uri);
      const backup = JSON.parse(raw);

      if (backup?.app !== "MedPay" || backup?.version !== 1 || !backup?.data) {
        Alert.alert("Invalid Backup", "This is not a valid MedPay backup file.");
        return;
      }

      const counts = backup.counts ?? {};
      Alert.alert(
        "Restore Backup?",
        `This will replace current app data with this backup.\n\nStores: ${counts.customers ?? 0}\nInvoices: ${counts.invoices ?? 0}\nPayments: ${counts.payments ?? 0}\n\nBackup: ${formatDateTime(backup.createdAt)}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "destructive",
            onPress: async () => {
              setRestoring(true);
              try {
                const response = await fetch(`${API}/api/backup/restore`, {
                  method: "POST",
                  headers: authHeaders(),
                  body: JSON.stringify(backup),
                });
                const result = await response.json();
                if (!response.ok || !result.ok) throw new Error(result.error || "Restore failed");
                await queryClient.invalidateQueries();
                Alert.alert("Restore Complete", "Your MedPay data has been restored successfully.");
              } catch {
                Alert.alert("Restore Failed", "Data was not changed. Please check the backup file and try again.");
              } finally {
                setRestoring(false);
              }
            },
          },
        ]
      );
    } catch {
      Alert.alert("Restore Failed", "Could not read this backup file.");
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.safeCard, { backgroundColor: colors.paid + "12", borderColor: colors.paid + "35" }]}>
        <View style={[styles.safeIcon, { backgroundColor: colors.paid + "20" }]}>
          <Feather name="shield" size={24} color={colors.paid} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.safeTitle, { color: colors.foreground }]}>Your data, your backup</Text>
          <Text style={[styles.safeText, { color: colors.mutedForeground }]}>Create a full copy of stores, invoices, payments and bill allocations. Keep the file on your phone, Drive, email or WhatsApp.</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.rowTop}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="download-cloud" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Create Backup</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>Exports the complete MedPay database into one backup file.</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={createBackup} disabled={creating || restoring}>
          {creating ? <ActivityIndicator color="#fff" /> : <><Feather name="save" size={16} color="#fff" /><Text style={styles.primaryText}>Create & Share Backup</Text></>}
        </TouchableOpacity>
      </View>

      {lastBackup && (
        <View style={[styles.lastCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.lastLabel, { color: colors.mutedForeground }]}>LAST BACKUP THIS SESSION</Text>
          <Text style={[styles.lastName, { color: colors.foreground }]} numberOfLines={1}>{lastBackup.fileName}</Text>
          <Text style={[styles.lastMeta, { color: colors.mutedForeground }]}>{formatDateTime(lastBackup.createdAt)} · {lastBackup.counts?.customers ?? 0} stores · {lastBackup.counts?.invoices ?? 0} invoices · {lastBackup.counts?.payments ?? 0} payments</Text>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.rowTop}>
          <View style={[styles.iconWrap, { backgroundColor: "#7C3AED18" }]}>
            <Feather name="rotate-ccw" size={22} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Restore from Backup</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>Select a MedPay backup file. Restore replaces the current database only after confirmation.</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.restoreBtn, { borderColor: "#7C3AED" }]} onPress={pickAndRestore} disabled={creating || restoring}>
          {restoring ? <ActivityIndicator color="#7C3AED" /> : <><Feather name="upload" size={16} color="#7C3AED" /><Text style={styles.restoreText}>Select Backup File</Text></>}
        </TouchableOpacity>
      </View>

      <View style={[styles.warning, { backgroundColor: colors.warning + "10", borderColor: colors.warning + "35" }]}>
        <Feather name="alert-circle" size={17} color={colors.warning} />
        <Text style={[styles.warningText, { color: colors.mutedForeground }]}>Keep at least one recent backup outside the app (Google Drive, email, computer, etc.). If the phone/app is lost, an internal-only file may also be lost.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  safeCard: { flexDirection: "row", gap: 12, borderWidth: 1, borderRadius: 16, padding: 16 },
  safeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  safeTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  safeText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 16 },
  rowTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconWrap: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 3 },
  primaryBtn: { minHeight: 48, borderRadius: 12, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  restoreBtn: { minHeight: 48, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  restoreText: { color: "#7C3AED", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  lastCard: { borderWidth: 1, borderRadius: 14, padding: 14 },
  lastLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.7 },
  lastName: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 5 },
  lastMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3 },
  warning: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 14 },
  warningText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
