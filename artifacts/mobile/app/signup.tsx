import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN || "pharma-pay-tracker.onrender.com"}`;
export default function Signup() {
  const c = useColors(),
    { login } = useAuth();
  const [fullName, setFullName] = useState(""),
    [businessName, setBusinessName] = useState(""),
    [email, setEmail] = useState(""),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [loading, setLoading] = useState(false);
  const submit = async () => {
    if (
      !fullName.trim() ||
      !businessName.trim() ||
      !email.includes("@") ||
      username.trim().length < 4 ||
      password.length < 8
    ) {
      Alert.alert(
        "Check details",
        "Name, business, valid email, 4+ character username and 8+ character password are required.",
      );
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName.trim(),
            businessName: businessName.trim(),
            email: email.trim(),
            username: username.trim(),
            password,
          }),
        }),
        body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || "Account could not be created");
      await login(body.token, body.username);
    } catch (e: any) {
      Alert.alert("Signup failed", e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={[s.page, { backgroundColor: c.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[s.title, { color: c.foreground }]}>
          Start your free MedPay workspace
        </Text>
        <Text style={[s.sub, { color: c.mutedForeground }]}>
          Your stores, bills and payments remain separate from every other
          business.
        </Text>
        <View
          style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}
        >
          {[
            [
              "Your name",
              fullName,
              setFullName,
              "Akhlaque Ahmed",
              "words",
              false,
            ],
            [
              "Business name",
              businessName,
              setBusinessName,
              "Nizami Medicose",
              "words",
              false,
            ],
            ["Email", email, setEmail, "you@example.com", "none", false],
            ["Username", username, setUsername, "akhlaque0143", "none", false],
            [
              "Password",
              password,
              setPassword,
              "Minimum 8 characters",
              "none",
              true,
            ],
          ].map(
            ([label, value, setter, placeholder, capitalization, secure]) => (
              <View key={String(label)} style={s.field}>
                <Text style={[s.label, { color: c.foreground }]}>
                  {String(label)}
                </Text>
                <TextInput
                  value={value as string}
                  onChangeText={setter as (v: string) => void}
                  placeholder={String(placeholder)}
                  placeholderTextColor={c.mutedForeground}
                  autoCapitalize={capitalization as any}
                  secureTextEntry={Boolean(secure)}
                  keyboardType={label === "Email" ? "email-address" : "default"}
                  style={[
                    s.input,
                    {
                      color: c.foreground,
                      borderColor: c.border,
                      backgroundColor: c.background,
                    },
                  ]}
                />
              </View>
            ),
          )}
          <Text style={[s.beta, { color: c.mutedForeground }]}>
            Free Beta access: 180 days. Your data will not be deleted when paid
            plans launch.
          </Text>
          <TouchableOpacity
            onPress={submit}
            disabled={loading}
            style={[s.button, { backgroundColor: c.primary }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.buttonText}>Create free account</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 24, gap: 10 },
  title: { fontSize: 25, fontFamily: "Inter_700Bold", marginTop: 12 },
  sub: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "Inter_400Regular",
    marginBottom: 10,
  },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 15 },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
  },
  beta: { fontSize: 12, lineHeight: 18 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
