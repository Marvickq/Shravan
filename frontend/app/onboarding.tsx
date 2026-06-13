import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { Button, H1, Body, Card } from "@/src/ui";
import { useTheme } from "@/src/theme";

export default function Onboarding() {
  const { c } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c("surface") }}
      edges={["top", "bottom"]}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <View
          style={{
            backgroundColor: c("brandTertiary"),
            paddingTop: 32,
            paddingBottom: 24,
            alignItems: "center",
          }}
        >
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1599689868384-59cb2b01bb21?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTZ8MHwxfHNlYXJjaHwyfHxjaGlsZCUyMHJlYWRpbmclMjBib29rJTIwd2FybXxlbnwwfHx8fDE3ODEzNDk3OTd8MA&ixlib=rb-4.1.0&q=85",
            }}
            style={{ width: 240, height: 240, borderRadius: 12 }}
            contentFit="cover"
          />
        </View>

        <View style={{ padding: 24 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: c("brand"),
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Feather name="book-open" size={20} color="#fff" />
            </View>
            <Body style={{ color: c("brand"), fontWeight: "700" }}>
              SHRAVAN
            </Body>
          </View>
          <H1 style={{ marginBottom: 12 }}>
            Stories that listen back.
          </H1>
          <Body muted style={{ marginBottom: 32, fontSize: 16, lineHeight: 24 }}>
            Your child reads aloud. Shravan listens, follows along, and brings
            the story to life with sounds — animals, festivals, weather, music.
          </Body>

          <View style={{ gap: 12, marginBottom: 24 }}>
            <FeatureRow
              icon="mic"
              title="Real-time voice tracking"
              desc="Speech recognition follows your child sentence by sentence."
            />
            <FeatureRow
              icon="upload"
              title="Upload any PDF"
              desc="Turn family books into interactive stories instantly."
            />
            <FeatureRow
              icon="trending-up"
              title="Track reading progress"
              desc="Streaks, words read, and stories completed."
            />
          </View>

          <Button
            testID="onboarding-get-started-btn"
            title="Get Started"
            onPress={() => router.push("/auth/role")}
          />
          <Button
            testID="onboarding-login-btn"
            title="I already have an account"
            variant="ghost"
            onPress={() => router.push("/auth/login")}
            style={{ marginTop: 8 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
}: {
  icon: any;
  title: string;
  desc: string;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          backgroundColor: c("surfaceSecondary"),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={18} color={c("brand")} />
      </View>
      <View style={{ flex: 1 }}>
        <Body style={{ fontWeight: "700", marginBottom: 2 }}>{title}</Body>
        <Body muted style={{ fontSize: 13 }}>
          {desc}
        </Body>
      </View>
    </View>
  );
}
