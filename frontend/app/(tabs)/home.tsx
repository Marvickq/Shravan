import React, { useCallback, useState } from "react";
import { View, ScrollView, RefreshControl, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { H1, H2, Body, Card } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";

export default function Home() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([api.listStories(), api.analytics()]);
      setStories(s);
      setStats(a);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const featured = stories[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c("brand")} />}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
          <View style={{ flex: 1 }}>
            <Body muted>Namaste,</Body>
            <H1 testID="home-greeting">{user?.name || "Reader"}</H1>
          </View>
          <View
            style={{
              width: 48, height: 48, borderRadius: 999,
              backgroundColor: c("brand"), alignItems: "center", justifyContent: "center",
            }}
          >
            <Body style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>
              {(user?.name || "?").charAt(0).toUpperCase()}
            </Body>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          <StatTile icon="clock" label="Minutes" value={stats?.total_minutes ?? 0} color={c("brand")} />
          <StatTile icon="zap" label="Day streak" value={stats?.streak_days ?? 0} color={c("success")} />
          <StatTile icon="check-circle" label="Finished" value={stats?.stories_finished ?? 0} color={c("brandSecondary")} />
        </View>

        {featured && (
          <Pressable
            testID="home-featured-card"
            onPress={() => router.push(`/story/${featured.id}`)}
            style={{
              backgroundColor: featured.cover_color || c("brand"),
              borderRadius: RADIUS.md,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <Body style={{ color: "#fff", opacity: 0.85, fontWeight: "700" }}>FEATURED STORY</Body>
            <H1 style={{ color: "#fff", marginTop: 8, marginBottom: 8 }}>{featured.title}</H1>
            <Body style={{ color: "#fff", opacity: 0.92, marginBottom: 16 }}>
              {featured.synopsis}
            </Body>
            <View
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.18)",
                paddingHorizontal: 14, paddingVertical: 10,
                borderRadius: 999, gap: 8,
              }}
            >
              <Body
                testID="home-featured-open-btn"
                style={{ color: "#fff", fontWeight: "700" }}
              >
                Open story
              </Body>
              <Feather name="arrow-right" size={16} color="#fff" />
            </View>
          </Pressable>
        )}

        <H2 style={{ marginBottom: 12 }}>Suggested for you</H2>
        <FlatList
          data={stories.slice(1)}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ gap: 12, paddingRight: 16 }}
          renderItem={({ item }) => (
            <Card
              testID={`home-story-${item.id}`}
              onPress={() => router.push(`/story/${item.id}`)}
              style={{ width: 200, padding: 0, overflow: "hidden" }}
            >
              <View style={{ height: 120, backgroundColor: item.cover_color, justifyContent: "flex-end", padding: 12 }}>
                <Feather name="book" size={20} color="#fff" />
              </View>
              <View style={{ padding: 12 }}>
                <Body style={{ fontWeight: "700" }} numberOfLines={2}>{item.title}</Body>
                <Body muted style={{ fontSize: 12, marginTop: 4 }}>
                  {item.estimated_minutes} min • {item.audio_events.length} sounds
                </Body>
              </View>
            </Card>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ icon, label, value, color }: any) {
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
