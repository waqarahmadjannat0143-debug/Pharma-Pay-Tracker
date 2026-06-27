import React, { useState } from "react";
import {
  View, FlatList, StyleSheet, TouchableOpacity, Text,
  Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { CustomerCard } from "@/components/CustomerCard";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { useGetCustomers } from "@workspace/api-client-react";
import type { Customer } from "@workspace/api-client-react";

const AVATAR_COLORS = ["#1565C0", "#0891B2", "#7C3AED", "#059669", "#D97706", "#DC2626"];
function getAvatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function fmt(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function DesktopTable({ customers, onPress }: { customers: Customer[]; onPress: (id: number) => void }) {
  const colors = useColors();
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={[dt.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header */}
        <View style={[dt.headerRow, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 2.5 }]}>Store / Owner</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1.5 }]}>Mobile</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1.5, textAlign: "right" }]}>Credit Limit</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 1.5, textAlign: "right" }]}>Outstanding</Text>
          <Text style={[dt.th, { color: colors.mutedForeground, flex: 0.8, textAlign: "center" }]}>Action</Text>
        </View>
        {customers.map((c, i) => {
          const avatarColor = getAvatarColor(c.name);
          const initials = c.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
          const isLast = i === customers.length - 1;
          return (
            <TouchableOpacity
              key={c.id}
              style={[dt.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => onPress(c.id)}
              activeOpacity={0.7}
            >
              <View style={[{ flex: 2.5, flexDirection: "row", alignItems: "center", gap: 10 }]}>
                <View style={[dt.avatar, { backgroundColor: avatarColor }]}>
                  <Text style={dt.avatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[dt.cellMain, { color: colors.foreground }]} numberOfLines={1}>{c.name}</Text>
                  <Text style={[dt.cellSub, { color: colors.mutedForeground }]} numberOfLines={1}>{c.ownerName}</Text>
                </View>
              </View>
              <Text style={[dt.cell, { flex: 1.5, color: colors.mutedForeground }]} numberOfLines={1}>{c.mobile}</Text>
              <Text style={[dt.cell, { flex: 1.5, textAlign: "right", color: colors.foreground }]} numberOfLines={1}>
                {fmt(c.creditLimit ?? 0)}
              </Text>
              <Text style={[dt.cell, {
                flex: 1.5, textAlign: "right",
                color: c.totalOutstanding > 0 ? colors.overdue : colors.paid,
                fontFamily: "Inter_700Bold",
              }]} numberOfLines={1}>
                {c.totalOutstanding > 0 ? fmt(c.totalOutstanding) : "Clear"}
              </Text>
              <View style={[{ flex: 0.8, alignItems: "center" }]}>
                <Feather name="chevron-right" size={16} color={colors.primary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

export default function CustomersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const isWeb = Platform.OS === "web";
  const { isDesktop, isTablet } = useBreakpoint();

  const { data: customers, isLoading, refetch } = useGetCustomers({ search: search || undefined });

  const headerPaddingTop = isDesktop ? 20 : isWeb ? 67 + 12 : insets.top + 12;
  const totalOutstanding = (customers ?? []).reduce((s, c) => s + c.totalOutstanding, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, {
        paddingTop: headerPaddingTop,
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
        paddingHorizontal: isDesktop ? 28 : 20,
      }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Medical Stores</Text>
          {customers && customers.length > 0 && (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {customers.length} stores · Total outstanding: {fmt(totalOutstanding)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/customer/add")}
        >
          <Feather name="plus" size={18} color="#fff" />
          {isDesktop && <Text style={styles.addBtnText}>Add Store</Text>}
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { paddingHorizontal: isDesktop ? 28 : 16 }]}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search stores..." />
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : isDesktop ? (
        customers && customers.length > 0 ? (
          <View style={{ flex: 1, paddingHorizontal: 28, paddingBottom: 28 }}>
            <DesktopTable customers={customers} onPress={id => router.push(`/customer/${id}`)} />
          </View>
        ) : (
          <EmptyState icon="users" title={search ? "No stores found" : "No stores yet"} subtitle={search ? "Try a different search" : "Click 'Add Store' to add your first medical store"} />
        )
      ) : (
        <FlatList
          data={customers ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <CustomerCard customer={item} onPress={() => router.push(`/customer/${item.id}`)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="users"
              title={search ? "No stores found" : "No stores yet"}
              subtitle={search ? "Try a different search" : "Tap + to add your first medical store"}
            />
          }
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (isWeb ? 34 : 90) }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 10, justifyContent: "center" },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  searchWrap: { paddingVertical: 8 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingTop: 4 },
});

const dt = StyleSheet.create({
  table: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 12, paddingHorizontal: 16 },
  th: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", paddingVertical: 14, paddingHorizontal: 16, alignItems: "center" },
  cell: { fontSize: 13, fontFamily: "Inter_500Medium" },
  cellMain: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cellSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  avatar: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
});
