import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGetDashboardStats,
  useGetMonthlyCollections,
} from "@workspace/api-client-react";

const { width } = Dimensions.get("window");

function formatCurrency(amount: number) {
  if (amount >= 10000000) return "₹" + (amount / 10000000).toFixed(2) + "Cr";
  if (amount >= 100000) return "₹" + (amount / 100000).toFixed(1) + "L";
  if (amount >= 1000) return "₹" + (amount / 1000).toFixed(1) + "K";
  return "₹" + amount.toFixed(0);
}

function formatFull(amount: number) {
  return "₹" + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function BarChart({ data }: { data: { label: string; amount: number }[] }) {
  const colors = useColors();
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.amount), 1);
  return (
    <View style={chartStyles.wrap}>
      {data.map((item, i) => {
        const pct = Math.max((item.amount / max) * 100, item.amount > 0 ? 6 : 0);
        const isLast = i === data.length - 1;
        return (
          <View key={i} style={chartStyles.col}>
            {item.amount > 0 && (
              <Text style={[chartStyles.val, { color: colors.mutedForeground }]} numberOfLines={1}>
                {formatCurrency(item.amount)}
              </Text>
            )}
            <View style={[chartStyles.track, { backgroundColor: colors.border }]}>
              <View
                style={[
                  chartStyles.fill,
                  {
                    height: `${pct}%`,
                    backgroundColor: isLast ? colors.primary : colors.primary + "60",
                  },
                ]}
              />
            </View>
            <Text style={[chartStyles.lbl, { color: isLast ? colors.foreground : colors.mutedForeground }]}
              numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const chartStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-end", height: 130, gap: 6, paddingHorizontal: 16, paddingBottom: 16 },
  col: { flex: 1, alignItems: "center", height: "100%", gap: 4 },
  val: { fontSize: 7, fontFamily: "Inter_500Medium", textAlign: "center" },
  track: { flex: 1, width: "80%", borderRadius: 6, justifyContent: "flex-end", overflow: "hidden" },
  fill: { width: "100%", borderRadius: 6 },
  lbl: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
});

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  onPress?: () => void;
}

function StatTile({ label, value, sub, icon, accent, onPress }: StatTileProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
    >
      <View style={[styles.tileIcon, { backgroundColor: accent + "18" }]}>
        <Feather name={icon} size={18} color={accent} />
      </View>
      <Text style={[styles.tileValue, { color: colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.tileLabel, { color: colors.mutedForeground }]} numberOfLines={2}>{label}</Text>
      {sub && <Text style={[styles.tileSub, { color: accent }]} numberOfLines={1}>{sub}</Text>}
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { username, logout } = useAuth();
  const isWeb = Platform.OS === "web";

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetDashboardStats();
  const { data: monthly, isLoading: monthlyLoading, refetch: refetchMonthly } = useGetMonthlyCollections();

  const onRefresh = () => { refetchStats(); refetchMonthly(); };
  const headerTop = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="#fff" />}
        contentContainerStyle={{ paddingBottom: insets.bottom + (isWeb ? 34 : 90) }}
      >
        {/* ── Hero ── */}
        <LinearGradient
          colors={["#1565C0", "#1976D2", "#2196F3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: headerTop + 16 }]}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.heroUser}>{username ?? "Admin"}</Text>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Feather name="log-out" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroCardLabel}>Total Outstanding</Text>
            <Text style={styles.heroCardAmount}>{formatFull(stats?.totalOutstanding ?? 0)}</Text>
            <View style={styles.heroCardRow}>
              <View style={styles.heroChip}>
                <Feather name="users" size={11} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroChipText}>{stats?.totalCustomers ?? 0} Stores</Text>
              </View>
              <View style={styles.heroChip}>
                <Feather name="alert-triangle" size={11} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroChipText}>{stats?.overdueCount ?? 0} Overdue</Text>
              </View>
              <View style={styles.heroChip}>
                <Feather name="calendar" size={11} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroChipText}>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ── Alerts ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 8 }}>
          {(stats?.overdueCount ?? 0) > 0 && (
            <TouchableOpacity
              style={[styles.alertBanner, { backgroundColor: colors.overdue + "12", borderColor: colors.overdue + "35" }]}
              onPress={() => router.push("/report/overdue")}
              activeOpacity={0.7}
            >
              <View style={[styles.alertDot, { backgroundColor: colors.overdue }]} />
              <Text style={[styles.alertText, { color: colors.overdue }]}>
                {stats!.overdueCount} overdue invoice{stats!.overdueCount !== 1 ? "s" : ""} pending
              </Text>
              <Feather name="chevron-right" size={14} color={colors.overdue} />
            </TouchableOpacity>
          )}
          {(stats?.dueIn3DaysCount ?? 0) > 0 && (
            <TouchableOpacity
              style={[styles.alertBanner, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "35" }]}
              onPress={() => router.push("/report/overdue")}
              activeOpacity={0.7}
            >
              <View style={[styles.alertDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.alertText, { color: colors.warning }]}>
                {stats!.dueIn3DaysCount} invoice{stats!.dueIn3DaysCount !== 1 ? "s" : ""} due in 3 days
              </Text>
              <Feather name="chevron-right" size={14} color={colors.warning} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Stats Grid ── */}
        <View style={styles.tileGrid}>
          <View style={styles.tileRow}>
            <StatTile
              label="Total Paid"
              value={formatCurrency(stats?.totalPaid ?? 0)}
              sub={formatFull(stats?.totalPaid ?? 0)}
              icon="check-circle"
              accent={colors.paid}
            />
            <StatTile
              label="Today's Collection"
              value={formatCurrency(stats?.todayCollection ?? 0)}
              icon="sun"
              accent={colors.primary}
            />
          </View>
          <View style={styles.tileRow}>
            <StatTile
              label="This Month"
              value={formatCurrency(stats?.thisMonthCollection ?? 0)}
              icon="calendar"
              accent="#7C3AED"
            />
            <StatTile
              label="Overdue Invoices"
              value={String(stats?.overdueCount ?? 0)}
              icon="alert-triangle"
              accent={stats?.overdueCount ? colors.overdue : colors.paid}
              onPress={() => router.push("/report/overdue")}
            />
          </View>
        </View>

        {/* ── Chart ── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Monthly Collections</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Last 6 months</Text>
          </View>
          {monthly && monthly.length > 0
            ? <BarChart data={monthly.slice(-6)} />
            : <Text style={[styles.noData, { color: colors.mutedForeground }]}>No collection data yet</Text>
          }
        </View>

        {/* ── Quick Actions ── */}
        <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>QUICK ACTIONS</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/invoice/add")}
            activeOpacity={0.85}
          >
            <View style={styles.quickIcon}><Feather name="file-plus" size={22} color="#fff" /></View>
            <Text style={styles.quickTitle}>Add Invoice</Text>
            <Text style={styles.quickSub}>Create new bill</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: colors.paid }]}
            onPress={() => router.push("/payment/add")}
            activeOpacity={0.85}
          >
            <View style={styles.quickIcon}><Feather name="credit-card" size={22} color="#fff" /></View>
            <Text style={styles.quickTitle}>Record Payment</Text>
            <Text style={styles.quickSub}>Collect dues</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickCardSm, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/report/outstanding")}
            activeOpacity={0.8}
          >
            <Feather name="bar-chart-2" size={16} color={colors.primary} />
            <Text style={[styles.quickSmText, { color: colors.foreground }]}>Outstanding Report</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickCardSm, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/customer/add")}
            activeOpacity={0.8}
          >
            <Feather name="user-plus" size={16} color={colors.primary} />
            <Text style={[styles.quickSmText, { color: colors.foreground }]}>Add Store</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 28, gap: 18 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_400Regular" },
  heroUser: { fontSize: 20, color: "#fff", fontFamily: "Inter_700Bold", marginTop: 2 },
  logoutBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  heroCard: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 18, padding: 20, gap: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  heroCardLabel: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  heroCardAmount: { fontSize: 34, color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: -1 },
  heroCardRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  heroChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  heroChipText: { fontSize: 11, color: "rgba(255,255,255,0.9)", fontFamily: "Inter_500Medium" },
  alertBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  alertDot: { width: 7, height: 7, borderRadius: 4 },
  alertText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  tileGrid: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  tileRow: { flexDirection: "row", gap: 10 },
  tile: { flex: 1, borderRadius: 16, padding: 16, borderWidth: 1, gap: 8, minHeight: 110 },
  tileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tileValue: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  tileLabel: { fontSize: 11, fontFamily: "Inter_500Medium", lineHeight: 15 },
  tileSub: { fontSize: 10, fontFamily: "Inter_400Regular" },
  section: { marginHorizontal: 16, marginTop: 14, borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  noData: { padding: 24, textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
  quickLabel: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10, fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  quickRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginBottom: 10 },
  quickCard: { flex: 1, borderRadius: 16, padding: 18, gap: 4 },
  quickIcon: { marginBottom: 8 },
  quickTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  quickSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  quickCardSm: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 14, padding: 14, borderWidth: 1 },
  quickSmText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
});
