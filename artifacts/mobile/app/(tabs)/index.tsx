import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { getToken } from "@/lib/apiToken";
import { formatLocalISODate } from "@/lib/dateFormat";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN || "pharma-pay-tracker.onrender.com"}`;
function fmt(n: number) {
  return (
    "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })
  );
}
function short(n: number) {
  if (n >= 100000) return "₹" + (n / 100000).toFixed(1) + "L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K";
  return fmt(n);
}
const iso = formatLocalISODate;
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
type Period = "today" | "week" | "month" | "year";

export default function DashboardScreen() {
  const colors = useColors(),
    router = useRouter(),
    insets = useSafeAreaInsets();
  const { username, logout } = useAuth();
  const isWeb = Platform.OS === "web";
  const { width } = useWindowDimensions();
  const isDesktop = isWeb && width >= 1024;
  const [period, setPeriod] = useState<Period>("month");
  const range = useMemo(() => {
    const now = new Date(),
      today = iso(now);
    if (period === "today") return { fromDate: today, toDate: today };
    if (period === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { fromDate: iso(d), toDate: today };
    }
    if (period === "year")
      return { fromDate: `${today.slice(0, 4)}-01-01`, toDate: today };
    return { fromDate: `${today.slice(0, 7)}-01`, toDate: today };
  }, [period]);
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["dashboard-overview", range.fromDate, range.toDate],
    staleTime: 120000,
    gcTime: 600000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const token = getToken();
      const r = await fetch(
        `${API_BASE}/api/dashboard/overview?fromDate=${range.fromDate}&toDate=${range.toDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
        },
      );
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || "Dashboard load failed");
      return body;
    },
  });
  const stats = data?.stats,
    monthly = data?.monthly ?? [],
    periodRows = data?.periodRows ?? [];
  const periodCollection = periodRows.reduce(
      (s: number, x: any) => s + Number(x.amount || 0),
      0,
    ),
    periodPayments = periodRows.reduce(
      (s: number, x: any) => s + Number(x.count || 0),
      0,
    );
  const totalPaid = Number(stats?.totalPaid || 0),
    totalOutstanding = Number(stats?.totalOutstanding || 0),
    paymentBase = Math.max(totalPaid + totalOutstanding, 1),
    paidPercent = Math.round((totalPaid / paymentBase) * 100),
    duePercent = 100 - paidPercent;
  const goCollection = (p: string) =>
    router.push(`/report/collection?period=${p}` as any);
  const periods: { key: Period; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "7 Days" },
    { key: "month", label: "This Month" },
    { key: "year", label: "This Year" },
  ];
  if (isLoading && !data)
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.wakeTitle, { color: colors.foreground }]}>
          Server start ho raha hai
        </Text>
        <Text style={[styles.wakeText, { color: colors.mutedForeground }]}>
          Data load hone mein thoda waqt lag sakta hai.
        </Text>
      </View>
    );
  if (isError && !data)
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="wifi-off" size={36} color={colors.mutedForeground} />
        <Text style={[styles.wakeTitle, { color: colors.foreground }]}>
          Data load nahi hua
        </Text>
        <Text style={[styles.wakeText, { color: colors.mutedForeground }]}>
          Data safe hai. Server wake hone ke baad retry karein.
        </Text>
        <TouchableOpacity
          style={[styles.retry, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
          disabled={isFetching}
        >
          <Text style={styles.retryText}>
            {isFetching ? "Loading..." : "Retry"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  if (isDesktop) {
    const recentRows = periodRows.slice(0, 5);
    const maxMonthly = Math.max(
      ...monthly.slice(-6).map((m: any) => Number(m.amount || 0)),
      1,
    );
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} />
          }
          contentContainerStyle={styles.desktopShell}
        >
          <View style={styles.desktopHeader}>
            <View>
              <Text
                style={[
                  styles.desktopEyebrow,
                  { color: colors.mutedForeground },
                ]}
              >
                PAYMENT OVERVIEW
              </Text>
              <Text
                style={[styles.desktopPageTitle, { color: colors.foreground }]}
              >
                Good {greeting().replace("Good ", "").toLowerCase()},{" "}
                {username || "admin"}
              </Text>
            </View>
            <View style={styles.desktopHeaderActions}>
              <TouchableOpacity
                style={[
                  styles.headerActionBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => refetch()}
              >
                <Feather
                  name="refresh-cw"
                  size={16}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
              <View
                style={[
                  styles.desktopProfile,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.profileAvatar,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.profileAvatarText}>
                    {(username || "A")[0].toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text
                    style={[styles.profileName, { color: colors.foreground }]}
                  >
                    {username || "admin"}
                  </Text>
                  <Text
                    style={[
                      styles.profileRole,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Administrator
                  </Text>
                </View>
                <TouchableOpacity onPress={logout}>
                  <Feather
                    name="log-out"
                    size={16}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.desktopFilterRow}>
            <Text
              style={[
                styles.desktopSectionLabel,
                { color: colors.mutedForeground },
              ]}
            >
              OVERVIEW PERIOD
            </Text>
            <View style={styles.desktopPeriodGroup}>
              {periods.map((p) => {
                const active = p.key === period;
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => setPeriod(p.key)}
                    style={[
                      styles.desktopPeriodBtn,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.desktopPeriodText,
                        { color: active ? "#FFFFFF" : colors.mutedForeground },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.balanceRow}>
            <TouchableOpacity
              style={[
                styles.balanceCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.push("/report/outstanding")}
            >
              <View style={styles.balanceTop}>
                <View>
                  <Text
                    style={[
                      styles.balanceLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    TOTAL OUTSTANDING
                  </Text>
                  <Text
                    style={[styles.balanceValue, { color: colors.foreground }]}
                  >
                    {fmt(totalOutstanding)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.balanceIcon,
                    { backgroundColor: colors.overdue + "10" },
                  ]}
                >
                  <Feather
                    name="arrow-up-right"
                    size={22}
                    color={colors.overdue}
                  />
                </View>
              </View>
              <View style={styles.balanceMeta}>
                <Text
                  style={[styles.balanceMetaText, { color: colors.overdue }]}
                >
                  {stats?.overdueCount ?? 0} overdue invoices
                </Text>
                <Text style={[styles.balanceLink, { color: colors.primary }]}>
                  View report →
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.balanceCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => goCollection(period)}
            >
              <View style={styles.balanceTop}>
                <View>
                  <Text
                    style={[
                      styles.balanceLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    TOTAL COLLECTION
                  </Text>
                  <Text
                    style={[styles.balanceValue, { color: colors.foreground }]}
                  >
                    {fmt(periodCollection)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.balanceIcon,
                    { backgroundColor: colors.info + "12" },
                  ]}
                >
                  <Feather
                    name="arrow-down-left"
                    size={22}
                    color={colors.info}
                  />
                </View>
              </View>
              <View style={styles.balanceMeta}>
                <Text style={[styles.balanceMetaText, { color: colors.info }]}>
                  {periodPayments} payments in selected period
                </Text>
                <Text style={[styles.balanceLink, { color: colors.primary }]}>
                  View report →
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.desktopMainGrid}>
            <View style={styles.desktopMainColumn}>
              <View style={styles.desktopMidRow}>
                <View
                  style={[
                    styles.panel,
                    styles.schedulePanel,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.panelHeader}>
                    <View>
                      <Text
                        style={[
                          styles.panelTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        Recent Collections
                      </Text>
                      <Text
                        style={[
                          styles.panelSubtitle,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Selected period activity
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => goCollection(period)}>
                      <Text
                        style={[styles.panelLink, { color: colors.primary }]}
                      >
                        View all
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {recentRows.length ? (
                    recentRows.map((row: any, i: number) => (
                      <View
                        key={`${row.date}-${i}`}
                        style={[
                          styles.scheduleRow,
                          i < recentRows.length - 1 && {
                            borderBottomColor: colors.border,
                            borderBottomWidth: 1,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.scheduleDateIcon,
                            { backgroundColor: colors.primary + "10" },
                          ]}
                        >
                          <Feather
                            name="calendar"
                            size={15}
                            color={colors.primary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.scheduleDate,
                              { color: colors.foreground },
                            ]}
                          >
                            {new Date(
                              `${row.date}T00:00:00`,
                            ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </Text>
                          <Text
                            style={[
                              styles.scheduleCount,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {row.count} payment(s)
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.scheduleAmount,
                            { color: colors.foreground },
                          ]}
                        >
                          {fmt(row.amount)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.noActivity}>
                      <Feather name="inbox" size={26} color={colors.border} />
                      <Text
                        style={[
                          styles.panelSubtitle,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        No collection in this period
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={[
                    styles.panel,
                    styles.healthPanelDesktop,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.panelHeader}>
                    <View>
                      <Text
                        style={[
                          styles.panelTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        Payment Status
                      </Text>
                      <Text
                        style={[
                          styles.panelSubtitle,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Overall receivable health
                      </Text>
                    </View>
                  </View>
                  <View style={styles.donutArea}>
                    <View
                      style={[
                        styles.donutOuter,
                        { borderColor: colors.primary },
                      ]}
                    >
                      <View
                        style={[
                          styles.donutInner,
                          { backgroundColor: colors.card },
                        ]}
                      >
                        <Text
                          style={[
                            styles.donutPercent,
                            { color: colors.foreground },
                          ]}
                        >
                          {paidPercent}%
                        </Text>
                        <Text
                          style={[
                            styles.donutCaption,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          PAID
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.donutLegend}>
                    <View style={styles.legendRow}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: colors.paid },
                        ]}
                      />
                      <Text
                        style={[
                          styles.legendLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Paid
                      </Text>
                      <Text
                        style={[
                          styles.legendValue,
                          { color: colors.foreground },
                        ]}
                      >
                        {short(totalPaid)}
                      </Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: colors.overdue },
                        ]}
                      />
                      <Text
                        style={[
                          styles.legendLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Outstanding
                      </Text>
                      <Text
                        style={[
                          styles.legendValue,
                          { color: colors.foreground },
                        ]}
                      >
                        {short(totalOutstanding)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.panel,
                  styles.trendPanelDesktop,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.panelHeader}>
                  <View>
                    <Text
                      style={[styles.panelTitle, { color: colors.foreground }]}
                    >
                      Monthly Collection Trend
                    </Text>
                    <Text
                      style={[
                        styles.panelSubtitle,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Last six months performance
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => goCollection("year")}>
                    <Text style={[styles.panelLink, { color: colors.primary }]}>
                      Full report →
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.compactBars}>
                  {monthly.slice(-6).map((m: any) => (
                    <View
                      key={`${m.year}-${m.month}`}
                      style={styles.compactBarCol}
                    >
                      <Text
                        style={[
                          styles.compactBarValue,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {short(m.amount)}
                      </Text>
                      <LinearGradient
                        colors={[colors.primary, "#60A5FA"]}
                        style={[
                          styles.compactBar,
                          {
                            height: Math.max(
                              12,
                              (Number(m.amount || 0) / maxMonthly) * 115,
                            ),
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.compactBarLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.desktopRail}>
              <TouchableOpacity
                style={[
                  styles.railCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => router.push("/(tabs)/customers" as any)}
              >
                <View
                  style={[
                    styles.railIcon,
                    { backgroundColor: colors.primary + "10" },
                  ]}
                >
                  <Feather name="users" size={20} color={colors.primary} />
                </View>
                <Text
                  style={[styles.railLabel, { color: colors.mutedForeground }]}
                >
                  REGISTERED STORES
                </Text>
                <Text style={[styles.railValue, { color: colors.foreground }]}>
                  {stats?.totalCustomers ?? 0}
                </Text>
                <Text style={[styles.railLink, { color: colors.primary }]}>
                  Manage stores →
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.railCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => router.push("/report/overdue")}
              >
                <View
                  style={[
                    styles.railIcon,
                    { backgroundColor: colors.warning + "12" },
                  ]}
                >
                  <Feather name="clock" size={20} color={colors.warning} />
                </View>
                <Text
                  style={[styles.railLabel, { color: colors.mutedForeground }]}
                >
                  DUE IN 3 DAYS
                </Text>
                <Text style={[styles.railValue, { color: colors.foreground }]}>
                  {stats?.dueIn3DaysCount ?? 0}
                </Text>
                <Text style={[styles.railLink, { color: colors.warning }]}>
                  Review invoices →
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.railCard,
                  styles.registerRailCard,
                  { backgroundColor: "#0F172A", borderColor: "#0F172A" },
                ]}
                onPress={() => router.push("/register" as any)}
              >
                <View
                  style={[
                    styles.railIcon,
                    { backgroundColor: "rgba(255,255,255,.12)" },
                  ]}
                >
                  <Feather name="book-open" size={20} color="#FFFFFF" />
                </View>
                <Text style={[styles.railLabel, { color: "#94A3B8" }]}>
                  MONTHLY REGISTER
                </Text>
                <Text style={[styles.registerRailTitle, { color: "#FFFFFF" }]}>
                  Agency ledger
                </Text>
                <Text style={[styles.railLink, { color: "#60A5FA" }]}>
                  Open register →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (isWeb ? 30 : 90) },
        ]}
      >
        <View style={[styles.page, isDesktop && styles.pageDesktop]}>
          <LinearGradient
            colors={[colors.card, colors.card]}
            style={[
              styles.hero,
              {
                paddingTop: isDesktop ? 28 : isWeb ? 60 : insets.top + 18,
                borderColor: colors.border,
              },
              isDesktop && styles.heroDesktop,
            ]}
          >
            <View style={[styles.heroTop, isDesktop && styles.heroTopDesktop]}>
              <View>
                <Text
                  style={[styles.greeting, { color: colors.mutedForeground }]}
                >
                  {greeting()}
                </Text>
                <Text
                  style={[
                    styles.user,
                    { color: colors.foreground },
                    isDesktop && styles.userDesktop,
                  ]}
                >
                  {username || "admin"}
                </Text>
                <Text
                  style={[
                    styles.desktopWelcome,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {isDesktop ? "Here is your payment overview" : ""}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.logout, { backgroundColor: colors.muted }]}
                onPress={logout}
              >
                <Feather
                  name="log-out"
                  size={18}
                  color={colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[
                styles.outstanding,
                { backgroundColor: colors.card, borderColor: colors.border },
                isDesktop && styles.outstandingDesktop,
              ]}
              onPress={() => router.push("/report/outstanding")}
              activeOpacity={0.8}
            >
              <View style={styles.cardTitleRow}>
                <View style={styles.outHeading}>
                  <View
                    style={[
                      styles.outIcon,
                      { backgroundColor: colors.info + "18" },
                    ]}
                  >
                    <Feather
                      name="trending-down"
                      size={18}
                      color={colors.info}
                    />
                  </View>
                  <Text
                    style={[styles.outLabel, { color: colors.mutedForeground }]}
                  >
                    TOTAL OUTSTANDING
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.outValue,
                  { color: colors.foreground },
                  isDesktop && styles.outValueDesktop,
                ]}
              >
                {fmt(stats?.totalOutstanding ?? 0)}
              </Text>
              <View style={styles.badges}>
                <Text
                  style={[
                    styles.badge,
                    {
                      color: colors.primary,
                      backgroundColor: colors.primary + "12",
                    },
                  ]}
                >
                  {stats?.totalCustomers ?? 0} Stores
                </Text>
                <Text
                  style={[
                    styles.badge,
                    {
                      color: colors.overdue,
                      backgroundColor: colors.overdue + "10",
                    },
                  ]}
                >
                  {stats?.overdueCount ?? 0} Overdue
                </Text>
              </View>
            </TouchableOpacity>
          </LinearGradient>
          <View
            style={[styles.filterWrap, isDesktop && styles.filterWrapDesktop]}
          >
            <Text
              style={[styles.filterTitle, { color: colors.mutedForeground }]}
            >
              FILTER DASHBOARD
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {periods.map((p) => {
                const active = p.key === period;
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => setPeriod(p.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? colors.primary : colors.card,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? "#fff" : colors.mutedForeground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 12,
                      }}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
            <TouchableOpacity
              style={[
                styles.tile,
                isDesktop && styles.tileDesktop,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => goCollection(period)}
            >
              <View
                style={[styles.icon, { backgroundColor: colors.info + "18" }]}
              >
                <Feather name="check-circle" size={20} color={colors.info} />
              </View>
              <Text style={[styles.value, { color: colors.foreground }]}>
                {short(periodCollection)}
              </Text>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                {periods.find((p) => p.key === period)?.label} Collection
              </Text>
              <Text style={[styles.sub, { color: colors.info }]}>
                {periodPayments} payment(s) · View details
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tile,
                isDesktop && styles.tileDesktop,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => goCollection("today")}
            >
              <View
                style={[
                  styles.icon,
                  { backgroundColor: colors.primary + "12" },
                ]}
              >
                <Feather name="sun" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.value, { color: colors.foreground }]}>
                {short(stats?.todayCollection ?? 0)}
              </Text>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Today's Collection
              </Text>
              <Text style={[styles.sub, { color: colors.primary }]}>
                View day-wise details
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tile,
                isDesktop && styles.tileDesktop,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.push("/report/overdue")}
            >
              <View
                style={[
                  styles.icon,
                  { backgroundColor: colors.overdue + "10" },
                ]}
              >
                <Feather
                  name="alert-triangle"
                  size={20}
                  color={colors.overdue}
                />
              </View>
              <Text style={[styles.value, { color: colors.foreground }]}>
                {stats?.overdueCount ?? 0}
              </Text>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Overdue Invoices
              </Text>
              <Text style={[styles.sub, { color: colors.overdue }]}>
                View overdue invoices
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tile,
                isDesktop && styles.tileDesktop,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.push("/register" as any)}
            >
              <View
                style={[
                  styles.icon,
                  { backgroundColor: colors.primary + "12" },
                ]}
              >
                <Feather name="book-open" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.value, { color: colors.foreground }]}>
                Register
              </Text>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>
                Agency Monthly Ledger
              </Text>
              <Text style={[styles.sub, { color: colors.primary }]}>
                Month-wise details ›
              </Text>
            </TouchableOpacity>
          </View>
          <View
            style={[
              styles.healthCard,
              isDesktop && styles.healthCardDesktop,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.healthHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: colors.foreground }]}>
                  Payment Health
                </Text>
                <Text
                  style={[
                    styles.healthSubtitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Paid aur baki ka live comparison
                </Text>
              </View>
              <View
                style={[
                  styles.healthScore,
                  { backgroundColor: colors.primary + "18" },
                ]}
              >
                <Text
                  style={[styles.healthScoreText, { color: colors.primary }]}
                >
                  {paidPercent}% Paid
                </Text>
              </View>
            </View>
            <View style={styles.healthMetrics}>
              <View style={styles.healthMetric}>
                <View
                  style={[styles.healthDot, { backgroundColor: colors.paid }]}
                />
                <View>
                  <Text
                    style={[
                      styles.healthMetricLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    TOTAL PAID
                  </Text>
                  <Text
                    style={[styles.healthMetricValue, { color: colors.paid }]}
                  >
                    {short(totalPaid)}
                  </Text>
                </View>
              </View>
              <View style={styles.healthMetric}>
                <View
                  style={[
                    styles.healthDot,
                    { backgroundColor: colors.overdue },
                  ]}
                />
                <View>
                  <Text
                    style={[
                      styles.healthMetricLabel,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    OUTSTANDING
                  </Text>
                  <Text
                    style={[
                      styles.healthMetricValue,
                      { color: colors.overdue },
                    ]}
                  >
                    {short(totalOutstanding)}
                  </Text>
                </View>
              </View>
            </View>
            <View
              style={[
                styles.healthTrack,
                { backgroundColor: colors.overdue + "30" },
              ]}
            >
              <View
                style={[
                  styles.healthPaid,
                  {
                    backgroundColor: colors.paid,
                    width: `${paidPercent}%` as any,
                  },
                ]}
              />
            </View>
            <View style={styles.healthLegend}>
              <Text style={[styles.healthLegendText, { color: colors.paid }]}>
                {paidPercent}% received
              </Text>
              <Text
                style={[styles.healthLegendText, { color: colors.overdue }]}
              >
                {duePercent}% baki
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.chart,
              isDesktop && styles.chartDesktop,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => goCollection("year")}
            activeOpacity={0.85}
          >
            <View style={styles.chartHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: colors.foreground }]}>
                  6-Month Collection Trend
                </Text>
                <Text
                  style={[
                    styles.healthSubtitle,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Monthly payment performance
                </Text>
              </View>
              <Text style={[styles.chartSub, { color: colors.primary }]}>
                Details ›
              </Text>
            </View>
            <View style={[styles.bars, isDesktop && styles.barsDesktop]}>
              {monthly.slice(-6).map((m: any, i: number, arr: any[]) => {
                const max = Math.max(...arr.map((x) => x.amount), 1),
                  h = Math.max(8, (m.amount / max) * (isDesktop ? 145 : 90));
                return (
                  <View key={`${m.year}-${m.month}`} style={styles.barCol}>
                    <Text
                      style={[
                        styles.barVal,
                        isDesktop && styles.barValDesktop,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {m.amount ? short(m.amount) : ""}
                    </Text>
                    <LinearGradient
                      colors={[colors.primary, "#6EA8FF"]}
                      style={[styles.bar, { height: h }]}
                    />
                    <Text
                      style={[
                        styles.barLabel,
                        isDesktop && styles.barLabelDesktop,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
          {!isDesktop && (
            <>
              <Text
                style={[
                  styles.quickTitleLabel,
                  { color: colors.mutedForeground },
                ]}
              >
                QUICK ACTIONS
              </Text>
              <View style={styles.quickRow}>
                <TouchableOpacity
                  style={[styles.quick, { backgroundColor: colors.primary }]}
                  onPress={() => router.push("/invoice/add")}
                >
                  <Feather name="file-plus" size={20} color="#fff" />
                  <Text style={styles.quickText}>Add Invoice</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quick, { backgroundColor: colors.paid }]}
                  onPress={() => router.push("/payment/add")}
                >
                  <Feather name="credit-card" size={20} color="#fff" />
                  <Text style={styles.quickText}>Record Payment</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { alignItems: "center" },
  page: { width: "100%" },
  pageDesktop: { maxWidth: 1440, padding: 24, gap: 18 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  wakeTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 16 },
  wakeText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 7,
  },
  retry: {
    marginTop: 18,
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 20,
    borderBottomWidth: 1,
  },
  heroDesktop: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 28,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroTopDesktop: { flex: 1, alignItems: "flex-start" },
  greeting: {
    color: "rgba(255,255,255,.75)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  user: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginTop: 3,
  },
  userDesktop: { fontSize: 30, marginTop: 7 },
  desktopWelcome: {
    color: "rgba(255,255,255,.72)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
  logout: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  outstanding: {
    backgroundColor: "rgba(255,255,255,.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.22)",
    borderRadius: 18,
    padding: 20,
    gap: 10,
  },
  outstandingDesktop: { flex: 1.65, padding: 24, justifyContent: "center" },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  outHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  outIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  outLabel: {
    color: "rgba(255,255,255,.78)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  outValue: { color: "#fff", fontSize: 36, fontFamily: "Inter_700Bold" },
  outValueDesktop: { fontSize: 40 },
  badges: { flexDirection: "row", gap: 8 },
  badge: {
    color: "#fff",
    backgroundColor: "rgba(255,255,255,.14)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    fontSize: 11,
  },
  filterWrap: { paddingHorizontal: 16, paddingTop: 16, gap: 9 },
  filterWrapDesktop: { paddingHorizontal: 0, paddingTop: 0 },
  filterTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  grid: { padding: 16, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridDesktop: { padding: 0, gap: 14 },
  tile: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    gap: 8,
    minHeight: 150,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  tileDesktop: { width: "23%", minHeight: 172, padding: 20 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 24, fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sub: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: "auto" },
  healthCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  healthCardDesktop: { marginHorizontal: 0, padding: 24 },
  healthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  healthSubtitle: { fontSize: 10, marginTop: 3 },
  healthScore: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20 },
  healthScoreText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  healthMetrics: { flexDirection: "row", gap: 24 },
  healthMetric: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  healthDot: { width: 10, height: 10, borderRadius: 5 },
  healthMetricLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  healthMetricValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  healthTrack: { height: 14, borderRadius: 8, overflow: "hidden" },
  healthPaid: { height: "100%", borderRadius: 8 },
  healthLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -7,
  },
  healthLegendText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  chart: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  chartDesktop: { marginHorizontal: 0, padding: 24 },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chartTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  chartSub: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  bars: {
    height: 130,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
    marginTop: 12,
  },
  barsDesktop: { height: 210, gap: 18, marginTop: 20 },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  bar: { width: "70%", borderRadius: 5 },
  barVal: { fontSize: 7, marginBottom: 3 },
  barValDesktop: { fontSize: 11, marginBottom: 7 },
  barLabel: { fontSize: 9, marginTop: 4 },
  barLabelDesktop: { fontSize: 11, marginTop: 7 },
  quickTitleLabel: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  quickRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10 },
  quick: { flex: 1, borderRadius: 14, padding: 16, gap: 8 },
  quickText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  desktopShell: {
    width: "100%",
    maxWidth: 1420,
    alignSelf: "center",
    padding: 28,
    gap: 20,
  },
  desktopHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  desktopEyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
  },
  desktopPageTitle: {
    fontSize: 25,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
    letterSpacing: -0.5,
  },
  desktopHeaderActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  desktopProfile: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  profileName: { fontSize: 12, fontFamily: "Inter_700Bold" },
  profileRole: { fontSize: 9, marginTop: 1 },
  desktopFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  desktopSectionLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  desktopPeriodGroup: { flexDirection: "row", gap: 7 },
  desktopPeriodBtn: {
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  desktopPeriodText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  balanceRow: { flexDirection: "row", gap: 16 },
  balanceCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  balanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  balanceLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  balanceValue: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    marginTop: 7,
    letterSpacing: -1,
  },
  balanceIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balanceMetaText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  balanceLink: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  desktopMainGrid: { flexDirection: "row", gap: 16, alignItems: "stretch" },
  desktopMainColumn: { flex: 1, gap: 16 },
  desktopMidRow: { flexDirection: "row", gap: 16, alignItems: "stretch" },
  desktopRail: { width: 245, gap: 12 },
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  schedulePanel: { flex: 1.45, minHeight: 305 },
  healthPanelDesktop: { flex: 0.9, minHeight: 305 },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  panelTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  panelSubtitle: { fontSize: 9, marginTop: 3 },
  panelLink: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  scheduleRow: {
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  scheduleDateIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleDate: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scheduleCount: { fontSize: 9, marginTop: 2 },
  scheduleAmount: { fontSize: 12, fontFamily: "Inter_700Bold" },
  noActivity: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  donutArea: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  donutOuter: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  donutInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  donutPercent: { fontSize: 21, fontFamily: "Inter_700Bold" },
  donutCaption: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    marginTop: 2,
  },
  donutLegend: { gap: 7, marginTop: 10 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 10 },
  legendValue: { fontSize: 11, fontFamily: "Inter_700Bold" },
  trendPanelDesktop: { minHeight: 220 },
  compactBars: {
    height: 148,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 18,
    paddingHorizontal: 8,
  },
  compactBarCol: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  compactBarValue: { fontSize: 8, marginBottom: 5 },
  compactBar: { width: "58%", borderRadius: 5 },
  compactBarLabel: { fontSize: 9, marginTop: 6 },
  railCard: {
    flex: 1,
    minHeight: 132,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  railIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  railLabel: { fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  railValue: { fontSize: 25, fontFamily: "Inter_700Bold", marginTop: 4 },
  railLink: { fontSize: 9, fontFamily: "Inter_600SemiBold", marginTop: "auto" },
  registerRailCard: { minHeight: 138 },
  registerRailTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 5,
  },
});
