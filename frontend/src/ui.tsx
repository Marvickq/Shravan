import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTheme, RADIUS } from "./theme";

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  testID,
  style,
  icon,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
  icon?: React.ReactNode;
}) {
  const { c } = useTheme();
  const bg =
    variant === "primary"
      ? c("brand")
      : variant === "secondary"
        ? c("surfaceSecondary")
        : "transparent";
  const fg = variant === "primary" ? "#FFFFFF" : c("onSurface");
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: variant === "ghost" ? c("border") : bg,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.btnText,
              { color: fg, marginLeft: icon ? 8 : 0 },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  style,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  testID?: string;
}) {
  const { c } = useTheme();
  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: c("surfaceSecondary"), borderColor: c("border") },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress)
    return (
      <Pressable testID={testID} onPress={onPress}>
        {content}
      </Pressable>
    );
  return content;
}

export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? c("brand") : c("surfaceSecondary"),
          borderColor: active ? c("brand") : c("border"),
        },
      ]}
    >
      <Text
        style={{
          color: active ? "#FFFFFF" : c("onSurface"),
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function H1({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  const { c } = useTheme();
  return (
    <Text style={[styles.h1, { color: c("onSurface") }, style]}>
      {children}
    </Text>
  );
}
export function H2({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  const { c } = useTheme();
  return (
    <Text style={[styles.h2, { color: c("onSurface") }, style]}>
      {children}
    </Text>
  );
}
export function Body({
  children,
  style,
  muted,
}: {
  children: React.ReactNode;
  style?: TextStyle;
  muted?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Text
      style={[
        styles.body,
        { color: muted ? c("muted") : c("onSurface") },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    paddingHorizontal: 24,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1,
  },
  btnText: { fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },
  card: {
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
  },
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  h1: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 22 },
});
