import React, { useCallback, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { H1, H2, Body, Card, Button } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { api } from "@/src/api";

const FEATURES = [
  "Unlimited story reading & PDF uploads",
  "All audio events with immersive playback",
  "Reading analytics & weekly reports",
  "Multiple child profiles, one subscription",
  "Cancel anytime — instant access",
];

export default function Subscription() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<"monthly" | "yearly">("yearly");

  const load = useCallback(async () => {
    try { setStatus(await api.subscriptionStatus()); } catch (e) { console.warn(e); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const subscribe = async () => {
    setBusy(true);
    try {
      await api.startSubscription(plan);
      await load();
      setTimeout(() => router.back(), 800);
    } catch (e) {
      console.warn(e);
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c("surface"), alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={c("brand")} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Pressable testID="sub-back-btn" onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 16 }}>
          <Feather name="arrow-left" size={24} color={c("onSurface")} />
        </Pressable>

        {status.premium ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 999,
              backgroundColor: c("success"), alignItems: "center", justifyContent: "center", marginBottom: 16,
            }}>
              <Feather name="check" size={36} color="#fff" />
            </View>
            <H1 style={{ textAlign: "center" }}>You're a Shravan member</H1>
            <Body muted style={{ textAlign: "center", marginTop: 8 }}>
              Active until {String(status.premium_until || "").slice(0, 10) || "—"}
            </Body>
            <Button testID="sub-done-btn" title="Continue reading" onPress={() => router.back()} style={{ marginTop: 32 }} />
          </View>
        ) : (
          <>
            <View style={{
              alignSelf: "flex-start",
              backgroundColor: c("brandTertiary"),
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 16,
            }}>
              <Body style={{ color: c("onBrandTertiary"), fontWeight: "700", fontSize: 12 }}>
                {status.locked ? "Free trial used up" : `${status.stories_remaining} free stories left`}
              </Body>
            </View>
            <H1 style={{ marginBottom: 8 }}>Unlock all of Shravan</H1>
            <Body muted style={{ fontSize: 16, lineHeight: 24, marginBottom: 24 }}>
              You've finished {status.stories_finished} of your {status.free_story_limit} free stories.
              Subscribe to keep the magic going.
            </Body>

            <View style={{ gap: 8, marginBottom: 24 }}>
              {FEATURES.map((f) => (
                <View key={f} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{
                    width: 24, height: 24, borderRadius: 999,
                    backgroundColor: c("success"), alignItems: "center", justifyContent: "center",
                  }}>
                    <Feather name="check" size={14} color="#fff" />
                  </View>
                  <Body style={{ flex: 1 }}>{f}</Body>
                </View>
              ))}
            </View>

            <View style={{ gap: 12, marginBottom: 24 }}>
              {status.plans.map((p: any) => (
                <Pressable
                  key={p.id}
                  testID={`sub-plan-${p.id}`}
                  onPress={() => setPlan(p.id)}
                  style={{
                    padding: 20, borderRadius: RADIUS.md, borderWidth: 2,
                    borderColor: plan === p.id ? c("brand") : c("border"),
                    backgroundColor: plan === p.id ? c("brandTertiary") : c("surfaceSecondary"),
                    flexDirection: "row", alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Body style={{ fontWeight: "700", fontSize: 16 }}>{p.label}</Body>
                    <Body muted style={{ fontSize: 13, marginTop: 2 }}>
                      ₹{p.amount_inr} per {p.interval}
                      {p.id === "yearly" ? "  •  Save 37%" : ""}
                    </Body>
                  </View>
                  <View style={{
                    width: 22, height: 22, borderRadius: 999,
                    borderWidth: 2,
                    borderColor: plan === p.id ? c("brand") : c("muted"),
                    backgroundColor: plan === p.id ? c("brand") : "transparent",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {plan === p.id && <Feather name="check" size={12} color="#fff" />}
                  </View>
                </Pressable>
              ))}
            </View>

            <Button
              testID="sub-subscribe-btn"
              title={busy ? "Activating…" : `Subscribe ${plan === "yearly" ? "yearly" : "monthly"}`}
              onPress={subscribe}
              loading={busy}
              icon={!busy ? <Feather name="zap" size={18} color="#fff" /> : undefined}
            />
            <Body muted style={{ fontSize: 12, textAlign: "center", marginTop: 12 }}>
              Razorpay checkout is stubbed in this build. Add API keys to enable live payments.
            </Body>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
