import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { H1, H2, Body, Card, Button } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { api } from "@/src/api";

export default function TeacherClassesIndex() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setClasses(await api.listClasses()); } catch (e) { console.warn(e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const cls = await api.createClass({ name: name.trim(), grade: grade.trim() || undefined });
      setName("");
      setGrade("");
      await load();
      router.push(`/teacher/classes/${cls.id}`);
    } catch (e) {
      console.warn(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c("brand")} />}
        >
          <H1 style={{ marginBottom: 16 }}>Classes</H1>

          <Card style={{ marginBottom: 24 }}>
            <Body style={{ fontWeight: "700", marginBottom: 12 }}>Create a new class</Body>
            <Body style={{ marginBottom: 6, fontSize: 13 }}>Class name</Body>
            <TextInput
              testID="teacher-class-name-input"
              style={[
                styles.in,
                { backgroundColor: c("surface"), borderColor: c("border"), color: c("onSurface"), borderRadius: RADIUS.sm },
              ]}
              placeholder="Grade 3 - Sundaram"
              placeholderTextColor={c("muted")}
              value={name}
              onChangeText={setName}
            />
            <Body style={{ marginBottom: 6, marginTop: 12, fontSize: 13 }}>Grade (optional)</Body>
            <TextInput
              testID="teacher-class-grade-input"
              style={[
                styles.in,
                { backgroundColor: c("surface"), borderColor: c("border"), color: c("onSurface"), borderRadius: RADIUS.sm },
              ]}
              placeholder="3"
              placeholderTextColor={c("muted")}
              value={grade}
              onChangeText={setGrade}
            />
            <Button
              testID="teacher-create-class-btn"
              title={busy ? "Creating…" : "Create class"}
              onPress={create}
              loading={busy}
              style={{ marginTop: 16 }}
            />
          </Card>

          <H2 style={{ marginBottom: 12 }}>Your classes</H2>
          {classes.length === 0 ? (
            <Body muted>No classes yet. Create one above to begin.</Body>
          ) : (
            classes.map((cls) => (
              <Card
                key={cls.id}
                testID={`teacher-class-row-${cls.id}`}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  in: { height: 44, paddingHorizontal: 12, borderWidth: 1, fontSize: 15 },
});
