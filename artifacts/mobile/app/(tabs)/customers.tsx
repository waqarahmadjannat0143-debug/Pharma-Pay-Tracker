import React, { useState } from "react";
import { View, FlatList, StyleSheet, TouchableOpacity, Text, Platform, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { CustomerCard } from "@/components/CustomerCard";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/EmptyState";
import { useGetCustomers } from "@workspace/api-client-react";

export default function CustomersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const isWeb = Platform.OS === "web";

  const { data: customers, isLoading, refetch } = useGetCustomers({ search: search || undefined });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, {
        paddingTop: isWeb ? 67 + 12 : insets.top + 12,
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
      }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Medical Stores</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/customer/add")}
        >
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search stores..." />

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={colors.primary} size="large" /></View>
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
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (isWeb ? 34 : 90) },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!(customers && customers.length > 0)}
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
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingTop: 4 },
});
