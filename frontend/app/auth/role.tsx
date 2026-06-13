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
  },
  {
    key: "teacher",
    label: "I'm a Teacher",
    desc: "Create classes, assign stories, track student reading.",
    icon: "briefcase" as const,
  },
];

export default function RoleSelect() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const [chosen, setChosen] = React.useState<string>("parent");

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
            onPress={() => setChosen(r.key)}
            style={{
              backgroundColor: c("surfaceSecondary"),
              borderColor: chosen === r.key ? c("brand") : c("border"),
              borderWidth: chosen === r.key ? 2 : 1,
              borderRadius: RADIUS.md,
              padding: 20,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                backgroundColor: chosen === r.key ? c("brand") : c("surfaceTertiary"),
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}
            >
              <Feather
                name={r.icon}
                size={22}
                color={chosen === r.key ? "#fff" : c("onSurface")}
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
            <View style={{
              width: 22, height: 22, borderRadius: 999,
              borderWidth: 2,
              borderColor: chosen === r.key ? c("brand") : c("muted"),
              backgroundColor: chosen === r.key ? c("brand") : "transparent",
              alignItems: "center", justifyContent: "center",
            }}>
              {chosen === r.key && <Feather name="check" size={12} color="#fff" />}
            </View>
          </Pressable>
        ))}
        <Button
          testID="role-continue-btn"
          title={`Continue as ${chosen === "teacher" ? "Teacher" : "Parent"}`}
          onPress={() => router.push({ pathname: "/auth/signup", params: { role: chosen } })}
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
