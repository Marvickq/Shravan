/**
 * Shravan Theme - derived from /app/design_guidelines.json
 * Indian folk-art flat aesthetic. NO shadows, NO gradients.
 */
import { useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark";

export const COLORS = {
  surface: { light: "#F9F6F2", dark: "#141412" },
  onSurface: { light: "#1A1A1A", dark: "#E8E5DF" },
  surfaceSecondary: { light: "#F0EAE1", dark: "#1E1E1C" },
  onSurfaceSecondary: { light: "#2D2D2D", dark: "#D1CFC9" },
  surfaceTertiary: { light: "#E8DFD3", dark: "#2A2A28" },
  onSurfaceTertiary: { light: "#1A1A1A", dark: "#E8E5DF" },
  surfaceInverse: { light: "#141412", dark: "#F9F6F2" },
  onSurfaceInverse: { light: "#E8E5DF", dark: "#1A1A1A" },
  brand: { light: "#D85A30", dark: "#D85A30" },
  onBrand: { light: "#FFFFFF", dark: "#FFFFFF" },
  brandSecondary: { light: "#BA7517", dark: "#BA7517" },
  brandTertiary: { light: "#F2D8C9", dark: "#4A2214" },
  onBrandTertiary: { light: "#8C3A1F", dark: "#F2D8C9" },
  success: { light: "#3B6D11", dark: "#3B6D11" },
  warning: { light: "#E59F00", dark: "#E59F00" },
  error: { light: "#B73225", dark: "#B73225" },
  info: { light: "#4A6E78", dark: "#4A6E78" },
  border: { light: "#E6DFD5", dark: "#2E2E2A" },
  muted: { light: "#7A6E5C", dark: "#9A8E7C" },
};

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const RADIUS = { sm: 8, md: 12, lg: 20, pill: 999 };
export const FONTS = {
  display: "Poppins_600SemiBold",
  displayBold: "Poppins_700Bold",
  body: "Nunito_400Regular",
  bodyBold: "Nunito_700Bold",
};
export const FALLBACK_FONTS = {
  display: undefined,
  displayBold: undefined,
  body: undefined,
  bodyBold: undefined,
};
export const TYPE_SCALE = { sm: 12, base: 14, lg: 16, xl: 20, "2xl": 24, "3xl": 32 };

export function pick(mode: ThemeMode, token: keyof typeof COLORS) {
  return COLORS[token][mode];
}

export function useTheme() {
  const scheme = useColorScheme();
  const mode: ThemeMode = scheme === "dark" ? "dark" : "light";
  return {
    mode,
    c: (token: keyof typeof COLORS) => COLORS[token][mode],
    SPACING,
    RADIUS,
    FONTS,
    TYPE_SCALE,
  };
}
