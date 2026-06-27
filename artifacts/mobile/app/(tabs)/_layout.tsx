import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme, useWindowDimensions } from "react-native";
import { BlurView } from "expo-blur";
import { useColors } from "@/hooks/useColors";
import { Sidebar } from "@/components/Sidebar";

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 1024;

  return (
    <View style={styles.root}>
      {isDesktop && <Sidebar />}
      <View style={styles.content}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.mutedForeground,
            headerShown: false,
            tabBarStyle: isDesktop
              ? { display: "none" }
              : {
                  position: "absolute",
                  backgroundColor: isIOS ? "transparent" : colors.tabBar,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  elevation: 0,
                  height: 60,
                  paddingBottom: 8,
                },
            tabBarBackground: () =>
              !isDesktop && isIOS ? (
                <BlurView
                  intensity={100}
                  tint={isDark ? "dark" : "light"}
                  style={StyleSheet.absoluteFill}
                />
              ) : null,
            tabBarLabelStyle: {
              fontSize: 10,
              fontFamily: "Inter_500Medium",
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Dashboard",
              tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
            }}
          />
          <Tabs.Screen
            name="customers"
            options={{
              title: "Stores",
              tabBarIcon: ({ color }) => <Feather name="users" size={22} color={color} />,
            }}
          />
          <Tabs.Screen
            name="invoices"
            options={{
              title: "Invoices",
              tabBarIcon: ({ color }) => <Feather name="file-text" size={22} color={color} />,
            }}
          />
          <Tabs.Screen
            name="payments"
            options={{
              title: "Payments",
              tabBarIcon: ({ color }) => <Feather name="credit-card" size={22} color={color} />,
            }}
          />
          <Tabs.Screen
            name="reports"
            options={{
              title: "Reports",
              tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={22} color={color} />,
            }}
          />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  content: { flex: 1 },
});
