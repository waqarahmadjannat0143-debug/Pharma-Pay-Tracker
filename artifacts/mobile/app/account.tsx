import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { medpayApi } from "@/lib/medpayApi";
import { useAuth } from "@/contexts/AuthContext";
type Account = {
  username: string;
  fullName?: string;
  email?: string;
  businessName?: string;
  role: string;
  plan: string;
  betaEndsAt?: string;
  legacy?: boolean;
};
export default function AccountScreen() {
  const c = useColors(),
    { login, logout } = useAuth(),
    [a, setA] = useState<Account | null>(null),
    [error, setError] = useState(""),
    [currentPassword, setCurrent] = useState(""),
    [newPassword, setNext] = useState(""),
    [fullName, setFullName] = useState(""),
    [businessName, setBusinessName] = useState(""),
    [email, setEmail] = useState(""),
    [username, setUsername] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    medpayApi<Account>("/api/account/me")
      .then(setA)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!a?.legacy) return;
    setBusinessName(a.businessName || "");
    setUsername(a.username === "admin" ? "" : a.username);
  }, [a]);
  const claimLegacy = async () => {
    if (
      fullName.trim().length < 2 ||
      businessName.trim().length < 2 ||
      username.trim().length < 4 ||
      !/^\S+@\S+\.\S+$/.test(email.trim()) ||
      newPassword.length < 8 ||
      !currentPassword
    ) {
      Alert.alert(
        "Complete all fields",
        "Enter your name, business, valid email, 4+ character username, current admin password and a new 8+ character password.",
      );
      return;
    }
    setBusy(true);
    try {
      const result = await medpayApi<{ token: string; username: string }>(
        "/api/account/claim-legacy",
        {
          method: "POST",
          body: JSON.stringify({
            fullName: fullName.trim(),
            businessName: businessName.trim(),
            email: email.trim(),
            username: username.trim(),
            currentPassword,
            password: newPassword,
          }),
        },
      );
      await login(result.token, result.username);
      setCurrent("");
      setNext("");
      setA((previous) =>
        previous
          ? {
              ...previous,
              legacy: false,
              fullName: fullName.trim(),
              businessName: businessName.trim(),
              email: email.trim(),
              username: result.username,
            }
          : previous,
      );
      Alert.alert(
        "Account secured",
        "Your existing stores, invoices and payments remain in the same workspace. Use the new username and password from now on.",
      );
    } catch (e: any) {
      Alert.alert("Could not secure account", e.message);
    } finally {
      setBusy(false);
    }
  };
  const change = async () => {
    if (newPassword.length < 8) {
      Alert.alert("Invalid password", "Use at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await medpayApi("/api/account/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrent("");
      setNext("");
      Alert.alert("Done", "Password changed successfully.");
    } catch (e: any) {
      Alert.alert("Could not change password", e.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = () => {
    if (!currentPassword) {
      Alert.alert("Password required", "Enter your current password first.");
      return;
    }
    Alert.alert(
      "Delete MedPay account?",
      "This permanently deletes this workspace, stores, invoices, payments and backups. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete permanently",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await medpayApi("/api/account", {
                method: "DELETE",
                body: JSON.stringify({ password: currentPassword }),
              });
              await logout();
            } catch (e: any) {
              Alert.alert("Deletion failed", e.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };
  if (!a && !error)
    return (
      <View style={[s.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={s.page}
    >
      <View
        style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}
      >
        <Text style={[s.title, { color: c.foreground }]}>
          {a?.businessName || "MedPay Account"}
        </Text>
        <Text style={[s.line, { color: c.mutedForeground }]}>
          {a?.fullName || a?.username}
        </Text>
        {a?.email ? (
          <Text style={[s.line, { color: c.mutedForeground }]}>{a.email}</Text>
        ) : null}
        <View style={[s.plan, { backgroundColor: c.primary + "14" }]}>
          <Text style={[s.planTitle, { color: c.primary }]}>
            {a?.plan === "free_beta" ? "Free Beta" : "MedPay Plan"}
          </Text>
          <Text style={[s.line, { color: c.mutedForeground }]}>
            {a?.betaEndsAt
              ? `Beta access until ${new Date(a.betaEndsAt).toLocaleDateString("en-IN")}`
              : "Legacy owner workspace"}
          </Text>
        </View>
      </View>
      {error ? <Text style={{ color: c.destructive }}>{error}</Text> : null}
      {a?.legacy ? (
        <View
          style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}
        >
          <Text style={[s.heading, { color: c.foreground }]}>
            Legacy owner account
          </Text>
          <Text style={[s.line, { color: c.mutedForeground }]}>
            Create your personal owner login for this same workspace. Your
            existing stores, invoices and payments will stay unchanged.
          </Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={c.mutedForeground}
            style={[s.input, { color: c.foreground, borderColor: c.border }]}
          />
          <TextInput
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Business name"
            placeholderTextColor={c.mutedForeground}
            style={[s.input, { color: c.foreground, borderColor: c.border }]}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email address"
            placeholderTextColor={c.mutedForeground}
            style={[s.input, { color: c.foreground, borderColor: c.border }]}
          />
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="New username"
            placeholderTextColor={c.mutedForeground}
            style={[s.input, { color: c.foreground, borderColor: c.border }]}
          />
          <TextInput
            value={currentPassword}
            onChangeText={setCurrent}
            secureTextEntry
            placeholder="Current admin password"
            placeholderTextColor={c.mutedForeground}
            style={[s.input, { color: c.foreground, borderColor: c.border }]}
          />
          <TextInput
            value={newPassword}
            onChangeText={setNext}
            secureTextEntry
            placeholder="New password (8+ characters)"
            placeholderTextColor={c.mutedForeground}
            style={[s.input, { color: c.foreground, borderColor: c.border }]}
          />
          <TouchableOpacity
            disabled={busy}
            onPress={claimLegacy}
            style={[s.button, { backgroundColor: c.primary }]}
          >
            <Text style={s.buttonText}>
              {busy ? "Securing..." : "Secure existing workspace"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}
        >
          <Text style={[s.heading, { color: c.foreground }]}>Security</Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrent}
            secureTextEntry
            placeholder="Current password"
            placeholderTextColor={c.mutedForeground}
            style={[s.input, { color: c.foreground, borderColor: c.border }]}
          />
          <TextInput
            value={newPassword}
            onChangeText={setNext}
            secureTextEntry
            placeholder="New password (8+ characters)"
            placeholderTextColor={c.mutedForeground}
            style={[s.input, { color: c.foreground, borderColor: c.border }]}
          />
          <TouchableOpacity
            disabled={busy}
            onPress={change}
            style={[s.button, { backgroundColor: c.primary }]}
          >
            <Text style={s.buttonText}>Change password</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={busy}
            onPress={remove}
            style={[s.danger, { borderColor: c.destructive }]}
          >
            <Text style={[s.dangerText, { color: c.destructive }]}>
              Delete account and all data
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  page: { padding: 18, gap: 14 },
  card: { padding: 18, borderRadius: 16, borderWidth: 1, gap: 10 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  heading: { fontSize: 17, fontFamily: "Inter_700Bold" },
  line: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  plan: { padding: 13, borderRadius: 12, marginTop: 4 },
  planTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  button: { padding: 14, borderRadius: 11, alignItems: "center" },
  buttonText: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  danger: {
    padding: 13,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 5,
  },
  dangerText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
