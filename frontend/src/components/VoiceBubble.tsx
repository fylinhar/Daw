import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing } from "@/src/theme";
import { audioUrl } from "@/src/utils/api";

interface VoiceBubbleProps {
  audioId: string;
  durationMs?: number | null;
  mine: boolean;
  testID?: string;
}

const formatDuration = (ms?: number | null): string => {
  const totalSec = Math.max(1, Math.round((ms || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const VoiceBubble: React.FC<VoiceBubbleProps> = ({
  audioId,
  durationMs,
  mine,
  testID,
}) => {
  const { colors } = useTheme();
  const player = useAudioPlayer(audioUrl(audioId));
  const status = useAudioPlayerStatus(player);
  const fg = mine ? colors.onBrand : colors.onSurface;

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || status.currentTime >= status.duration - 0.1) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const progress =
    status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  return (
    <View style={styles.row} testID={testID}>
      <Pressable
        testID={testID ? `${testID}-play` : undefined}
        onPress={toggle}
        style={[
          styles.playBtn,
          { backgroundColor: mine ? "rgba(255,255,255,0.25)" : colors.brandTertiary },
        ]}
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={16}
          color={mine ? colors.onBrand : colors.brand}
        />
      </Pressable>
      <View style={styles.trackWrap}>
        <View
          style={[
            styles.track,
            { backgroundColor: mine ? "rgba(255,255,255,0.3)" : colors.surfaceTertiary },
          ]}
        >
          <View
            style={[
              styles.trackFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: mine ? colors.onBrand : colors.brand,
              },
            ]}
          />
        </View>
      </View>
      <Text style={[styles.duration, { color: fg }]}>
        {formatDuration(durationMs)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 160,
    paddingVertical: 2,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  trackWrap: {
    flex: 1,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
  },
  duration: {
    fontFamily: fonts.textSemi,
    fontSize: 11,
  },
});
