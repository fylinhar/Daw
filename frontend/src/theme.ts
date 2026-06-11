// LinguaConnect design tokens — Tactile/Playful, HelloTalk-like sky blue.
// Light (default) + Dark palettes. Structure identical so screens swap freely.
export interface ThemeColors {
  surface: string;
  onSurface: string;
  surfaceSecondary: string;
  onSurfaceSecondary: string;
  surfaceTertiary: string;
  onSurfaceTertiary: string;
  brand: string;
  onBrand: string;
  brandSecondary: string;
  onBrandSecondary: string;
  brandTertiary: string;
  onBrandTertiary: string;
  success: string;
  warning: string;
  error: string;
  border: string;
  borderStrong: string;
  divider: string;
}

export const lightColors: ThemeColors = {
  surface: "#FFFFFF",
  onSurface: "#111827",
  surfaceSecondary: "#F4F6F8",
  onSurfaceSecondary: "#4B5563",
  surfaceTertiary: "#E5E7EB",
  onSurfaceTertiary: "#374151",
  brand: "#0EA5E9",
  onBrand: "#FFFFFF",
  brandSecondary: "#BAE6FD",
  onBrandSecondary: "#0369A1",
  brandTertiary: "#E0F2FE",
  onBrandTertiary: "#0C4A6E",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  divider: "#F3F4F6",
};

export const darkColors: ThemeColors = {
  surface: "#0F172A",
  onSurface: "#F1F5F9",
  surfaceSecondary: "#1E293B",
  onSurfaceSecondary: "#94A3B8",
  surfaceTertiary: "#334155",
  onSurfaceTertiary: "#CBD5E1",
  brand: "#38BDF8",
  onBrand: "#06283D",
  brandSecondary: "#0C4A6E",
  onBrandSecondary: "#BAE6FD",
  brandTertiary: "#0B3A55",
  onBrandTertiary: "#7DD3FC",
  success: "#34D399",
  warning: "#FBBF24",
  error: "#F87171",
  border: "#334155",
  borderStrong: "#475569",
  divider: "#1E293B",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
};

export const fonts = {
  display: "Figtree_700Bold",
  displaySemi: "Figtree_600SemiBold",
  text: "Nunito_400Regular",
  textSemi: "Nunito_600SemiBold",
  textBold: "Nunito_700Bold",
};

export const shadow = {
  card: {
    boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.08)",
  },
};
