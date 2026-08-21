import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider, focusManager, MutationCache } from "@tanstack/react-query";
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
const apiDomain=process.env.EXPO_PUBLIC_DOMAIN||"pharma-pay-tracker.onrender.com";
setBaseUrl(`https://${apiDomain}`);
setAuthTokenGetter(getToken);

let queryClient: QueryClient;
const mutationCache = new MutationCache({
  onSuccess: async () => {
    // A successful mutation can affect dashboard, stores, invoices,
    // payments and reports. invalidateQueries already refreshes active
    // queries, so do not trigger a second duplicate refetch here.
    await queryClient.invalidateQueries();
  },
});

queryClient=new QueryClient({
  mutationCache,
  defaultOptions:{
    queries:{
      // Keep recently loaded data fresh for 30 seconds. This avoids repeated
      // network calls while moving between screens, while mutations still
      // invalidate immediately so newly added/edited data appears at once.
      staleTime:30000,
      gcTime:600000,
      // Render's free service can take a while to wake after inactivity.
      // Keep retrying long enough for the backend to become available instead
      // of treating a temporary wake-up failure as an empty database.
      retry:4,
      retryDelay:attempt=>Math.min(2000*Math.pow(2,attempt),15000),
      refetchOnMount:true,
      refetchOnWindowFocus:true,
      refetchOnReconnect:true,
    },
  },
});

function RootLayoutNav(){
  const{isAuthenticated,isLoading}=useAuth();
  const segments=useSegments();
  const router=useRouter();
  useEffect(()=>{
    if(isLoading)return;
    const protectedSegments=["(tabs)","customer","invoice","payment","report","backup","register"];
    const inProtected=protectedSegments.includes(segments[0] as string);
    if(!isAuthenticated&&inProtected)router.replace("/login");
    else if(isAuthenticated&&segments[0]==="login")router.replace("/(tabs)");
  },[isAuthenticated,isLoading,segments]);
  return <Stack>
    <Stack.Screen name="index" options={{headerShown:false}}/>
    <Stack.Screen name="login" options={{headerShown:false}}/>
    <Stack.Screen name="(tabs)" options={{headerShown:false}}/>
    <Stack.Screen name="customer/add" options={{title:"Add Medical Store",headerBackTitle:"Back"}}/>
    <Stack.Screen name="customer/[id]" options={{title:"Store Details",headerBackTitle:"Back"}}/>
    <Stack.Screen name="customer/edit/[id]" options={{title:"Edit Store",headerBackTitle:"Back"}}/>
    <Stack.Screen name="register/[customerId]" options={{title:"Monthly Register",headerBackTitle:"Back"}}/>
    <Stack.Screen name="register/agency" options={{title:"Agency Bills",headerBackTitle:"Back"}}/>
    <Stack.Screen name="invoice/add" options={{title:"Add Invoice",headerBackTitle:"Back"}}/>
    <Stack.Screen name="invoice/[id]" options={{title:"Invoice Details",headerBackTitle:"Back"}}/>
    <Stack.Screen name="invoice/edit/[id]" options={{title:"Edit Invoice",headerBackTitle:"Back"}}/>
    <Stack.Screen name="payment/add" options={{title:"Record Payment",headerBackTitle:"Back"}}/>
    <Stack.Screen name="payment/edit/[id]" options={{title:"Edit Payment",headerBackTitle:"Back"}}/>
    <Stack.Screen name="report/outstanding" options={{title:"Outstanding Report",headerBackTitle:"Back"}}/>
    <Stack.Screen name="report/aging" options={{title:"Bill Aging",headerBackTitle:"Back"}}/>
    <Stack.Screen name="report/overdue" options={{title:"Overdue Report",headerBackTitle:"Back"}}/>
    <Stack.Screen name="report/ledger" options={{title:"Customer Ledger",headerBackTitle:"Back"}}/>
    <Stack.Screen name="report/collection" options={{title:"Collection Report",headerBackTitle:"Back"}}/>
    <Stack.Screen name="backup" options={{title:"Backup & Restore",headerBackTitle:"Back"}}/>
  </Stack>
}

export default function RootLayout(){
  const[fontsLoaded,fontError]=useFonts({Inter_400Regular,Inter_500Medium,Inter_600SemiBold,Inter_700Bold});

  useEffect(()=>{
    // Start waking the free Render instance as soon as the app opens. The
    // authenticated queries below retry independently while this completes.
    fetch(`https://${apiDomain}/api/healthz`,{
      headers:{"Cache-Control":"no-cache"},
    }).catch(()=>undefined);
  },[]);

  useEffect(()=>{
    if(fontsLoaded||fontError)SplashScreen.hideAsync();
  },[fontsLoaded,fontError]);

  useEffect(()=>{
    // Let TanStack Query handle focus normally. Do not manually invalidate
    // every query whenever the app becomes active; that caused unnecessary
    // full-screen reloads and duplicate API traffic.
    const subscription=AppState.addEventListener("change",state=>{
      focusManager.setFocused(state==="active");
    });
    return()=>subscription.remove();
  },[]);

  if(!fontsLoaded&&!fontError)return null;
  return <SafeAreaProvider>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{flex:1}}>
          <KeyboardProvider>
            <AuthProvider><RootLayoutNav/></AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  </SafeAreaProvider>
}
