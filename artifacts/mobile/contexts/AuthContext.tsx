import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { setToken } from "@/lib/apiToken";

const TOKEN_KEY = "auth_token";

async function readToken() {
  if (Platform.OS === "web") return AsyncStorage.getItem(TOKEN_KEY);
  const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
  if (secureToken) return secureToken;

  // One-time migration for users upgrading from an older APK.
  const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
  if (legacyToken) {
    await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
  return legacyToken;
}

async function writeToken(token: string) {
  if (Platform.OS === "web") return AsyncStorage.setItem(TOKEN_KEY, token);
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function removeToken() {
  if (Platform.OS !== "web") await SecureStore.deleteItemAsync(TOKEN_KEY);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  login: (token: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  username: null,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await readToken();
        const storedUsername = await AsyncStorage.getItem("auth_username");
        if (token) {
          setToken(token);
          setIsAuthenticated(true);
          setUsername(storedUsername);
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const login = async (token: string, uname: string) => {
    await writeToken(token);
    await AsyncStorage.setItem("auth_username", uname);
    setToken(token);
    setIsAuthenticated(true);
    setUsername(uname);
  };

  const logout = async () => {
    await removeToken();
    await AsyncStorage.removeItem("auth_username");
    setToken(null);
    setIsAuthenticated(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, username, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
