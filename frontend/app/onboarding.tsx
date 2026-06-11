import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import {
  LANGUAGES,
  PROFICIENCY_LEVELS,
} from "@/src/constants/languages";
import { FlagIcon } from "@/src/components/FlagIcon";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, User } from "@/src/utils/api";

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [nativeLang, setNativeLang] = useState<string | null>(null);
  const [learningLang, setLearningLang] = useState<string | null>(null);
  const [proficiency, setProficiency] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const steps = [
    {
      title: "What's your native language?",
      subtitle: "You'll help others learn it.",
    },
    {
      title: "Which language are you learning?",
      subtitle: "We'll match you with native speakers.",
    },
    {
      title: "How good are you at it?",
      subtitle: "Be honest — everyone starts somewhere!",
    },
  ];

  const canContinue =
    (step === 0 && nativeLang) ||
    (step === 1 && learningLang) ||
    (step === 2 && proficiency);

  const next = async () => {
    setError(null);
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const updated = await api.put<User>("/users/me", {
        native_language: nativeLang,
        learning_language: learningLang,
        proficiency,
      });
      setUser(updated);
      router.replace("/(tabs)/connect");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const renderLanguageGrid = (
    selected: string | null,
    onSelect: (code: string) => void,
    excluded?: string | null,
  ) => (
    <View style={styles.grid}>
      {LANGUAGES.filter((l) => l.code !== excluded).map((lang) => {
        const active = selected === lang.code;
        return (
          <Pressable
            key={lang.code}
            testID={`onboarding-lang-${lang.code}`}
            onPress={() => onSelect(lang.code)}
            style={[styles.langChip, active && styles.langChipActive]}
          >
            <FlagIcon code={lang.code} size={20} />
            <Text
              style={[styles.langName, active && styles.langNameActive]}
            >
              {lang.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} testID="onboarding-screen">
      <View style={styles.progressRow}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[styles.progressDot, i <= step && styles.progressDotActive]}
          />
        ))}
      </View>
      <Text style={styles.title}>{steps[step].title}</Text>
      <Text style={styles.subtitle}>{steps[step].subtitle}</Text>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        {step === 0 && renderLanguageGrid(nativeLang, setNativeLang)}
        {step === 1 &&
          renderLanguageGrid(learningLang, setLearningLang, nativeLang)}
        {step === 2 && (
          <View style={{ gap: spacing.md }}>
            {PROFICIENCY_LEVELS.map((level) => {
              const active = proficiency === level;
              return (
                <Pressable
                  key={level}
                  testID={`onboarding-level-${level.toLowerCase()}`}
                  onPress={() => setProficiency(level)}
                  style={[styles.levelRow, active && styles.levelRowActive]}
                >
                  <Text
                    style={[styles.levelText, active && styles.levelTextActive]}
                  >
                    {level}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {error && (
        <Text testID="onboarding-error-text" style={styles.error}>
          {error}
        </Text>
      )}

      <View style={styles.footer}>
        {step > 0 && (
          <Pressable
            testID="onboarding-back-btn"
            onPress={() => setStep(step - 1)}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        )}
        <Pressable
          testID="onboarding-continue-btn"
          onPress={next}
          disabled={!canContinue || busy}
          style={[
            styles.continueBtn,
            (!canContinue || busy) && { opacity: 0.4 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.continueText}>
              {step === 2 ? "Start Connecting" : "Continue"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
  },
  progressRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  progressDot: {
    flex: 1,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
  },
  progressDotActive: {
    backgroundColor: colors.brand,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.onSurface,
  },
  subtitle: {
    fontFamily: fonts.text,
    fontSize: 15,
    color: colors.onSurfaceSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  langChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: "transparent",
  },
  langChipActive: {
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brand,
  },
  langFlag: {
    fontSize: 18,
  },
  langName: {
    fontFamily: fonts.textSemi,
    fontSize: 14,
    color: colors.onSurfaceTertiary,
  },
  langNameActive: {
    color: colors.onBrandTertiary,
    fontFamily: fonts.textBold,
  },
  levelRow: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: "transparent",
  },
  levelRowActive: {
    backgroundColor: colors.brandTertiary,
    borderColor: colors.brand,
  },
  levelText: {
    fontFamily: fonts.textSemi,
    fontSize: 16,
    color: colors.onSurfaceTertiary,
  },
  levelTextActive: {
    color: colors.onBrandTertiary,
    fontFamily: fonts.textBold,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.textSemi,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  backBtn: {
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  backText: {
    fontFamily: fonts.textBold,
    color: colors.onSurfaceTertiary,
    fontSize: 15,
  },
  continueBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  continueText: {
    color: colors.onBrand,
    fontFamily: fonts.textBold,
    fontSize: 16,
  },
});
