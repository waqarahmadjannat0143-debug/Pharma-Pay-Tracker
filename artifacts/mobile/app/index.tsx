import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { MedPayLoading } from "@/components/MedPayLoading";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <MedPayLoading />;
  return <Redirect href={isAuthenticated ? "/(tabs)" : "/login"} />;
}
