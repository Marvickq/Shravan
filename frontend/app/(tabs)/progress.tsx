import React, { useCallback, useState } from "react";
import { View, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { H1, H2, Body, Card } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { api } from "@/src/api";

export default function Progress() {
  const { c, RADIUS } = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setStats(await api.analytics()); } catch (e) { console.warn(e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const max = Math.max(1, ...(stats?.last_7_days?.map((d: any) => d.minutes) || [1]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c("brand")} />}
      >
        <H1 style={{ marginBottom: 4 }}>Progress</H1>
        <Body muted style={{ marginBottom: 20 }}>Keep the reading streak going.</Body>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <BigStat value={stats?.total_minutes ?? 0} label="Minutes read" icon="clock" tint={c("brand")} />
          <BigStat value={stats?.streak_days ?? 0} label="Day streak" icon="zap" tint={c("success")} />
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          <BigStat value={stats?.total_words ?? 0} label="Words read" icon="type" tint={c("brandSecondary")} />
          <BigStat value={stats?.stories_finished ?? 0} label="Stories done" icon="award" tint={c("info")} />
        </View>

        <H2 style={{ marginBottom: 12 }}>Last 7 days</H2>
        <Card>
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 140, gap: 8 }}>
            {(stats?.last_7_days || []).map((d: any, i: number) => {
              const h = Math.max(6, (d.minutes / max) * 120);
              const dt = new Date(d.date);
              return (
                <View key={i} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <Body style={{ fontSize: 11, fontWeight: "700", color: d.minutes ? c("brand") : c("muted") }}>
                    {d.minutes || ""}
                  </Body>
                  <View
                    style={{
                      width: "100%", height: h,
                      backgroundColor: d.minutes ? c("brand") : c("surfaceTertiary"),
                      borderRadius: 6,
                    }}
                  />
                  <Body muted style={{ fontSize: 10 }}>
                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dt.getDay()]}
                  </Body>
                </View>
              );
            })}
          </View>
        </Card>

        {(!stats || stats.session_count === 0) && (
          <View style={{ alignItems: "center", marginTop: 32 }}>
            <Feather name="bar-chart-2" size={40} color={c("muted")} />
            <Body muted style={{ marginTop: 12, textAlign: "center" }}>
              Start your first reading session to see progress here.
            </Body>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BigStat({ value, label, icon, tint }: any) {
  const { c, RADIUS } = useTheme();
  return (
    <View style={{
      flex: 1, padding: 16, borderRadius: RADIUS.md,
      backgroundColor: c("surfaceSecondary"), borderWidth: 1, borderColor: c("border"),
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: 8,
        backgroundColor: tint, alignItems: "center", justifyContent: "center", marginBottom: 12,
      }}>
        <Feather name={icon} size={18} color="#fff" />
      </View>
      <Body style={{ fontSize: 28, fontWeight: "800" }}>{value}</Body>
      <Body muted style={{ fontSize: 12 }}>{label}</Body>
    </View>
  );
}
