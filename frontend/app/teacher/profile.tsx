import React from "react";
import { View, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { H1, Body, Card } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function TeacherProfile() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();

  const doLogout = async () => {
    await logout();
    router.replace("/onboarding");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <H1 style={{ marginBottom: 16 }}>Profile</H1>

        <Card style={{ marginBottom: 24, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{
            width: 56, height: 56, borderRadius: 999,
            backgroundColor: c("brandSecondary"), alignItems: "center", justifyContent: "center",
          }}>
            <Feather name="briefcase" size={26} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: "700", fontSize: 16 }}>{user?.name}</Body>
            <Body muted style={{ fontSize: 13 }}>{user?.email}</Body>
            <Body style={{ color: c("brand"), fontSize: 12, fontWeight: "700", marginTop: 4 }}>
              TEACHER
            </Body>
          </View>
        </Card>

        <Pressable
          testID="teacher-profile-logout-btn"
          onPress={doLogout}
          style={{
            flexDirection: "row", alignItems: "center",
            padding: 16, backgroundColor: c("surfaceSecondary"),
            borderRadius: RADIUS.md, borderWidth: 1, borderColor: c("border"),
          }}
        >
          <Feather name="log-out" size={18} color={c("error")} />
          <Body style={{ marginLeft: 12, fontWeight: "600", color: c("error") }}>Sign out</Body>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
