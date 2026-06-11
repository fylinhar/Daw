import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";

export default function AuthScreen() {
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<"login" | "register">(
    initialMode === "login" ? "login" : "register",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const isLogin = mode === "login";

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (!isLogin && !name.trim()) {
      setError("Please enter your name");
      return;
    }
    setBusy(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, name.trim());
      }
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="auth-screen">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            testID="auth-back-btn"
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>

          <Text style={styles.title}>
            {isLogin ? "Welcome back!" : "Create your account"}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? "Log in to keep practicing with your partners."
              : "Join millions learning languages together."}
          </Text>

          {!isLogin && (
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                testID="auth-name-input"
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={colors.onSurfaceSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              testID="auth-email-input"
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.onSurfaceSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              testID="auth-password-input"
              style={styles.input}
              placeholder={isLogin ? "Your password" : "At least 6 characters"}
              placeholderTextColor={colors.onSurfaceSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {error && (
            <Text testID="auth-error-text" style={styles.error}>
              {error}
            </Text>
          )}

          <Pressable
            testID="auth-submit-btn"
            style={({ pressed }) => [
              styles.submitBtn,
              (pressed || busy) && { opacity: 0.7 },
            ]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Text style={styles.submitText}>
                {isLogin ? "Log In" : "Sign Up"}
              </Text>
            )}
          </Pressable>

          <Pressable
            testID="auth-switch-mode-btn"
            onPress={() => {
              setMode(isLogin ? "register" : "login");
              setError(null);
            }}
            style={styles.switchBtn}
          >
            <Text style={styles.switchText}>
              {isLogin
                ? "New here? Create an account"
                : "Already have an account? Log in"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.onSurface,
  },
  subtitle: {
    fontFamily: fonts.text,
    fontSize: 15,
    color: colors.onSurfaceSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.textBold,
    fontSize: 13,
    color: colors.onSurfaceTertiary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontFamily: fonts.text,
    fontSize: 15,
    color: colors.onSurface,
  },
  error: {
    color: colors.error,
    fontFamily: fonts.textSemi,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  submitBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  submitText: {
    color: colors.onBrand,
    fontFamily: fonts.textBold,
    fontSize: 16,
  },
  switchBtn: {
    alignItems: "center",
    marginTop: spacing.xl,
  },
  switchText: {
    color: colors.brand,
    fontFamily: fonts.textBold,
    fontSize: 14,
  },
});
