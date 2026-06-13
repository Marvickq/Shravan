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

export default function Signup() {
  const { c, RADIUS } = useTheme();
  const router = useRouter();
  const { signup, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async () => {
    setErr(null);
    if (!name || !email || password.length < 6) {
      setErr("Please fill all fields. Password must be 6+ chars.");
      return;
    }
    try {
      await signup(name.trim(), email.trim(), password);
      router.push({ pathname: "/auth/otp", params: { email: email.trim() } });
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c("surface") }} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          <Pressable testID="signup-back-btn" onPress={() => router.back()} style={{ marginBottom: 16 }} hitSlop={12}>
            <Feather name="arrow-left" size={24} color={c("onSurface")} />
          </Pressable>
          <H1 style={{ marginBottom: 8 }}>Create your account</H1>
          <Body muted style={{ marginBottom: 24, fontSize: 16 }}>
            We'll send you a one-time code to verify.
          </Body>

          {[
            { label: "Your name", value: name, set: setName, testID: "signup-name-input", placeholder: "Priya Sharma" },
            { label: "Email", value: email, set: setEmail, testID: "signup-email-input", placeholder: "parent@example.com", keyboardType: "email-address" as const },
            { label: "Password (min 6)", value: password, set: setPassword, testID: "signup-password-input", placeholder: "••••••••", secure: true },
          ].map((f, i) => (
            <View key={i}>
              <Body style={{ marginBottom: 6, marginTop: i === 0 ? 0 : 16, fontWeight: "600" }}>{f.label}</Body>
              <TextInput
                testID={f.testID}
                style={[styles.input, { backgroundColor: c("surfaceSecondary"), borderColor: c("border"), color: c("onSurface"), borderRadius: RADIUS.md }]}
                placeholder={f.placeholder}
                placeholderTextColor={c("muted")}
                value={f.value}
                onChangeText={f.set}
                autoCapitalize={f.keyboardType ? "none" : "words"}
                keyboardType={f.keyboardType || "default"}
                secureTextEntry={f.secure}
              />
            </View>
          ))}

          {err && (
            <View testID="signup-error" style={{ marginTop: 16, backgroundColor: "#fde2dd", padding: 12, borderRadius: 8 }}>
              <Body style={{ color: c("error") }}>{err}</Body>
            </View>
          )}

          <Button testID="signup-submit-btn" title="Continue" onPress={onSubmit} loading={loading} style={{ marginTop: 24 }} />
          <Button testID="signup-go-login-btn" title="I already have an account" variant="ghost" onPress={() => router.replace("/auth/login")} style={{ marginTop: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 52, paddingHorizontal: 16, borderWidth: 1, fontSize: 16 },
});
