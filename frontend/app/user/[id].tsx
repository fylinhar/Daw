import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { LanguagePair } from "@/src/components/LanguagePair";
import { langName } from "@/src/constants/languages";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, shadow, spacing, ThemeColors } from "@/src/theme";
import { api, Conversation, User } from "@/src/utils/api";

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    api
      .get<User>(`/users/${id}`)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [id]);

  const message = async () => {
    const conv = await api.post<Conversation>("/chats", { partner_id: id });
    router.push(`/chat/${conv.id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="user-profile-screen">
      <View style={styles.header}>
        <Pressable
          testID="user-profile-back-btn"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
      </View>
      {loading || !profile ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Avatar name={profile.name} url={profile.avatar_url} size={96} />
            <Text style={styles.name}>{profile.name}</Text>
            {profile.country && (
              <Text style={styles.country}>{profile.country}</Text>
            )}
            <LanguagePair
              native={profile.native_language}
              learning={profile.learning_language}
            />
            {profile.proficiency && (
              <View style={styles.levelChip}>
                <Text style={styles.levelText}>
                  {langName(profile.learning_language)} · {profile.proficiency}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bio}>
              {profile.bio || "This partner hasn't written a bio yet."}
            </Text>
          </View>

          <Pressable
            testID="user-profile-message-btn"
            style={styles.messageBtn}
            onPress={message}
          >
            <Ionicons name="chatbubble" size={18} color={colors.onBrand} />
            <Text style={styles.messageText}>Send Message</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    ...shadow.card,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.onSurface,
  },
  country: {
    fontFamily: fonts.text,
    fontSize: 14,
    color: colors.onSurfaceSecondary,
  },
  levelChip: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs + 2,
  },
  levelText: {
    fontFamily: fonts.textSemi,
    fontSize: 13,
    color: colors.onSurfaceTertiary,
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
  bio: {
    fontFamily: fonts.text,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurface,
  },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
  },
  messageText: {
    color: colors.onBrand,
    fontFamily: fonts.textBold,
    fontSize: 16,
  },
});
