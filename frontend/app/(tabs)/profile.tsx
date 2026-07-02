import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { FlagIcon } from "@/src/components/FlagIcon";
import { LanguagePair } from "@/src/components/LanguagePair";
import {
  LANGUAGES,
  PROFICIENCY_LEVELS,
  langName,
} from "@/src/constants/languages";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, shadow, spacing, ThemeColors } from "@/src/theme";
import { api, User } from "@/src/utils/api";

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const { colors, mode, toggleMode } = useTheme();
  const router = useRouter();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [country, setCountry] = useState(user?.country || "");
  const [learningLang, setLearningLang] = useState(
    user?.learning_language || null,
  );
  const [proficiency, setProficiency] = useState(user?.proficiency || null);
  const [saving, setSaving] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      api
        .get<{ count: number }>("/users/me/visitors")
        .then((d) => setVisitorCount(d.count))
        .catch(() => {});
      api
        .get<User>("/auth/me")
        .then(setUser)
        .catch(() => {});
    }, [setUser]),
  );

  if (!user) return null;

  const daysMember = user.created_at
    ? Math.max(1, dayjs().diff(dayjs(user.created_at), "day") + 1)
    : 1;

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.put<User>("/users/me", {
        name: name.trim() || user.name,
        bio,
        country,
        learning_language: learningLang,
        proficiency,
      });
      setUser(updated);
      setEditing(false);
    } catch {
      // stay in edit mode for retry
    } finally {
      setSaving(false);
    }
  };

  const doLogout = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="profile-screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Me</Text>
          <Pressable
            testID={editing ? "profile-save-btn" : "profile-edit-btn"}
            onPress={() => (editing ? save() : setEditing(true))}
            style={styles.editBtn}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <Text style={styles.editBtnText}>
                {editing ? "Save" : "Edit Profile"}
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <Avatar name={user.name} url={user.avatar_url} size={80} />
          {editing ? (
            <TextInput
              testID="profile-name-input"
              style={[styles.input, styles.nameInput]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.onSurfaceSecondary}
            />
          ) : (
            <Text style={styles.name}>{user.name}</Text>
          )}
          <Text style={styles.email}>{user.email}</Text>
          <LanguagePair
            native={user.native_language}
            learning={editing ? learningLang : user.learning_language}
          />
          {user.proficiency && !editing && (
            <Text style={styles.proficiency}>
              {langName(user.learning_language)} · {user.proficiency}
            </Text>
          )}
          <View style={styles.statsRow}>
            <View style={styles.statCell} testID="profile-streak-stat">
              <View style={styles.statValueRow}>
                <Ionicons name="flame" size={16} color={colors.warning} />
                <Text style={styles.statValue}>{user.streak_count ?? 0}</Text>
              </View>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <Pressable
              testID="profile-views-stat"
              style={styles.statCell}
              onPress={() => router.push("/visitors")}
            >
              <View style={styles.statValueRow}>
                <Ionicons name="eye" size={16} color={colors.brand} />
                <Text style={styles.statValue}>{visitorCount ?? 0}</Text>
              </View>
              <Text style={styles.statLabel}>Profile Views</Text>
            </Pressable>
            <View style={styles.statDivider} />
            <View style={styles.statCell} testID="profile-days-stat">
              <View style={styles.statValueRow}>
                <Ionicons name="calendar" size={16} color={colors.success} />
                <Text style={styles.statValue}>{daysMember}</Text>
              </View>
              <Text style={styles.statLabel}>Days Member</Text>
            </View>
          </View>
        </View>

        <Text style={styles.groupLabel}>Profile details</Text>
        <View style={styles.section}>
          <Pressable
            testID="profile-views-row"
            style={styles.settingRow}
            onPress={() => router.push("/visitors")}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="eye" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Profile Views</Text>
              <Text style={styles.settingSub}>
                {visitorCount ?? 0} {visitorCount === 1 ? "person" : "people"} visited your profile
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.onSurfaceSecondary}
            />
          </Pressable>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About me</Text>
          {editing ? (
            <TextInput
              testID="profile-bio-input"
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell partners about yourself..."
              placeholderTextColor={colors.onSurfaceSecondary}
              multiline
            />
          ) : (
            <Text style={styles.bodyText}>
              {user.bio || "No bio yet. Tap Edit to add one!"}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Country</Text>
          {editing ? (
            <TextInput
              testID="profile-country-input"
              style={styles.input}
              value={country}
              onChangeText={setCountry}
              placeholder="Where are you from?"
              placeholderTextColor={colors.onSurfaceSecondary}
            />
          ) : (
            <Text style={styles.bodyText}>{user.country || "Not set"}</Text>
          )}
        </View>

        {editing && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Learning language</Text>
              <View style={styles.chipWrap}>
                {LANGUAGES.filter((l) => l.code !== user.native_language).map(
                  (lang) => {
                    const active = learningLang === lang.code;
                    return (
                      <Pressable
                        key={lang.code}
                        testID={`profile-learning-${lang.code}`}
                        onPress={() => setLearningLang(lang.code)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <FlagIcon code={lang.code} size={14} />
                        <Text
                          style={[
                            styles.chipText,
                            active && styles.chipTextActive,
                          ]}
                        >
                          {lang.name}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Level</Text>
              <View style={styles.chipWrap}>
                {PROFICIENCY_LEVELS.map((level) => {
                  const active = proficiency === level;
                  return (
                    <Pressable
                      key={level}
                      testID={`profile-level-${level.toLowerCase()}`}
                      onPress={() => setProficiency(level)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {level}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}

        <Text style={styles.groupLabel}>Settings</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="moon" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Dark mode</Text>
              <Text style={styles.settingSub}>
                {mode === "dark" ? "On — easy on the eyes" : "Off — bright & friendly"}
              </Text>
            </View>
            <Switch
              testID="dark-mode-switch"
              value={mode === "dark"}
              onValueChange={toggleMode}
              trackColor={{ false: colors.surfaceTertiary, true: colors.brand }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="language" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Native language</Text>
              <Text style={styles.settingSub}>
                {langName(user.native_language)} — partners learn this from you
              </Text>
            </View>
            <FlagIcon code={user.native_language} size={22} />
          </View>
          <View style={styles.settingDivider} />
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="school" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Learning</Text>
              <Text style={styles.settingSub}>
                {langName(user.learning_language)}
                {user.proficiency ? ` · ${user.proficiency}` : ""} — tap Edit
                Profile to change
              </Text>
            </View>
            <FlagIcon code={user.learning_language} size={22} />
          </View>
        </View>

        <Text style={styles.groupLabel}>About</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="chatbubbles" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>LinguaConnect</Text>
              <Text style={styles.settingSub}>
                Version 1.1 · Language exchange, AI tools, voice rooms & calls
              </Text>
            </View>
          </View>
        </View>

        <Pressable testID="logout-btn" style={styles.logoutBtn} onPress={doLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
    },
    scroll: {
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
      gap: spacing.lg,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTitle: {
      fontFamily: fonts.display,
      fontSize: 28,
      color: colors.onSurface,
    },
    editBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.brandTertiary,
    },
    editBtnText: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: colors.onBrandTertiary,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.xl,
      alignItems: "center",
      gap: spacing.md,
      ...shadow.card,
    },
    name: {
      fontFamily: fonts.display,
      fontSize: 22,
      color: colors.onSurface,
    },
    email: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
    },
    proficiency: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
      marginTop: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
    },
    statCell: {
      flex: 1,
      alignItems: "center",
      gap: 2,
    },
    statValueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    statValue: {
      fontFamily: fonts.display,
      fontSize: 18,
      color: colors.onSurface,
    },
    statLabel: {
      fontFamily: fonts.textSemi,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      height: 32,
      backgroundColor: colors.borderStrong,
    },
    groupLabel: {
      fontFamily: fonts.textBold,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: spacing.sm,
      marginBottom: -spacing.sm,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.sm,
      ...shadow.card,
    },
    sectionTitle: {
      fontFamily: fonts.textBold,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    bodyText: {
      fontFamily: fonts.text,
      fontSize: 15,
      lineHeight: 22,
      color: colors.onSurface,
    },
    input: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontFamily: fonts.text,
      fontSize: 15,
      color: colors.onSurface,
    },
    nameInput: {
      alignSelf: "stretch",
      textAlign: "center",
    },
    bioInput: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSecondary,
    },
    chipActive: {
      backgroundColor: colors.brandTertiary,
    },
    chipText: {
      fontFamily: fonts.textSemi,
      fontSize: 13,
      color: colors.onSurfaceTertiary,
    },
    chipTextActive: {
      color: colors.onBrandTertiary,
      fontFamily: fonts.textBold,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    settingIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.brandTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    settingTitle: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onSurface,
    },
    settingSub: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      marginTop: 1,
    },
    settingDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
      marginVertical: spacing.xs,
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      ...shadow.card,
    },
    logoutText: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.error,
    },
  });
