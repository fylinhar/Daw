import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { FlagIcon } from "@/src/components/FlagIcon";
import { langName } from "@/src/constants/languages";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";

interface LanguagePairProps {
  native?: string | null;
  learning?: string | null;
  compact?: boolean;
}

export const LanguagePair: React.FC<LanguagePairProps> = ({
  native,
  learning,
  compact,
}) => {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.row}>
      <View style={[styles.chip, styles.nativeChip]}>
        <FlagIcon code={native} size={14} />
        <Text style={styles.chipText}>
          {compact ? native?.toUpperCase() : langName(native)}
        </Text>
      </View>
      <Ionicons
        name="swap-horizontal"
        size={14}
        color={colors.onSurfaceSecondary}
        style={{ marginHorizontal: spacing.xs }}
      />
      <View style={[styles.chip, styles.learningChip]}>
        <FlagIcon code={learning} size={14} />
        <Text style={[styles.chipText, styles.learningText]}>
          {compact ? learning?.toUpperCase() : langName(learning)}
        </Text>
      </View>
    </View>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.pill,
    },
    nativeChip: {
      backgroundColor: colors.brandTertiary,
    },
    learningChip: {
      backgroundColor: colors.surfaceSecondary,
    },
    chipText: {
      fontSize: 12,
      fontFamily: fonts.textBold,
      color: colors.onBrandTertiary,
    },
    learningText: {
      color: colors.onSurfaceSecondary,
    },
  });
