import React, { useState } from "react";
import { View, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { H1, Body, Button } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function Otp() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, loading } = useAuth();
  const [code, setCode] = useState("123456");
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setErr(null);
    try {
      await verifyOtp(String(email), code);
      const u = useAuth.getState().user;
      router.replace(u?.role === "teacher" ? "/teacher/dashboard" : "/(tabs)/home");
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Pressable testID="otp-back-btn" onPress={() => router.back()} style={{ marginBottom: 16 }} hitSlop={12}>
            <Feather name="arrow-left" size={24} color={c("onSurface")} />
          </Pressable>
          <H1 style={{ marginBottom: 8 }}>Verify your email</H1>
          <Body muted style={{ marginBottom: 24, fontSize: 16 }}>
            We sent a 6-digit code to {String(email)}. Use{" "}
            <Body style={{ fontWeight: "700" }}>123456</Body> for the demo.
          </Body>

          <TextInput
            testID="otp-code-input"
            style={[styles.input, { backgroundColor: c("surfaceSecondary"), borderColor: c("border"), color: c("onSurface"), borderRadius: RADIUS.md }]}
            placeholder="123456"
            placeholderTextColor={c("muted")}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          {err && (
            <View testID="otp-error" style={{ marginTop: 16, backgroundColor: "#fde2dd", padding: 12, borderRadius: 8 }}>
              <Body style={{ color: c("error") }}>{err}</Body>
            </View>
          )}

          <Button testID="otp-verify-btn" title="Verify & Continue" onPress={onSubmit} loading={loading} style={{ marginTop: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 60, paddingHorizontal: 16, borderWidth: 1, fontSize: 22, letterSpacing: 8, textAlign: "center", fontWeight: "700" },
});
