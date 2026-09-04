import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  MutationCache,
  dehydrate,
  hydrate,
} from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getToken } from "@/lib/apiToken";

SplashScreen.preventAutoHideAsync();
const apiDomain =
  process.env.EXPO_PUBLIC_DOMAIN || "pharma-pay-tracker.onrender.com";
setBaseUrl(`https://${apiDomain}`);
setAuthTokenGetter(getToken);

let queryClient: QueryClient;
const QUERY_CACHE_KEY = "medpay-query-cache-v1";
const mutationCache = new MutationCache({
  onSuccess: async () => {
    // A successful mutation can affect dashboard, stores, invoices,
    // payments and reports. invalidateQueries already refreshes active
    // queries, so do not trigger a second duplicate refetch here.
    await queryClient.invalidateQueries();
  },
});

queryClient = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      // Keep recently loaded data fresh for 30 seconds. This avoids repeated
      // network calls while moving between screens, while mutations still
      // invalidate immediately so newly added/edited data appears at once.
      staleTime: 300000,
      gcTime: 86400000,
      // Render's free service can take a while to wake after inactivity.
      // Keep retrying long enough for the backend to become available instead
      // of treating a temporary wake-up failure as an empty database.
      retry: 4,
      retryDelay: (attempt) => Math.min(2000 * Math.pow(2, attempt), 15000),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
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
    const protectedSegments = [
      "(tabs)",
      "customer",
      "invoice",
      "payment",
      "report",
      "backup",
      "register",
      "account",
    ];
    const inProtected = protectedSegments.includes(segments[0] as string);
    if (!isAuthenticated && inProtected) router.replace("/login");
    else if (isAuthenticated && segments[0] === "login")
      router.replace("/(tabs)");
  }, [isAuthenticated, isLoading, segments]);
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen
        name="signup"
        options={{ title: "Create MedPay Account", headerBackTitle: "Login" }}
      />
      <Stack.Screen
        name="account"
        options={{ title: "Account & Plan", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="privacy"
        options={{ title: "Privacy Policy", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="delete-account"
        options={{ title: "Delete Account", headerBackTitle: "Back" }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="customer/add"
        options={{ title: "Add Medical Store", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="customer/[id]"
        options={{ title: "Store Details", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="customer/edit/[id]"
        options={{ title: "Edit Store", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="register/index"
        options={{ title: "Monthly Register", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="register/agency"
        options={{ title: "Agency Bills", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="invoice/add"
        options={{ title: "Add Invoice", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="invoice/[id]"
        options={{ title: "Invoice Details", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="invoice/edit/[id]"
        options={{ title: "Edit Invoice", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="payment/add"
        options={{ title: "Record Payment", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="payment/edit/[id]"
        options={{ title: "Edit Payment", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="report/outstanding"
        options={{ title: "Outstanding Report", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="report/aging"
        options={{ title: "Bill Aging", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="report/overdue"
        options={{ title: "Overdue Report", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="report/ledger"
        options={{ title: "Customer Ledger", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="report/collection"
        options={{ title: "Collection Report", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="backup"
        options={{ title: "Backup & Restore", headerBackTitle: "Back" }}
      />
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
  const [cacheReady, setCacheReady] = React.useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(QUERY_CACHE_KEY)
      .then((raw) => {
        if (!raw) return;
        const cached = JSON.parse(raw);
        if (cached?.timestamp > Date.now() - 86400000 && cached?.state)
          hydrate(queryClient, cached.state);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setCacheReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!cacheReady) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const state = dehydrate(queryClient, {
          shouldDehydrateQuery: (q) => q.state.status === "success",
        });
        AsyncStorage.setItem(
          QUERY_CACHE_KEY,
          JSON.stringify({ timestamp: Date.now(), state }),
        ).catch(() => undefined);
      }, 750);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [cacheReady]);

  useEffect(() => {
    // Start waking the free Render instance as soon as the app opens. The
    // authenticated queries below retry independently while this completes.
    fetch(`https://${apiDomain}/api/healthz`, {
      headers: { "Cache-Control": "no-cache" },
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Let TanStack Query handle focus normally. Do not manually invalidate
    // every query whenever the app becomes active; that caused unnecessary
    // full-screen reloads and duplicate API traffic.
    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });
    return () => subscription.remove();
  }, []);

  if ((!fontsLoaded && !fontError) || !cacheReady) return null;
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
