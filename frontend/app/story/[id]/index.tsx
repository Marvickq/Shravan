import React, { useEffect, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { H1, H2, Body, Card, Button, Chip } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { api } from "@/src/api";

const EVENT_ICONS: Record<string, any> = {
  animal: "github",
  bird: "feather",
  weather: "cloud-rain",
  nature: "wind",
  music: "music",
  festival: "star",
  emotion: "smile",
  horror: "alert-triangle",
  character_voice: "user",
};

export default function StoryDetail() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [story, setStory] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    api.getStory(String(id)).then(setStory).catch(() => {});
    api.subscriptionStatus().then(setSub).catch(() => {});
  }, [id]);

  const startReading = () => {
    if (sub && sub.locked) {
      router.push("/subscription");
      return;
    }
    router.push(`/story/${story.id}/read`);
  };

  if (!story) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c("surface"), alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={c("brand")} />
      </SafeAreaView>
    );
  }

  const eventTypes = Array.from(new Set(story.audio_events.map((e: any) => e.event_type)));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ backgroundColor: story.cover_color || c("brand"), paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32 }}>
          <Pressable testID="story-back-btn" onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 16 }}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </Pressable>
          <View style={{
            width: 96, height: 96, borderRadius: RADIUS.md,
            backgroundColor: "rgba(255,255,255,0.18)",
            alignItems: "center", justifyContent: "center", marginBottom: 16,
          }}>
            <Feather name="book-open" size={36} color="#fff" />
          </View>
          <H1 style={{ color: "#fff" }}>{story.title}</H1>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            <Stat label="min" value={story.estimated_minutes} />
            <Stat label="sentences" value={story.sentences.length} />
            <Stat label="audio events" value={story.audio_events.length} />
          </View>
        </View>

        <View style={{ padding: 24 }}>
          <H2 style={{ marginBottom: 8 }}>What's it about?</H2>
          <Body style={{ fontSize: 16, lineHeight: 24, marginBottom: 24 }}>{story.synopsis}</Body>

          {eventTypes.length > 0 && (
            <>
              <H2 style={{ marginBottom: 12 }}>Audio effects in this story</H2>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                {eventTypes.map((t: any) => (
                  <View
                    key={t}
                    testID={`story-event-type-${t}`}
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 6,
                      backgroundColor: c("brandTertiary"),
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
                    }}
                  >
                    <Feather name={EVENT_ICONS[t] || "volume-2"} size={14} color={c("onBrandTertiary")} />
                    <Body style={{ color: c("onBrandTertiary"), fontWeight: "700", fontSize: 13 }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Body>
                  </View>
                ))}
              </View>
            </>
          )}

          <Card>
            <Body muted style={{ fontSize: 13 }}>FIRST LINE</Body>
            <Body style={{ marginTop: 8, fontSize: 16, lineHeight: 24, fontStyle: "italic" }}>
              "{story.sentences[0]?.text}"
            </Body>
          </Card>
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24,
          backgroundColor: c("surface"), borderTopWidth: 1, borderTopColor: c("border"),
        }}
      >
        <Button
          testID="story-start-reading-btn"
          title={sub && sub.locked ? "Unlock to read aloud" : "Start reading aloud"}
          onPress={startReading}
          icon={<Feather name={sub && sub.locked ? "lock" : "mic"} size={18} color="#fff" />}
        />
        {sub && !sub.premium && !sub.locked && sub.stories_remaining !== null && (
          <Body muted style={{ fontSize: 12, textAlign: "center", marginTop: 8 }}>
            {sub.stories_remaining} free {sub.stories_remaining === 1 ? "story" : "stories"} remaining
          </Body>
        )}
      </View>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
      <Body style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
        {value} {label}
      </Body>
    </View>
  );
}
