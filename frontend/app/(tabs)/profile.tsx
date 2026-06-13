import React, { useCallback, useState } from "react";
import { View, ScrollView, TextInput, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { H1, H2, Body, Card, Button } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";

export default function Profile() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");

  const load = useCallback(async () => {
    try { setChildren(await api.listChildren()); } catch (e) { console.warn(e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addChild = async () => {
    if (!name || !age) return;
    try {
      await api.createChild({ name, age: parseInt(age) || 5 });
      setName(""); setAge("");
      await load();
    } catch (e) { console.warn(e); }
  };

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
            backgroundColor: c("brand"), alignItems: "center", justifyContent: "center",
          }}>
            <Body style={{ color: "#fff", fontWeight: "800", fontSize: 22 }}>
              {(user?.name || "?").charAt(0).toUpperCase()}
            </Body>
          </View>
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: "700", fontSize: 16 }}>{user?.name}</Body>
            <Body muted style={{ fontSize: 13 }}>{user?.email}</Body>
            <Body style={{ color: c("brand"), fontSize: 12, fontWeight: "700", marginTop: 4 }}>
              {(user?.role || "parent").toUpperCase()}
            </Body>
          </View>
        </Card>

        <H2 style={{ marginBottom: 12 }}>Children</H2>
        {children.length === 0 && (
          <Body muted style={{ marginBottom: 12 }}>No children added yet.</Body>
        )}
        {children.map((ch) => (
          <Card key={ch.id} style={{ marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }} testID={`profile-child-${ch.id}`}>
            <View style={{
              width: 44, height: 44, borderRadius: 999,
              backgroundColor: c("brandTertiary"), alignItems: "center", justifyContent: "center",
            }}>
              <Body style={{ color: c("onBrandTertiary"), fontWeight: "800" }}>
                {ch.name.charAt(0).toUpperCase()}
              </Body>
            </View>
            <View style={{ flex: 1 }}>
              <Body style={{ fontWeight: "700" }}>{ch.name}</Body>
              <Body muted style={{ fontSize: 12 }}>Age {ch.age} • Level {ch.level}</Body>
            </View>
          </Card>
        ))}

        <Card style={{ marginTop: 8 }}>
          <Body style={{ fontWeight: "700", marginBottom: 8 }}>Add a child</Body>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              testID="profile-child-name-input"
              style={[styles.in, { flex: 2, backgroundColor: c("surface"), borderColor: c("border"), color: c("onSurface"), borderRadius: RADIUS.sm }]}
              placeholder="Name"
              placeholderTextColor={c("muted")}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              testID="profile-child-age-input"
              style={[styles.in, { flex: 1, backgroundColor: c("surface"), borderColor: c("border"), color: c("onSurface"), borderRadius: RADIUS.sm }]}
              placeholder="Age"
              placeholderTextColor={c("muted")}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
            />
          </View>
          <Button testID="profile-add-child-btn" title="Add child" onPress={addChild} style={{ marginTop: 12 }} />
        </Card>

        <View style={{ marginTop: 32, gap: 8 }}>
          <Pressable
            testID="profile-settings-row"
            style={{ flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: c("surfaceSecondary"), borderRadius: RADIUS.md, borderWidth: 1, borderColor: c("border") }}
          >
            <Feather name="settings" size={18} color={c("onSurface")} />
            <Body style={{ marginLeft: 12, fontWeight: "600" }}>Settings</Body>
            <View style={{ flex: 1 }} />
            <Feather name="chevron-right" size={18} color={c("muted")} />
          </Pressable>
          <Pressable
            testID="profile-subscription-row"
            style={{ flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: c("surfaceSecondary"), borderRadius: RADIUS.md, borderWidth: 1, borderColor: c("border") }}
          >
            <Feather name="credit-card" size={18} color={c("onSurface")} />
            <Body style={{ marginLeft: 12, fontWeight: "600" }}>Subscription</Body>
            <View style={{ flex: 1 }} />
            <View style={{ backgroundColor: c("brandTertiary"), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
              <Body style={{ fontSize: 11, fontWeight: "700", color: c("onBrandTertiary") }}>Free trial</Body>
            </View>
          </Pressable>
          <Pressable
            testID="profile-logout-btn"
            onPress={doLogout}
            style={{ flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: c("surfaceSecondary"), borderRadius: RADIUS.md, borderWidth: 1, borderColor: c("border") }}
          >
            <Feather name="log-out" size={18} color={c("error")} />
            <Body style={{ marginLeft: 12, fontWeight: "600", color: c("error") }}>Sign out</Body>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  in: { height: 44, paddingHorizontal: 12, borderWidth: 1, fontSize: 15 },
});
