import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { H1, Body, Button } from "@/src/ui";
import { useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function Login() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("demo@shravan.in");
  const [password, setPassword] = useState("Demo@1234");
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setErr(null);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setErr(e.message || "Login failed");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Pressable
            testID="login-back-btn"
            onPress={() => router.back()}
            style={{ marginBottom: 16 }}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={24} color={c("onSurface")} />
          </Pressable>
          <H1 style={{ marginBottom: 8 }}>Welcome back</H1>
          <Body muted style={{ marginBottom: 24, fontSize: 16 }}>
            Sign in to continue your story.
          </Body>

          <Body style={{ marginBottom: 6, fontWeight: "600" }}>Email</Body>
          <TextInput
            testID="login-email-input"
            style={[
              styles.input,
              {
                backgroundColor: c("surfaceSecondary"),
                borderColor: c("border"),
                color: c("onSurface"),
                borderRadius: RADIUS.md,
              },
            ]}
            placeholder="parent@example.com"
            placeholderTextColor={c("muted")}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Body style={{ marginBottom: 6, marginTop: 16, fontWeight: "600" }}>
            Password
          </Body>
          <TextInput
            testID="login-password-input"
            style={[
              styles.input,
              {
                backgroundColor: c("surfaceSecondary"),
                borderColor: c("border"),
                color: c("onSurface"),
                borderRadius: RADIUS.md,
              },
            ]}
            placeholder="••••••••"
            placeholderTextColor={c("muted")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {err && (
            <View
              testID="login-error"
              style={{
                marginTop: 16,
                backgroundColor: "#fde2dd",
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Body style={{ color: c("error") }}>{err}</Body>
            </View>
          )}

          <Button
            testID="login-submit-btn"
            title="Sign in"
            onPress={onSubmit}
            loading={loading}
            style={{ marginTop: 24 }}
          />
          <Button
            testID="login-go-signup-btn"
            title="Create new account"
            variant="ghost"
            onPress={() => router.replace("/auth/signup")}
            style={{ marginTop: 8 }}
          />

          <View
            style={{
              marginTop: 32,
              padding: 16,
              backgroundColor: c("brandTertiary"),
              borderRadius: RADIUS.md,
            }}
          >
            <Body style={{ fontWeight: "700", color: c("onBrandTertiary") }}>
              Try the demo account
            </Body>
            <Body style={{ color: c("onBrandTertiary"), fontSize: 13 }}>
              demo@shravan.in / Demo@1234
            </Body>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 16,
  },
});
