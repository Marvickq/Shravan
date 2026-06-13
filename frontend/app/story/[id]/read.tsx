import React, { useEffect, useRef, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  AudioModule,
  useAudioRecorder,
  RecordingPresets,
} from "expo-audio";
import { H1, H2, Body, Card, Button } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { api } from "@/src/api";

const EVENT_LABELS: Record<string, { icon: any; label: string }> = {
  animal: { icon: "github", label: "Animal" },
  bird: { icon: "feather", label: "Bird" },
  weather: { icon: "cloud-rain", label: "Weather" },
  nature: { icon: "wind", label: "Nature" },
  music: { icon: "music", label: "Music" },
  festival: { icon: "star", label: "Festival" },
  emotion: { icon: "smile", label: "Emotion" },
  horror: { icon: "alert-triangle", label: "Horror" },
  character_voice: { icon: "user", label: "Voice" },
};

const CHUNK_MS = 4000;

export default function Reader() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [story, setStory] = useState<any>(null);
  const [index, setIndex] = useState(0);
  const [listening, setListening] = useState(false);
  const [triggered, setTriggered] = useState<any | null>(null);
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [behaviour, setBehaviour] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);
  const [permGranted, setPermGranted] = useState<boolean | null>(null);
  const [completed, setCompleted] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const totalWords = useRef(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const sentenceLayouts = useRef<Record<number, number>>({});
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const stopRequested = useRef(false);

  useEffect(() => {
    if (!id) return;
    api.getStory(String(id)).then(setStory).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const r = await AudioModule.requestRecordingPermissionsAsync();
        setPermGranted(!!r.granted);
        if (r.granted) {
          await AudioModule.setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: true,
          });
        }
      } catch (e: any) {
        setError(e?.message || "Microphone unavailable");
        setPermGranted(false);
      }
    })();
  }, []);

  const currentSentence = story?.sentences?.[index];

  // Auto-scroll active sentence into view
  useEffect(() => {
    const y = sentenceLayouts.current[index];
    if (y !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }
  }, [index]);

  const captureChunk = async () => {
    if (!recorder || !story || stopRequested.current) return;
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      await new Promise((r) => setTimeout(r, CHUNK_MS));
      if (stopRequested.current) {
        try { await recorder.stop(); } catch {}
        return;
      }
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;
      const trans = await api.transcribeAudio(uri);
      const transcript = (trans?.transcript || "").trim();
      const confidence = trans?.confidence ?? 0.0;
      setLastTranscript(transcript || "(listening…)");
      if (!transcript) {
        setBehaviour("listening");
        return;
      }
      const m = await api.speechMatch({
        story_id: story.id,
        sentence_index: index,
        transcript,
        confidence,
      });
      setLastScore(m.match_score);
      setBehaviour(m.behaviour);
      if (m.trigger_event && m.audio_event) {
        setTriggered(m.audio_event);
        setTimeout(() => setTriggered(null), 3500);
      }
      if (m.advance) {
        totalWords.current += transcript.split(/\s+/).length;
        const next = index + 1;
        if (next >= story.sentences.length) {
          setCompleted(true);
          stopRequested.current = true;
          setListening(false);
          await api.saveProgress({
            story_id: story.id,
            sentences_completed: story.sentences.length,
            duration_seconds: Math.round((Date.now() - startedAt.current) / 1000),
            words_read: totalWords.current,
            finished: true,
          });
          return;
        }
        setIndex(next);
      }
    } catch (e: any) {
      console.warn("chunk failed", e);
    }
  };

  const loop = async () => {
    while (!stopRequested.current && listening) {
      await captureChunk();
    }
  };

  const startListening = async () => {
    if (!permGranted) {
      setError("Please grant microphone access in Settings to read aloud.");
      return;
    }
    stopRequested.current = false;
    setListening(true);
    setError(null);
    setTimeout(loop, 50);
  };

  const stopListening = async () => {
    stopRequested.current = true;
    setListening(false);
    try { await recorder.stop(); } catch {}
  };

  const advanceManual = () => {
    if (!story) return;
    if (index + 1 >= story.sentences.length) {
      setCompleted(true);
      return;
    }
    setIndex(index + 1);
  };

  if (!story) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c("surface"), alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={c("brand")} />
      </SafeAreaView>
    );
  }

  if (completed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top", "bottom"]}>
        <View style={{ flex: 1, padding: 24, alignItems: "center", justifyContent: "center" }}>
          <View
            style={{
              width: 96, height: 96, borderRadius: 999,
              backgroundColor: c("success"), alignItems: "center", justifyContent: "center", marginBottom: 24,
            }}
          >
            <Feather name="check" size={48} color="#fff" />
          </View>
          <H1 style={{ textAlign: "center", marginBottom: 8 }}>Story finished!</H1>
          <Body muted style={{ textAlign: "center", fontSize: 16, marginBottom: 24 }}>
            Beautiful reading. You completed "{story.title}".
          </Body>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 32 }}>
            <Stat label="Words read" value={totalWords.current} c={c} />
            <Stat label="Sentences" value={story.sentences.length} c={c} />
            <Stat
              label="Minutes"
              value={Math.max(1, Math.round((Date.now() - startedAt.current) / 60000))}
              c={c}
            />
          </View>
          <Button testID="reader-done-btn" title="Back to library" onPress={() => router.replace("/(tabs)/library")} />
          <Button title="Read again" variant="ghost" onPress={() => { setCompleted(false); setIndex(0); startedAt.current = Date.now(); totalWords.current = 0; }} style={{ marginTop: 8 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top", "bottom"]}>
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: c("border"),
      }}>
        <Pressable testID="reader-back-btn" onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={22} color={c("onSurface")} />
        </Pressable>
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          <Body muted style={{ fontSize: 11 }}>READING</Body>
          <Body style={{ fontWeight: "700" }} numberOfLines={1}>{story.title}</Body>
        </View>
        <Body muted testID="reader-progress-text">
          {index + 1}/{story.sentences.length}
        </Body>
      </View>

      <View style={{ height: 4, backgroundColor: c("surfaceTertiary") }}>
        <View style={{
          height: "100%",
          width: `${((index + 1) / story.sentences.length) * 100}%`,
          backgroundColor: c("brand"),
        }} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 24, paddingBottom: 200 }}
      >
        {story.sentences.map((s: any, i: number) => {
          const active = i === index;
          const past = i < index;
          return (
            <View
              key={i}
              onLayout={(e) => { sentenceLayouts.current[i] = e.nativeEvent.layout.y; }}
            >
              <Body
                testID={`reader-sentence-${i}`}
                style={{
                  fontSize: active ? 24 : 18,
                  lineHeight: active ? 36 : 28,
                  color: active ? c("brand") : past ? c("muted") : c("onSurface"),
                  fontWeight: active ? "700" : "400",
                  marginBottom: 16,
                }}
              >
                {s.text}
              </Body>
            </View>
          );
        })}
      </ScrollView>

      {triggered && (
        <View
          testID="reader-event-chip"
          style={{
            position: "absolute", top: 80, alignSelf: "center",
            backgroundColor: c("brand"),
            paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999,
            flexDirection: "row", alignItems: "center", gap: 8,
          }}
        >
          <Feather name={EVENT_LABELS[triggered.event_type]?.icon || "volume-2"} size={18} color="#fff" />
          <Body style={{ color: "#fff", fontWeight: "700" }}>
            {triggered.label} ✨
          </Body>
        </View>
      )}

      <View
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24,
          backgroundColor: c("surface"), borderTopWidth: 1, borderTopColor: c("border"),
        }}
      >
        {error && (
          <View style={{ marginBottom: 8, padding: 10, backgroundColor: "#fde2dd", borderRadius: 8 }}>
            <Body style={{ color: c("error"), fontSize: 13 }}>{error}</Body>
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 }}>
          <View style={{
            width: 8, height: 8, borderRadius: 999,
            backgroundColor: listening ? c("brand") : c("muted"),
          }} />
          <Body muted style={{ fontSize: 12, flex: 1 }} numberOfLines={1}>
            {listening
              ? lastTranscript
                ? `Heard: "${lastTranscript}"`
                : "Listening…"
              : "Tap mic to begin reading aloud"}
          </Body>
          {lastScore !== null && (
            <Body style={{ fontSize: 11, fontWeight: "700", color: c("brand") }}>
              {Math.round(lastScore * 100)}%
            </Body>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            testID="reader-mic-btn"
            onPress={listening ? stopListening : startListening}
            style={{
              flex: 1,
              backgroundColor: listening ? c("error") : c("brand"),
              minHeight: 56, borderRadius: RADIUS.lg,
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <Feather name={listening ? "square" : "mic"} size={22} color="#fff" />
            <Body style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              {listening ? "Stop" : "Read aloud"}
            </Body>
          </Pressable>
          <Pressable
            testID="reader-next-btn"
            onPress={advanceManual}
            style={{
              paddingHorizontal: 16,
              backgroundColor: c("surfaceSecondary"),
              borderColor: c("border"), borderWidth: 1,
              minHeight: 56, borderRadius: RADIUS.lg,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Feather name="chevron-right" size={22} color={c("onSurface")} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value, c }: { label: string; value: number; c: any }) {
  return (
    <View style={{
      backgroundColor: c("surfaceSecondary"),
      borderWidth: 1, borderColor: c("border"),
      paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: "center",
    }}>
      <Body style={{ fontWeight: "800", fontSize: 22 }}>{value}</Body>
      <Body muted style={{ fontSize: 11 }}>{label}</Body>
    </View>
  );
}
