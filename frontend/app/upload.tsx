import React, { useState } from "react";
import { View, ScrollView, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Feather } from "@expo/vector-icons";
import { H1, H2, Body, Card, Button } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { api } from "@/src/api";

export default function Upload() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const [mode, setMode] = useState<"pdf" | "text">("pdf");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [pickedUri, setPickedUri] = useState<string | null>(null);

  const pickPdf = async () => {
    setErr(null);
    const r = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (r.canceled) return;
    setPickedName(r.assets[0].name);
    setPickedUri(r.assets[0].uri);
  };

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (mode === "pdf") {
        if (!pickedUri) { setErr("Please pick a PDF first."); setBusy(false); return; }
        const story = await api.uploadPdf(pickedUri, pickedName || "story.pdf");
        router.replace(`/story/${story.id}`);
      } else {
        if (!text.trim() || text.length < 30) { setErr("Please paste a story with at least 30 characters."); setBusy(false); return; }
        const story = await api.createFromText({ title: title || "My Story", text });
        router.replace(`/story/${story.id}`);
      }
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Pressable testID="upload-back-btn" onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 16 }}>
            <Feather name="arrow-left" size={24} color={c("onSurface")} />
          </Pressable>
          <H1 style={{ marginBottom: 8 }}>Add a new story</H1>
          <Body muted style={{ marginBottom: 24, fontSize: 16 }}>
            Upload a PDF or paste your own story. We'll turn it into an interactive read.
          </Body>

          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            {[
              { k: "pdf", label: "PDF upload", icon: "file-text" as const },
              { k: "text", label: "Paste text", icon: "edit-3" as const },
            ].map((opt) => (
              <Pressable
                key={opt.k}
                testID={`upload-mode-${opt.k}`}
                onPress={() => setMode(opt.k as any)}
                style={{
                  flex: 1, padding: 16, borderRadius: RADIUS.md,
                  borderWidth: 2,
                  borderColor: mode === opt.k ? c("brand") : c("border"),
                  backgroundColor: mode === opt.k ? c("brandTertiary") : c("surfaceSecondary"),
                  alignItems: "center", gap: 8,
                }}
              >
                <Feather name={opt.icon} size={20} color={mode === opt.k ? c("brand") : c("onSurface")} />
                <Body style={{ fontWeight: "700", color: mode === opt.k ? c("brand") : c("onSurface") }}>
                  {opt.label}
                </Body>
              </Pressable>
            ))}
          </View>

          {mode === "pdf" ? (
            <Card>
              <Pressable testID="upload-pick-pdf-btn" onPress={pickPdf} style={{ alignItems: "center", padding: 24 }}>
                <View style={{
                  width: 56, height: 56, borderRadius: 12,
                  backgroundColor: c("brandTertiary"),
                  alignItems: "center", justifyContent: "center", marginBottom: 12,
                }}>
                  <Feather name="upload-cloud" size={24} color={c("brand")} />
                </View>
                <Body style={{ fontWeight: "700", marginBottom: 4 }}>
                  {pickedName || "Tap to choose a PDF"}
                </Body>
                <Body muted style={{ fontSize: 13, textAlign: "center" }}>
                  We'll extract the story text and detect audio moments automatically.
                </Body>
              </Pressable>
            </Card>
          ) : (
            <>
              <Body style={{ marginBottom: 6, fontWeight: "600" }}>Title</Body>
              <TextInput
                testID="upload-title-input"
                style={[styles.in, { backgroundColor: c("surfaceSecondary"), borderColor: c("border"), color: c("onSurface"), borderRadius: RADIUS.md }]}
                placeholder="The little owl"
                placeholderTextColor={c("muted")}
                value={title}
                onChangeText={setTitle}
              />
              <Body style={{ marginBottom: 6, marginTop: 16, fontWeight: "600" }}>Story text</Body>
              <TextInput
                testID="upload-text-input"
                style={[styles.in, {
                  backgroundColor: c("surfaceSecondary"), borderColor: c("border"), color: c("onSurface"),
                  borderRadius: RADIUS.md, height: 220, textAlignVertical: "top", paddingTop: 12,
                }]}
                placeholder="Once upon a time, in a quiet village..."
                placeholderTextColor={c("muted")}
                value={text}
                onChangeText={setText}
                multiline
              />
            </>
          )}

          {err && (
            <View testID="upload-error" style={{ marginTop: 16, backgroundColor: "#fde2dd", padding: 12, borderRadius: 8 }}>
              <Body style={{ color: c("error") }}>{err}</Body>
            </View>
          )}

          <Button
            testID="upload-submit-btn"
            title={busy ? "Processing…" : "Create story"}
            onPress={submit}
            loading={busy}
            style={{ marginTop: 24 }}
            icon={!busy ? <Feather name="zap" size={18} color="#fff" /> : undefined}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  in: { minHeight: 52, paddingHorizontal: 14, borderWidth: 1, fontSize: 15 },
});
