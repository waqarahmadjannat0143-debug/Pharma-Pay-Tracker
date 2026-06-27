import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "home" as const, path: "/(tabs)" },
  { label: "Stores", icon: "users" as const, path: "/(tabs)/customers" },
  { label: "Invoices", icon: "file-text" as const, path: "/(tabs)/invoices" },
  { label: "Payments", icon: "credit-card" as const, path: "/(tabs)/payments" },
  { label: "Reports", icon: "bar-chart-2" as const, path: "/(tabs)/reports" },
];

export function Sidebar() {
  const colors = useColors();
  const pathname = usePathname();
  const router = useRouter();
  const { username, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === "/(tabs)") return pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/index";
    return pathname.startsWith(path.replace("/(tabs)", ""));
  };

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
      {/* Brand */}
      <LinearGradient
        colors={["#1565C0", "#1976D2"]}
        style={styles.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.brandIcon}>
          <Feather name="activity" size={20} color="#fff" />
        </View>
        <View>
          <Text style={styles.brandName}>MedPay</Text>
          <Text style={styles.brandSub}>Payment Manager</Text>
        </View>
      </LinearGradient>

      {/* Navigation */}
      <View style={styles.nav}>
        <Text style={[styles.navSection, { color: colors.mutedForeground }]}>NAVIGATION</Text>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <TouchableOpacity
              key={item.path}
              style={[
                styles.navItem,
                active && { backgroundColor: colors.primary + "12" },
              ]}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.navIcon, active && { backgroundColor: colors.primary + "20" }]}>
                <Feather name={item.icon} size={17} color={active ? colors.primary : colors.mutedForeground} />
              </View>
              <Text style={[styles.navLabel, { color: active ? colors.primary : colors.foreground }]}
                numberOfLines={1}>
                {item.label}
              </Text>
              {active && <View style={[styles.activePill, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickSection}>
        <Text style={[styles.navSection, { color: colors.mutedForeground }]}>QUICK ACTIONS</Text>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/invoice/add")}
          activeOpacity={0.85}
        >
          <Feather name="file-plus" size={14} color="#fff" />
          <Text style={styles.quickBtnText}>New Invoice</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: colors.paid }]}
          onPress={() => router.push("/payment/add")}
          activeOpacity={0.85}
        >
          <Feather name="credit-card" size={14} color="#fff" />
          <Text style={styles.quickBtnText}>Record Payment</Text>
        </TouchableOpacity>
      </View>

      {/* User / Logout */}
      <View style={[styles.userSection, { borderTopColor: colors.border }]}>
        <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.userAvatarText}>{(username ?? "A")[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>{username ?? "Admin"}</Text>
          <Text style={[styles.userRole, { color: colors.mutedForeground }]}>Administrator</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="log-out" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    height: "100%",
    borderRightWidth: 1,
    flexDirection: "column",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 20,
    paddingVertical: 18,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  brandSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  nav: { flex: 1, padding: 12, gap: 2 },
  navSection: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1, paddingHorizontal: 8, paddingVertical: 8 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    position: "relative",
  },
  navIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  navLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  activePill: { width: 4, height: 16, borderRadius: 2 },
  quickSection: { paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
  },
  quickBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
  },
  userAvatar: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  userAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  userName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  userRole: { fontSize: 10, fontFamily: "Inter_400Regular" },
  logoutBtn: { padding: 4 },
});
