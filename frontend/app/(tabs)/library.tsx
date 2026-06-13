import React, { useCallback, useMemo, useState } from "react";
import { View, ScrollView, FlatList, Pressable, TextInput, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { H1, H2, Body, Card, Chip, Button } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { api } from "@/src/api";

const FILTERS = ["All", "animal", "festival", "nature", "weather", "music", "bird"];

export default function Library() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const [stories, setStories] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const load = useCallback(async () => {
    try {
      const s = await api.listStories();
      setStories(s);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    return stories.filter((s) => {
      const q = query.trim().toLowerCase();
      const matchQ = !q || s.title.toLowerCase().includes(q) || s.synopsis.toLowerCase().includes(q);
      const matchF = filter === "All" || s.audio_events.some((e: any) => e.event_type === filter);
      return matchQ && matchF;
    });
  }, [stories, query, filter]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <H1>Library</H1>
          <Pressable
            testID="library-upload-btn"
            onPress={() => router.push("/upload")}
            style={{
              flexDirection: "row", alignItems: "center", gap: 6,
              backgroundColor: c("brand"), paddingHorizontal: 14, paddingVertical: 10,
              borderRadius: RADIUS.lg,
            }}
          >
            <Feather name="upload" size={16} color="#fff" />
            <Body style={{ color: "#fff", fontWeight: "700" }}>Upload</Body>
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: c("surfaceSecondary"),
            borderRadius: RADIUS.md, borderWidth: 1, borderColor: c("border"),
            paddingHorizontal: 14, marginBottom: 12,
          }}
        >
          <Feather name="search" size={18} color={c("muted")} />
          <TextInput
            testID="library-search-input"
            placeholder="Search stories"
            placeholderTextColor={c("muted")}
            value={query}
            onChangeText={setQuery}
            style={{ flex: 1, height: 48, color: c("onSurface"), fontSize: 15 }}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingBottom: 12 }}
          style={{ marginHorizontal: -16, paddingHorizontal: 16 }}
        >
          {FILTERS.map((f) => (
            <Chip
              key={f}
              testID={`library-filter-${f}`}
              label={f === "All" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              active={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 32, paddingTop: 4 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", padding: 32 }}>
            <Feather name="book-open" size={40} color={c("muted")} />
            <Body muted style={{ marginTop: 12 }}>No stories match your filter.</Body>
          </View>
        }
        renderItem={({ item }) => (
          <Card
            testID={`library-story-${item.id}`}
            onPress={() => router.push(`/story/${item.id}`)}
            style={{ flex: 1, padding: 0, overflow: "hidden" }}
          >
            <View style={{ aspectRatio: 1, backgroundColor: item.cover_color, padding: 12, justifyContent: "space-between" }}>
              <Feather name="book" size={20} color="#fff" />
              <View>
                <Body style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                  {item.estimated_minutes} min
                </Body>
              </View>
            </View>
            <View style={{ padding: 12 }}>
              <Body style={{ fontWeight: "700" }} numberOfLines={2}>{item.title}</Body>
              <Body muted style={{ fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                {item.audio_events.length} audio events
              </Body>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
