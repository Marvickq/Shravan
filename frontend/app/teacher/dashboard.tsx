import React, { useCallback, useState } from "react";
import { View, ScrollView, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { H1, H2, Body, Card, Button } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";

export default function TeacherDashboard() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setClasses(await api.listClasses()); } catch (e) { console.warn(e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const totalStudents = classes.reduce((acc, cls) => acc + (cls.students?.length || 0), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c("brand")} />}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
          <View style={{ flex: 1 }}>
            <Body muted>Welcome back,</Body>
            <H1 testID="teacher-greeting">{user?.name || "Teacher"}</H1>
          </View>
          <View
            style={{
              width: 48, height: 48, borderRadius: 999,
              backgroundColor: c("brandSecondary"), alignItems: "center", justifyContent: "center",
            }}
          >
            <Feather name="briefcase" size={22} color="#fff" />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          <Tile icon="users" label="Classes" value={classes.length} color={c("brand")} />
          <Tile icon="user" label="Students" value={totalStudents} color={c("success")} />
          <Tile
            icon="book-open"
            label="Assignments"
            value={classes.reduce((a, c) => a + (c.assignments?.length || 0), 0)}
            color={c("brandSecondary")}
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <H2 style={{ flex: 1 }}>Your classes</H2>
          <Pressable
            testID="teacher-new-class-btn"
            onPress={() => router.push("/teacher/classes")}
            style={{
              backgroundColor: c("brand"), paddingHorizontal: 12, paddingVertical: 8,
              borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 4,
            }}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Body style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>New</Body>
          </Pressable>
        </View>

        {classes.length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", padding: 16, gap: 8 }}>
              <Feather name="users" size={32} color={c("muted")} />
              <Body style={{ fontWeight: "700" }}>No classes yet</Body>
              <Body muted style={{ textAlign: "center", fontSize: 13 }}>
                Create your first class and start assigning stories.
              </Body>
              <Button
                testID="teacher-empty-create-btn"
                title="Create a class"
                onPress={() => router.push("/teacher/classes")}
                style={{ marginTop: 8 }}
              />
            </View>
          </Card>
        ) : (
          classes.map((cls) => (
            <Card
              key={cls.id}
              testID={`teacher-class-card-${cls.id}`}
              onPress={() => router.push(`/teacher/classes/${cls.id}`)}
              style={{ marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View
                style={{
                  width: 44, height: 44, borderRadius: 10,
                  backgroundColor: c("brandTertiary"),
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Body style={{ color: c("onBrandTertiary"), fontWeight: "800", fontSize: 16 }}>
                  {cls.name.charAt(0).toUpperCase()}
                </Body>
              </View>
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: "700" }}>{cls.name}</Body>
                <Body muted style={{ fontSize: 13, marginTop: 2 }}>
                  {(cls.students?.length || 0)} students
                  {cls.grade ? ` • Grade ${cls.grade}` : ""}
                </Body>
              </View>
              <Feather name="chevron-right" size={20} color={c("muted")} />
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ icon, label, value, color }: any) {
  const { c, RADIUS } = useTheme();
  return (
    <View
      style={{
        flex: 1, padding: 12, borderRadius: RADIUS.md,
        backgroundColor: c("surfaceSecondary"), borderWidth: 1, borderColor: c("border"),
      }}
    >
      <Feather name={icon} size={18} color={color} />
      <Body style={{ fontSize: 22, fontWeight: "800", marginTop: 8 }}>{value}</Body>
      <Body muted style={{ fontSize: 11 }}>{label}</Body>
    </View>
  );
}
