import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, shadow, spacing, ThemeColors } from "@/src/theme";
import { api, MarketItem, User } from "@/src/utils/api";

const SECTIONS: { type: MarketItem["type"]; title: string; sub: string }[] = [
  { type: "vip", title: "VIP Membership", sub: "Unlock 3 learning languages, unlimited chats & a VIP badge" },
  { type: "badge", title: "Name Badges", sub: "Show off next to your name — 7 days" },
  { type: "frame", title: "Avatar Rings", sub: "Beautiful ring around your avatar — 7 days" },
];

export default function Market() {
  const { setUser } = useAuth();
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ coins: number; items: MarketItem[] }>("/market");
      setCoins(d.coins);
      setItems(d.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const buy = async (item: MarketItem) => {
    if (buying) return;
    if (coins < item.price) {
      Alert.alert("Not enough coins", "You need more coins to buy this item.");
      return;
    }
    setBuying(item.id);
    try {
      const res = await api.post<{ coins: number; user: User }>("/market/buy", {
        item_id: item.id,
      });
      setCoins(res.coins);
      setUser(res.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      load();
    } catch (e) {
      Alert.alert("Purchase", e instanceof Error ? e.message : "Could not buy.");
    } finally {
      setBuying(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]} testID="market-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Marketplace</Text>
          <Text style={styles.headerSub}>Spend coins on VIP, badges & rings</Text>
        </View>
        <View style={styles.wallet} testID="wallet-balance">
          <Text style={styles.walletCoin}>🪙</Text>
          <Text style={styles.walletText}>{coins}</Text>
        </View>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {SECTIONS.map((section) => (
            <View key={section.type}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionSub}>{section.sub}</Text>
              <View style={styles.grid}>
                {items
                  .filter((i) => i.type === section.type)
                  .map((item) => (
                    <View key={item.id} style={styles.card}>
                      <Text style={styles.cardEmoji}>{item.emoji}</Text>
                      <Text style={styles.cardName}>{item.name}</Text>
                      <Text style={styles.cardDesc} numberOfLines={2}>
                        {item.desc}
                      </Text>
                      {item.active ? (
                        <View style={styles.activePill} testID={`market-active-${item.id}`}>
                          <Ionicons name="checkmark" size={13} color="#FFF" />
                          <Text style={styles.activeText}>Active</Text>
                        </View>
                      ) : (
                        <Pressable
                          testID={`market-buy-${item.id}`}
                          style={[
                            styles.buyBtn,
                            coins < item.price && { opacity: 0.5 },
                          ]}
                          onPress={() => buy(item)}
                          disabled={buying === item.id}
                        >
                          {buying === item.id ? (
                            <ActivityIndicator size="small" color={colors.onBrand} />
                          ) : (
                            <Text style={styles.buyText}>🪙 {item.price}</Text>
                          )}
                        </Pressable>
                      )}
                    </View>
                  ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surfaceSecondary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    headerTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.onSurface },
    headerSub: {
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
      marginTop: 2,
    },
    wallet: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...shadow.card,
    },
    walletCoin: { fontSize: 16 },
    walletText: { fontFamily: fonts.display, fontSize: 16, color: colors.onSurface },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
    sectionTitle: {
      fontFamily: fonts.displaySemi,
      fontSize: 17,
      color: colors.onSurface,
      marginTop: spacing.md,
    },
    sectionSub: {
      fontFamily: fonts.text,
      fontSize: 12,
      color: colors.onSurfaceSecondary,
      marginBottom: spacing.md,
      marginTop: 2,
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
    card: {
      width: "47.5%",
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: 6,
      alignItems: "center",
      ...shadow.card,
    },
    cardEmoji: { fontSize: 32 },
    cardName: {
      fontFamily: fonts.textBold,
      fontSize: 14,
      color: colors.onSurface,
      textAlign: "center",
    },
    cardDesc: {
      fontFamily: fonts.text,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
      textAlign: "center",
      minHeight: 28,
    },
    buyBtn: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      minWidth: 84,
      alignItems: "center",
    },
    buyText: { fontFamily: fonts.textBold, fontSize: 13, color: colors.onBrand },
    activePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "#22C55E",
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    activeText: { fontFamily: fonts.textBold, fontSize: 12, color: "#FFF" },
  });
