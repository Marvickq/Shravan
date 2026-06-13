import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { H1, H2, Body, Card, Button } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { api } from "@/src/api";

export default function ClassDetail() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cls, setCls] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [stories, setStories] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [c1, a1] = await Promise.all([
        api.getClass(String(id)),
        api.classAnalytics(String(id)),
      ]);
      setCls(c1);
      setAnalytics(a1);
    } catch (e) {
      console.warn(e);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    api.listStories().then(setStories).catch(() => {});
  }, []);

  const addStudent = async () => {
    if (!studentName.trim()) return;
    setBusy(true);
    try {
      await api.addStudent(String(id), {
        name: studentName.trim(),
        email: studentEmail.trim() || undefined,
      });
      setStudentName("");
      setStudentEmail("");
      await load();
    } catch (e) {
      console.warn(e);
    } finally {
      setBusy(false);
    }
  };

  const assignStory = async (storyId: string) => {
    setShowAssign(false);
    try {
      await api.createAssignment(String(id), { story_id: storyId });
      await load();
    } catch (e) {
      console.warn(e);
    }
  };

  if (!cls) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c("surface"), alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={c("brand")} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }} keyboardShouldPersistTaps="handled">
          <Pressable testID="cls-back-btn" onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 12 }}>
            <Feather name="arrow-left" size={24} color={c("onSurface")} />
          </Pressable>
          <H1 style={{ marginBottom: 4 }}>{cls.name}</H1>
          <Body muted style={{ marginBottom: 24 }}>
            {cls.grade ? `Grade ${cls.grade} • ` : ""}{cls.students?.length || 0} students • {cls.assignments?.length || 0} assignments
          </Body>

          {analytics && (
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <Tile icon="clock" value={analytics.total_minutes} label="Total minutes" tint={c("brand")} />
              <Tile icon="type" value={analytics.total_words} label="Total words" tint={c("brandSecondary")} />
            </View>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <H2 style={{ flex: 1 }}>Assignments</H2>
            <Pressable
              testID="cls-assign-btn"
              onPress={() => setShowAssign(true)}
              style={{
                backgroundColor: c("brand"), paddingHorizontal: 12, paddingVertical: 8,
                borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 4,
              }}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Body style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Assign story</Body>
            </Pressable>
          </View>
          {(cls.assignments || []).length === 0 ? (
            <Body muted style={{ marginBottom: 24 }}>No assignments yet.</Body>
          ) : (
            <View style={{ gap: 8, marginBottom: 24 }}>
              {cls.assignments.map((a: any) => (
                <Card key={a.id} testID={`cls-assignment-${a.id}`} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 8,
                    backgroundColor: c("brandTertiary"),
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Feather name="book-open" size={16} color={c("onBrandTertiary")} />
                  </View>
                  <Body style={{ flex: 1, fontWeight: "600" }}>{a.story_title}</Body>
                </Card>
              ))}
            </View>
          )}

          <H2 style={{ marginBottom: 12 }}>Students</H2>
          {(cls.students || []).length === 0 ? (
            <Body muted style={{ marginBottom: 16 }}>No students yet. Add one below.</Body>
          ) : (
            <View style={{ gap: 8, marginBottom: 16 }}>
              {analytics?.students.map((s: any) => (
                <Card
                  key={s.student_id}
                  testID={`cls-student-${s.student_id}`}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                >
                  <View style={{
                    width: 40, height: 40, borderRadius: 999,
                    backgroundColor: s.linked ? c("success") : c("muted"),
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Body style={{ color: "#fff", fontWeight: "800" }}>
                      {s.name.charAt(0).toUpperCase()}
                    </Body>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: "700" }}>{s.name}</Body>
                    <Body muted style={{ fontSize: 12, marginTop: 2 }}>
                      {s.email || "no email"} {s.linked ? "• linked" : "• not linked"}
                    </Body>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Body style={{ fontWeight: "700", color: c("brand") }}>{s.minutes} min</Body>
                    <Body muted style={{ fontSize: 11 }}>{s.stories_finished} done</Body>
                  </View>
                </Card>
              ))}
            </View>
          )}

          <Card>
            <Body style={{ fontWeight: "700", marginBottom: 12 }}>Add a student</Body>
            <Body style={{ marginBottom: 6, fontSize: 13 }}>Name</Body>
            <TextInput
              testID="cls-student-name-input"
              style={[styles.in, { backgroundColor: c("surface"), borderColor: c("border"), color: c("onSurface"), borderRadius: RADIUS.sm }]}
              placeholder="Ananya Roy"
              placeholderTextColor={c("muted")}
              value={studentName}
              onChangeText={setStudentName}
            />
            <Body style={{ marginBottom: 6, marginTop: 12, fontSize: 13 }}>
              Email (to link their Shravan account, optional)
            </Body>
            <TextInput
              testID="cls-student-email-input"
              style={[styles.in, { backgroundColor: c("surface"), borderColor: c("border"), color: c("onSurface"), borderRadius: RADIUS.sm }]}
              placeholder="parent@example.com"
              placeholderTextColor={c("muted")}
              value={studentEmail}
              onChangeText={setStudentEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Button testID="cls-add-student-btn" title="Add student" onPress={addStudent} loading={busy} style={{ marginTop: 16 }} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showAssign} animationType="slide" transparent onRequestClose={() => setShowAssign(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <SafeAreaView edges={["bottom"]} style={{ backgroundColor: c("surface"), borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ padding: 20, maxHeight: 500 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                <H2 style={{ flex: 1 }}>Choose a story</H2>
                <Pressable testID="assign-close-btn" onPress={() => setShowAssign(false)} hitSlop={12}>
                  <Feather name="x" size={22} color={c("onSurface")} />
                </Pressable>
              </View>
              <ScrollView>
                {stories.map((s) => (
                  <Pressable
                    key={s.id}
                    testID={`assign-story-${s.id}`}
                    onPress={() => assignStory(s.id)}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 12,
                      padding: 12, borderRadius: RADIUS.md,
                      borderWidth: 1, borderColor: c("border"),
                      backgroundColor: c("surfaceSecondary"),
                      marginBottom: 8,
                    }}
                  >
                    <View style={{
                      width: 40, height: 40, borderRadius: 8,
                      backgroundColor: s.cover_color,
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Feather name="book" size={16} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Body style={{ fontWeight: "700" }}>{s.title}</Body>
                      <Body muted style={{ fontSize: 12 }}>
                        {s.estimated_minutes} min • {s.audio_events.length} audio events
                      </Body>
                    </View>
                    <Feather name="chevron-right" size={18} color={c("muted")} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Tile({ icon, value, label, tint }: any) {
  const { c, RADIUS } = useTheme();
  return (
    <View style={{
      flex: 1, padding: 16, borderRadius: RADIUS.md,
      backgroundColor: c("surfaceSecondary"), borderWidth: 1, borderColor: c("border"),
    }}>
      <Feather name={icon} size={18} color={tint} />
      <Body style={{ fontSize: 22, fontWeight: "800", marginTop: 8 }}>{value}</Body>
      <Body muted style={{ fontSize: 11 }}>{label}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  in: { height: 44, paddingHorizontal: 12, borderWidth: 1, fontSize: 15 },
});
