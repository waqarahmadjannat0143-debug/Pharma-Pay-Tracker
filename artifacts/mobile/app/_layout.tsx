import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getToken } from "@/lib/apiToken";

SplashScreen.preventAutoHideAsync();

const apiDomain = process.env.EXPO_PUBLIC_DOMAIN || "pharma-pay-tracker.onrender.com";
setBaseUrl(`https://${apiDomain}`);
setAuthTokenGetter(getToken);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
  },
});

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const protectedSegments = ["(tabs)", "customer", "invoice", "payment", "report", "backup"];
    const inProtected = protectedSegments.includes(segments[0] as string);
    if (!isAuthenticated && inProtected) {
      router.replace("/login");
    } else if (isAuthenticated && segments[0] === "login") {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="customer/add" options={{ title: "Add Medical Store", headerBackTitle: "Back" }} />
      <Stack.Screen name="customer/[id]" options={{ title: "Store Details", headerBackTitle: "Back" }} />
      <Stack.Screen name="customer/edit/[id]" options={{ title: "Edit Store", headerBackTitle: "Back" }} />
      <Stack.Screen name="invoice/add" options={{ title: "Add Invoice", headerBackTitle: "Back" }} />
      <Stack.Screen name="invoice/[id]" options={{ title: "Invoice Details", headerBackTitle: "Back" }} />
      <Stack.Screen name="payment/add" options={{ title: "Record Payment", headerBackTitle: "Back" }} />
      <Stack.Screen name="payment/edit/[id]" options={{ title: "Edit Payment", headerBackTitle: "Back" }} />
      <Stack.Screen name="report/outstanding" options={{ title: "Outstanding Report", headerBackTitle: "Back" }} />
      <Stack.Screen name="report/overdue" options={{ title: "Overdue Report", headerBackTitle: "Back" }} />
      <Stack.Screen name="report/ledger" options={{ title: "Customer Ledger", headerBackTitle: "Back" }} />
      <Stack.Screen name="report/collection" options={{ title: "Collection Report", headerBackTitle: "Back" }} />
      <Stack.Screen name="backup" options={{ title: "Backup & Restore", headerBackTitle: "Back" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
