import React from "react";
import { View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { H1, Body, Button } from "@/src/ui";
import { useTheme } from "@/src/theme";

const ROLES = [
  {
    key: "parent",
    label: "I'm a Parent",
    desc: "Upload books, manage child profiles, track reading.",
    icon: "users" as const,
    active: true,
  },
  {
    key: "school",
    label: "I'm a Teacher / School",
    desc: "Coming soon — manage classes and assignments.",
    icon: "briefcase" as const,
    active: false,
  },
  {
    key: "admin",
    label: "I'm an Admin",
    desc: "Coming soon — moderate content and users.",
    icon: "shield" as const,
    active: false,
  },
];

export default function RoleSelect() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c("surface") }}
      edges={["top"]}
    >
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Pressable
          testID="role-back-btn"
          onPress={() => router.back()}
          style={{ marginBottom: 16 }}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={24} color={c("onSurface")} />
        </Pressable>
        <H1 style={{ marginBottom: 8 }}>Who's joining?</H1>
        <Body muted style={{ marginBottom: 24, fontSize: 16 }}>
          Choose your role to continue.
        </Body>
        {ROLES.map((r) => (
          <Pressable
            key={r.key}
            testID={`role-${r.key}-card`}
            disabled={!r.active}
            onPress={() => router.push("/auth/signup")}
            style={{
              backgroundColor: c("surfaceSecondary"),
              borderColor: r.active ? c("brand") : c("border"),
              borderWidth: r.active ? 2 : 1,
              borderRadius: RADIUS.md,
              padding: 20,
              marginBottom: 12,
              opacity: r.active ? 1 : 0.55,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                backgroundColor: r.active ? c("brand") : c("surfaceTertiary"),
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}
            >
              <Feather
                name={r.icon}
                size={22}
                color={r.active ? "#fff" : c("onSurface")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Body style={{ fontWeight: "700", fontSize: 16 }}>
                {r.label}
              </Body>
              <Body muted style={{ fontSize: 13, marginTop: 2 }}>
                {r.desc}
              </Body>
            </View>
          </Pressable>
        ))}
        <Button
          testID="role-continue-btn"
          title="Continue as Parent"
          onPress={() => router.push("/auth/signup")}
          style={{ marginTop: 16 }}
        />
        <Button
          testID="role-login-btn"
          title="I already have an account"
          variant="ghost"
          onPress={() => router.push("/auth/login")}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
