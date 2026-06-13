import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/src/auth";

export default function Index() {
  const { user, hydrated } = useAuth();
  if (!hydrated) return null;
  if (user) return <Redirect href="/(tabs)/home" />;
  return <Redirect href="/onboarding" />;
}
