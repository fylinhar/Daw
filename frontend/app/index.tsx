import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Redirect, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";

const HERO_URL =
  "https://images.unsplash.com/photo-1669950200209-69d8292c032f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={styles.loading} testID="app-loading">
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (user) {
    if (!user.native_language || !user.learning_language) {
      return <Redirect href="/onboarding" />;
    }
    return <Redirect href="/(tabs)/connect" />;
  }

  return (
    <View style={styles.container} testID="welcome-screen">
      <Image source={{ uri: HERO_URL }} style={styles.hero} contentFit="cover" />
      <View style={styles.heroOverlay} />
      <SafeAreaView style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="chatbubbles" size={26} color={colors.onBrand} />
          </View>
          <Text style={styles.brandName}>LinguaConnect</Text>
        </View>
        <View style={styles.bottomCard}>
          <Text style={styles.title}>Speak the world&apos;s languages</Text>
          <Text style={styles.subtitle}>
            Chat with native speakers, get instant AI translations, and make
            friends across the globe.
          </Text>
          <Pressable
            testID="get-started-btn"
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: "/auth", params: { mode: "register" } })}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </Pressable>
          <Pressable
            testID="login-btn"
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: "/auth", params: { mode: "login" } })}
          >
            <Text style={styles.secondaryBtnText}>I already have an account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  hero: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12, 74, 110, 0.35)",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: "#FFFFFF",
  },
  bottomCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.onSurface,
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurfaceSecondary,
  },
  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  primaryBtnText: {
    color: colors.onBrand,
    fontFamily: fonts.textBold,
    fontSize: 16,
  },
  secondaryBtn: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: colors.brand,
    fontFamily: fonts.textBold,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.75,
  },
});
