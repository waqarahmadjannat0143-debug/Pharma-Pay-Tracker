import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  useColorScheme,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { StatsCard } from "@/components/StatsCard";
import {
  useGetDashboardStats,
  useGetMonthlyCollections,
} from "@workspace/api-client-react";

function formatCurrency(amount: number) {
  if (amount >= 100000) return "₹" + (amount / 100000).toFixed(1) + "L";
  if (amount >= 1000) return "₹" + (amount / 1000).toFixed(1) + "K";
  return "₹" + amount.toFixed(0);
}

function formatLarge(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function BarChart({ data }: { data: { label: string; amount: number }[] }) {
  const colors = useColors();
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.amount), 1);
  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {data.map((item, i) => (
          <View key={i} style={styles.barGroup}>
            <Text style={[styles.barAmount, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.amount > 0 ? formatCurrency(item.amount) : ""}
            </Text>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: colors.primary,
                    height: `${Math.max((item.amount / max) * 100, item.amount > 0 ? 4 : 0)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
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

  const refreshing = statsLoading || monthlyLoading;

  const onRefresh = () => {
    refetchStats();
    refetchMonthly();
  };

  const headerTop = isWeb ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: headerTop + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>MedPay</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => logout()} style={[styles.logoutBtn, { borderColor: colors.border }]}>
          <Feather name="log-out" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (isWeb ? 34 : 90) }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {(stats?.overdueCount ?? 0) > 0 && (
          <TouchableOpacity
            style={[styles.alert, { backgroundColor: colors.overdue + "15", borderColor: colors.overdue + "40" }]}
            onPress={() => router.push("/report/overdue")}
          >
            <Feather name="alert-circle" size={16} color={colors.overdue} />
            <Text style={[styles.alertText, { color: colors.overdue }]}>
              {stats!.overdueCount} overdue invoice{stats!.overdueCount !== 1 ? "s" : ""} — tap to view
            </Text>
            <Feather name="chevron-right" size={14} color={colors.overdue} />
          </TouchableOpacity>
        )}

        {(stats?.dueIn3DaysCount ?? 0) > 0 && (
          <TouchableOpacity
            style={[styles.alert, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "40" }]}
            onPress={() => router.push("/report/overdue")}
          >
            <Feather name="clock" size={16} color={colors.warning} />
            <Text style={[styles.alertText, { color: colors.warning }]}>
              {stats!.dueIn3DaysCount} invoice{stats!.dueIn3DaysCount !== 1 ? "s" : ""} due in 3 days
            </Text>
            <Feather name="chevron-right" size={14} color={colors.warning} />
          </TouchableOpacity>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatsCard
              title="Total Outstanding"
              value={formatCurrency(stats?.totalOutstanding ?? 0)}
              subtitle={formatLarge(stats?.totalOutstanding ?? 0)}
              color={colors.overdue}
              icon={<Feather name="alert-circle" size={14} color={colors.overdue} />}
            />
            <StatsCard
              title="Total Paid"
              value={formatCurrency(stats?.totalPaid ?? 0)}
              color={colors.paid}
              icon={<Feather name="check-circle" size={14} color={colors.paid} />}
            />
          </View>
          <View style={styles.statsRow}>
            <StatsCard
              title="Today's Collection"
              value={formatCurrency(stats?.todayCollection ?? 0)}
              color={colors.primary}
              icon={<Feather name="sun" size={14} color={colors.primary} />}
            />
            <StatsCard
              title="This Month"
              value={formatCurrency(stats?.thisMonthCollection ?? 0)}
              color={colors.primary}
              icon={<Feather name="calendar" size={14} color={colors.primary} />}
            />
          </View>
          <View style={styles.statsRow}>
            <StatsCard
              title="Total Stores"
              value={String(stats?.totalCustomers ?? 0)}
              icon={<Feather name="users" size={14} color={colors.primary} />}
            />
            <StatsCard
              title="Overdue Invoices"
              value={String(stats?.overdueCount ?? 0)}
              color={stats?.overdueCount ? colors.overdue : colors.paid}
              icon={<Feather name="alert-triangle" size={14} color={stats?.overdueCount ? colors.overdue : colors.paid} />}
            />
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={[styles.chartHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Monthly Collections</Text>
          </View>
          {monthly && monthly.length > 0 ? (
            <BarChart data={monthly.slice(-6)} />
          ) : (
            <Text style={[styles.noData, { color: colors.mutedForeground }]}>No collection data yet</Text>
          )}
        </View>

        <Text style={[styles.quickLabel, { color: colors.mutedForeground }]}>Quick Actions</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/invoice/add")}
            activeOpacity={0.8}
          >
            <Feather name="file-plus" size={20} color="#fff" />
            <Text style={styles.quickBtnText}>Add Invoice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.paid }]}
            onPress={() => router.push("/payment/add")}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={20} color="#fff" />
            <Text style={styles.quickBtnText}>Record Payment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { gap: 2 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  logoutBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 },
  content: { gap: 12, paddingTop: 12 },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  alertText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  statsGrid: { paddingHorizontal: 16, gap: 8 },
  statsRow: { flexDirection: "row", gap: 8 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  chartCard: { marginHorizontal: 16, borderRadius: 12, overflow: "hidden" },
  chartHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  noData: { padding: 24, textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
  chartContainer: { padding: 16, height: 160 },
  chartBars: { flexDirection: "row", alignItems: "flex-end", gap: 4, flex: 1 },
  barGroup: { flex: 1, alignItems: "center", gap: 4, height: "100%" },
  barAmount: { fontSize: 7, fontFamily: "Inter_500Medium", textAlign: "center" },
  barTrack: { flex: 1, width: "100%", borderRadius: 4, justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 4 },
  barLabel: { fontSize: 9, fontFamily: "Inter_500Medium" },
  quickLabel: { paddingHorizontal: 16, fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  quickRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10 },
  quickBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  quickBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
