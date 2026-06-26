import React, { useState } from "react";
import { View, FlatList, StyleSheet, TouchableOpacity, Text, ScrollView, Platform, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { InvoiceCard } from "@/components/InvoiceCard";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { useGetInvoices } from "@workspace/api-client-react";

const STATUS_FILTERS = ["all", "pending", "partial", "overdue", "paid"] as const;
const STATUS_LABELS: Record<string, string> = { all: "All", pending: "Pending", partial: "Partial", overdue: "Overdue", paid: "Paid" };

export default function InvoicesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const isWeb = Platform.OS === "web";

  const { data: invoices, isLoading, refetch } = useGetInvoices({
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        paddingTop: isWeb ? 67 + 12 : insets.top + 12,
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
      }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Invoices</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/invoice/add")}
        >
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by invoice # or store..." />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {STATUS_FILTERS.map(f => {
          const active = status === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, {
                backgroundColor: active ? colors.primary : colors.muted,
                borderColor: active ? colors.primary : colors.border,
              }]}
              onPress={() => setStatus(f)}
            >
              <Text style={[styles.filterText, { color: active ? "#fff" : colors.mutedForeground }]}>
                {STATUS_LABELS[f]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={invoices ?? []}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <InvoiceCard invoice={item} onPress={() => router.push(`/invoice/${item.id}`)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="file-text"
              title={search || status !== "all" ? "No invoices found" : "No invoices yet"}
              subtitle={search || status !== "all" ? "Try different filters" : "Tap + to add your first invoice"}
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
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  filterScroll: { maxHeight: 48 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingTop: 4 },
});
