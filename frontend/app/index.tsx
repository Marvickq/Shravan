import { Redirect } from "expo-router";
import { useAuth } from "@/src/auth";

export default function Index() {
  const { user, hydrated } = useAuth();
  if (!hydrated) return null;
  if (!user) return <Redirect href="/onboarding" />;
  if (user.role === "teacher") return <Redirect href="/teacher/dashboard" />;
  return <Redirect href="/(tabs)/home" />;
}
