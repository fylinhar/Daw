import { Ionicons } from "@expo/vector-icons";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/src/components/Avatar";
import { VoiceBubble } from "@/src/components/VoiceBubble";
import { countryToCode } from "@/src/constants/countries";
import { langName } from "@/src/constants/languages";
import { useAuth } from "@/src/context/AuthContext";
import { useCall } from "@/src/context/CallContext";
import { useTheme } from "@/src/context/ThemeContext";
import { useChatSocket } from "@/src/hooks/use-chat-socket";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { api, Conversation, Message, mediaUrl } from "@/src/utils/api";
import { clockTime } from "@/src/utils/time";

/** RN-web's Alert.alert is a no-op — use window.alert on web so users always see feedback. */
const notify = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { colors } = useTheme();
  const { startCall } = useCall();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<
    Record<string, { corrected: string; explanation: string }>
  >({});
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [draftFixing, setDraftFixing] = useState(false);
  const [draftHint, setDraftHint] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    const load = async () => {
      try {
        const [conv, msgs] = await Promise.all([
          api.get<Conversation>(`/chats/${id}`),
          api.get<Message[]>(`/chats/${id}/messages`),
        ]);
        setConversation(conv);
        setMessages(msgs);
        api.post(`/chats/${id}/read`).catch(() => {});
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useChatSocket(
    useCallback(
      (event) => {
        if (event.type === "new_message" && event.conversation_id === id && event.message) {
          const msg = event.message as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
          );
          api.post(`/chats/${id}/read`).catch(() => {});
        }
      },
      [id],
    ),
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const msg = await api.post<Message>(`/chats/${id}/messages`, { text });
      setMessages((prev) => [...prev, msg]);
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      let perm = await AudioModule.getRecordingPermissionsAsync();
      if (!perm.granted) {
        perm = await AudioModule.requestRecordingPermissionsAsync();
      }
      if (!perm.granted) {
        if (Platform.OS !== "web" && !perm.canAskAgain) {
          Alert.alert(
            "Microphone",
            "Microphone access is disabled. Enable it in Settings to send voice messages.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
          );
        } else {
          notify(
            "Microphone",
            "Microphone permission is needed to record voice messages. Please allow microphone access and try again.",
          );
        }
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordSeconds(0);
      setRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      setRecording(false);
      notify(
        "Microphone",
        "Could not start recording. Make sure a microphone is available and allowed, then try again.",
      );
    }
  };

  const cancelRecording = async () => {
    try {
      await recorder.stop();
    } catch {
      // already stopped
    }
    setRecording(false);
  };

  const encodeAudio = async (uri: string): Promise<string> => {
    if (Platform.OS === "web") {
      const blob = await fetch(uri).then((r) => r.blob());
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    return FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  };

  const sendVoice = async () => {
    const durationMs = recordSeconds * 1000;
    setRecording(false);
    setUploadingVoice(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("No recording");
      const base64 = await encodeAudio(uri);
      const mime = Platform.OS === "web" ? "audio/webm" : "audio/m4a";
      const msg = await api.post<Message>(`/chats/${id}/voice`, {
        audio_base64: base64,
        mime,
        duration_ms: Math.max(durationMs, 1000),
      });
      setMessages((prev) => [...prev, msg]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      notify("Voice message", "Could not send the voice message. Try again.");
    } finally {
      setUploadingVoice(false);
    }
  };

  const pickImage = async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (!current.granted) {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        if (!perm.canAskAgain) {
          Alert.alert(
            "Photos",
            "Photo access is disabled. Enable it in Settings to share photos.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ],
          );
        } else {
          Alert.alert("Photos", "Photo access is needed to share images in chat.");
        }
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      base64: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64) return;
    setUploadingImage(true);
    try {
      const msg = await api.post<Message>(`/chats/${id}/image`, {
        image_base64: asset.base64,
        mime: asset.mimeType || "image/jpeg",
      });
      setMessages((prev) => [...prev, msg]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      notify("Photo", "Could not send the photo. Try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const translate = async (msg: Message) => {
    if (translations[msg.id]) {
      setTranslations((prev) => {
        const next = { ...prev };
        delete next[msg.id];
        return next;
      });
      return;
    }
    setTranslating(msg.id);
    try {
      const result = await api.post<{ translated: string }>("/ai/translate", {
        text: msg.text,
        target_language: user?.native_language || "en",
      });
      setTranslations((prev) => ({ ...prev, [msg.id]: result.translated }));
    } catch (e) {
      notify(
        "Translate",
        e instanceof Error ? e.message : "Translation failed. Try again.",
      );
    } finally {
      setTranslating(null);
    }
  };

  const correctMessage = async (msg: Message) => {
    if (corrections[msg.id]) {
      setCorrections((prev) => {
        const next = { ...prev };
        delete next[msg.id];
        return next;
      });
      return;
    }
    setCorrecting(msg.id);
    try {
      const res = await api.post<{ corrected: string; explanation: string }>(
        "/ai/correct",
        { text: msg.text },
      );
      setCorrections((prev) => ({ ...prev, [msg.id]: res }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      notify(
        "Correction",
        e instanceof Error ? e.message : "Correction failed. Try again.",
      );
    } finally {
      setCorrecting(null);
    }
  };

  const fixDraft = async () => {
    const text = draft.trim();
    if (!text || draftFixing) return;
    setDraftFixing(true);
    try {
      const res = await api.post<{ corrected: string; explanation: string }>(
        "/ai/correct",
        { text },
      );
      if (res.corrected && res.corrected !== text) {
        setDraft(res.corrected);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setDraftHint(res.explanation || "Looks perfect!");
      setTimeout(() => setDraftHint(null), 6000);
    } catch (e) {
      notify(
        "AI Check",
        e instanceof Error ? e.message : "Could not check the text. Try again.",
      );
    } finally {
      setDraftFixing(false);
    }
  };

  const partner = conversation?.partner;

  const momentsHidden = !!(
    partner?.id && (user?.hidden_moment_users || []).includes(partner.id)
  );
  const isBlocked = !!(
    partner?.id && (user?.blocked_users || []).includes(partner.id)
  );

  const toggleMuteChat = async () => {
    try {
      const res = await api.post<{ muted: boolean }>(`/chats/${id}/mute`);
      setConversation((prev) => (prev ? { ...prev, muted: res.muted } : prev));
    } catch {
      // ignore
    }
  };

  const toggleHideMoments = async () => {
    if (!partner?.id) return;
    try {
      const res = await api.post<{ hidden: boolean }>(
        `/users/${partner.id}/hide-moments`,
      );
      if (user) {
        const list = user.hidden_moment_users || [];
        setUser({
          ...user,
          hidden_moment_users: res.hidden
            ? [...list, partner.id]
            : list.filter((x) => x !== partner.id),
        });
      }
    } catch {
      // ignore
    }
  };

  const toggleBlock = () => {
    if (!partner?.id) return;
    const doToggle = async () => {
      try {
        const res = await api.post<{ blocked: boolean }>(
          `/users/${partner.id}/block`,
        );
        if (user) {
          const list = user.blocked_users || [];
          setUser({
            ...user,
            blocked_users: res.blocked
              ? [...list, partner.id]
              : list.filter((x) => x !== partner.id),
          });
        }
        setMenuOpen(false);
      } catch {
        // ignore
      }
    };
    if (isBlocked) {
      doToggle();
    } else {
      Alert.alert(
        "Block user",
        `${partner.name} won't be able to message you anymore.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Block", style: "destructive", onPress: doToggle },
        ],
      );
    }
  };

  const clearHistory = () => {
    Alert.alert("Clear chat history", "All messages will be deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/chats/${id}/messages`);
            setMessages([]);
            setMenuOpen(false);
          } catch {
            // ignore
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]} testID="chat-screen">
      <View style={styles.header}>
        <Pressable testID="chat-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        {partner && (
          <>
            <Pressable
              testID="chat-partner-header"
              style={styles.headerInfo}
              onPress={() => router.push(`/user/${partner.id}`)}
            >
              <Avatar
                name={partner.name}
                url={partner.avatar_url}
                size={38}
                flagCode={countryToCode(partner.country)}
                online={partner.is_online}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.headerName}>{partner.name}</Text>
                <Text style={styles.headerLang}>
                  Native {langName(partner.native_language)} · Learning{" "}
                  {langName(partner.learning_language)}
                </Text>
              </View>
            </Pressable>
            <Pressable
              testID="chat-call-btn"
              style={styles.callBtn}
              onPress={() => startCall(partner)}
            >
              <Ionicons name="call" size={18} color={colors.onBrand} />
            </Pressable>
            <Pressable
              testID="chat-menu-btn"
              style={styles.menuBtn}
              onPress={() => setMenuOpen(true)}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={18}
                color={colors.onSurface}
              />
            </Pressable>
          </>
        )}
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>{partner?.name}</Text>
              <Pressable
                testID="chat-menu-close-btn"
                onPress={() => setMenuOpen(false)}
                hitSlop={8}
              >
                <Ionicons name="close" size={24} color={colors.onSurfaceSecondary} />
              </Pressable>
            </View>
            <Pressable
              testID="chat-menu-profile"
              style={styles.menuRow}
              onPress={() => {
                setMenuOpen(false);
                if (partner?.id) router.push(`/user/${partner.id}`);
              }}
            >
              <Ionicons name="person-circle-outline" size={22} color={colors.brand} />
              <Text style={styles.menuText}>View profile</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceSecondary} />
            </Pressable>
            <Pressable
              testID="chat-menu-mute"
              style={styles.menuRow}
              onPress={toggleMuteChat}
            >
              <Ionicons
                name={conversation?.muted ? "notifications-off" : "notifications-outline"}
                size={21}
                color={colors.brand}
              />
              <Text style={styles.menuText}>
                {conversation?.muted ? "Unmute notifications" : "Mute notifications"}
              </Text>
              <View style={[styles.menuToggle, conversation?.muted && styles.menuToggleOn]}>
                <View style={[styles.menuThumb, conversation?.muted && styles.menuThumbOn]} />
              </View>
            </Pressable>
            <Pressable
              testID="chat-menu-hide-moments"
              style={styles.menuRow}
              onPress={toggleHideMoments}
            >
              <Ionicons
                name={momentsHidden ? "eye-off" : "eye-off-outline"}
                size={21}
                color={colors.brand}
              />
              <Text style={styles.menuText}>
                {momentsHidden ? "Show their Moments" : "Hide their Moments"}
              </Text>
              <View style={[styles.menuToggle, momentsHidden && styles.menuToggleOn]}>
                <View style={[styles.menuThumb, momentsHidden && styles.menuThumbOn]} />
              </View>
            </Pressable>
            <Pressable
              testID="chat-menu-clear"
              style={styles.menuRow}
              onPress={clearHistory}
            >
              <Ionicons name="trash-outline" size={21} color={colors.brand} />
              <Text style={styles.menuText}>Clear chat history</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceSecondary} />
            </Pressable>
            <Pressable
              testID="chat-menu-block"
              style={styles.menuRow}
              onPress={toggleBlock}
            >
              <Ionicons name="ban" size={21} color={colors.error} />
              <Text style={[styles.menuText, { color: colors.error }]}>
                {isBlocked ? "Unblock user" : "Block user"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceSecondary} />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "web" ? undefined : "translate-with-padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="hand-left-outline" size={48} color={colors.borderStrong} />
                <Text style={styles.emptyText}>
                  Say hello to {partner?.name?.split(" ")[0]}!
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const mine = item.sender_id === user?.id;
              const translated = translations[item.id];
              const correction = corrections[item.id];
              const isVoice = item.type === "voice" && item.audio_id;
              const isImage = item.type === "image" && item.image_id;
              return (
                <View
                  style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}
                >
                  <View
                    style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
                  >
                    {isVoice ? (
                      <VoiceBubble
                        testID={`voice-bubble-${item.id}`}
                        audioId={item.audio_id!}
                        durationMs={item.duration_ms}
                        mine={mine}
                      />
                    ) : isImage ? (
                      <Image
                        testID={`image-bubble-${item.id}`}
                        source={{ uri: mediaUrl(item.image_id!) }}
                        style={styles.imageBubble}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <Text
                        style={[styles.bubbleText, mine && styles.bubbleTextMine]}
                      >
                        {item.text}
                      </Text>
                    )}
                    {translated && (
                      <View style={styles.translationBox}>
                        <Text
                          style={[
                            styles.translationText,
                            mine && styles.bubbleTextMine,
                          ]}
                        >
                          {translated}
                        </Text>
                      </View>
                    )}
                    {correction && (
                      <View style={styles.correctionBox}>
                        <View style={styles.correctionHeader}>
                          <Ionicons
                            name="school"
                            size={12}
                            color={mine ? "#FFFFFF" : colors.success}
                          />
                          <Text
                            style={[
                              styles.correctionLabel,
                              mine && { color: "rgba(255,255,255,0.85)" },
                            ]}
                          >
                            Corrected
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.correctionText,
                            mine && styles.bubbleTextMine,
                          ]}
                        >
                          {correction.corrected === item.text
                            ? "✓ No mistakes found"
                            : correction.corrected}
                        </Text>
                        {correction.explanation ? (
                          <Text
                            style={[
                              styles.correctionExplain,
                              mine && { color: "rgba(255,255,255,0.75)" },
                            ]}
                          >
                            {correction.explanation}
                          </Text>
                        ) : null}
                      </View>
                    )}
                    <View style={styles.bubbleFooter}>
                      <Text
                        style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}
                      >
                        {clockTime(item.created_at)}
                      </Text>
                      {!isVoice && !isImage && (
                        <View style={styles.bubbleActions}>
                          <Pressable
                            testID={`correct-btn-${item.id}`}
                            onPress={() => correctMessage(item)}
                            hitSlop={8}
                          >
                            {correcting === item.id ? (
                              <ActivityIndicator
                                size="small"
                                color={mine ? colors.onBrand : colors.brand}
                              />
                            ) : (
                              <Ionicons
                                name="pencil"
                                size={15}
                                color={
                                  correction
                                    ? mine
                                      ? "#FFFFFF"
                                      : colors.success
                                    : mine
                                      ? "rgba(255,255,255,0.7)"
                                      : colors.onSurfaceSecondary
                                }
                              />
                            )}
                          </Pressable>
                          {!mine && (
                            <Pressable
                              testID={`translate-btn-${item.id}`}
                              onPress={() => translate(item)}
                              hitSlop={8}
                            >
                              {translating === item.id ? (
                                <ActivityIndicator size="small" color={colors.brand} />
                              ) : (
                                <Ionicons
                                  name="language"
                                  size={16}
                                  color={translated ? colors.brand : colors.onSurfaceSecondary}
                                />
                              )}
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {recording ? (
          <View style={styles.recordingBar} testID="recording-bar">
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>
              0:{recordSeconds.toString().padStart(2, "0")}
            </Text>
            <Text style={styles.recordingHint}>Recording voice message...</Text>
            <Pressable
              testID="recording-cancel-btn"
              onPress={cancelRecording}
              style={styles.recordCancel}
            >
              <Ionicons name="trash" size={20} color={colors.error} />
            </Pressable>
            <Pressable
              testID="recording-send-btn"
              onPress={sendVoice}
              style={styles.recordSend}
            >
              <Ionicons name="send" size={18} color={colors.onBrand} />
            </Pressable>
          </View>
        ) : (
          <>
            {draftHint && (
              <View style={styles.hintBar} testID="draft-hint-bar">
                <Ionicons name="sparkles" size={14} color={colors.brand} />
                <Text style={styles.hintText}>{draftHint}</Text>
                <Pressable onPress={() => setDraftHint(null)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={colors.onSurfaceSecondary} />
                </Pressable>
              </View>
            )}
          <View style={styles.inputRow}>
            <Pressable
              testID="chat-media-btn"
              onPress={pickImage}
              style={[styles.toolBtn, uploadingImage && { opacity: 0.4 }]}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={colors.brand} />
              ) : (
                <Ionicons name="add" size={24} color={colors.brand} />
              )}
            </Pressable>
            <TextInput
              testID="chat-message-input"
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={colors.onSurfaceSecondary}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            {draft.trim() ? (
              <>
                <Pressable
                  testID="chat-ai-fix-btn"
                  onPress={fixDraft}
                  style={[styles.toolBtn, draftFixing && { opacity: 0.4 }]}
                  disabled={draftFixing}
                >
                  {draftFixing ? (
                    <ActivityIndicator size="small" color={colors.brand} />
                  ) : (
                    <Ionicons name="sparkles" size={19} color={colors.brand} />
                  )}
                </Pressable>
                <Pressable
                  testID="chat-send-btn"
                  onPress={send}
                  style={[styles.sendBtn, sending && { opacity: 0.4 }]}
                  disabled={sending}
                >
                  <Ionicons name="send" size={18} color={colors.onBrand} />
                </Pressable>
              </>
            ) : (
              <Pressable
                testID="chat-record-btn"
                onPress={startRecording}
                style={[styles.sendBtn, uploadingVoice && { opacity: 0.4 }]}
                disabled={uploadingVoice}
              >
                {uploadingVoice ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <Ionicons name="mic" size={19} color={colors.onBrand} />
                )}
              </Pressable>
            )}
          </View>
          </>
        )}
      </KeyboardAvoidingView>
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
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    headerInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      flex: 1,
    },
    headerName: {
      fontFamily: fonts.displaySemi,
      fontSize: 16,
      color: colors.onSurface,
    },
    headerLang: {
      fontFamily: fonts.text,
      fontSize: 11,
      color: colors.onSurfaceSecondary,
    },
    callBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: colors.success,
      alignItems: "center",
      justifyContent: "center",
    },
    menuBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: spacing.xs,
    },
    menuBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.45)",
      justifyContent: "flex-end",
    },
    menuCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.xs,
    },
    menuHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    menuTitle: {
      fontFamily: fonts.display,
      fontSize: 19,
      color: colors.onSurface,
    },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    menuText: {
      flex: 1,
      fontFamily: fonts.textSemi,
      fontSize: 15,
      color: colors.onSurface,
    },
    menuToggle: {
      width: 40,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.borderStrong,
      padding: 2,
      justifyContent: "center",
    },
    menuToggleOn: {
      backgroundColor: colors.brand,
    },
    menuThumb: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "#FFFFFF",
    },
    menuThumbOn: {
      alignSelf: "flex-end",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      minHeight: 200,
    },
    emptyText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
    },
    messageList: {
      padding: spacing.lg,
      gap: spacing.sm,
      flexGrow: 1,
    },
    bubbleRow: {
      flexDirection: "row",
    },
    rowMine: {
      justifyContent: "flex-end",
    },
    rowTheirs: {
      justifyContent: "flex-start",
    },
    bubble: {
      maxWidth: "80%",
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      gap: spacing.xs,
    },
    bubbleMine: {
      backgroundColor: colors.brand,
      borderBottomRightRadius: radius.sm / 2,
    },
    bubbleTheirs: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: radius.sm / 2,
    },
    bubbleText: {
      fontFamily: fonts.text,
      fontSize: 15,
      lineHeight: 21,
      color: colors.onSurface,
    },
    bubbleTextMine: {
      color: colors.onBrand,
    },
    imageBubble: {
      width: 210,
      height: 210,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceTertiary,
    },
    translationBox: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: spacing.xs + 2,
    },
    translationText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      lineHeight: 20,
      color: colors.brand,
    },
    bubbleFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    bubbleActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    correctionBox: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: spacing.xs + 2,
      gap: 2,
    },
    correctionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    correctionLabel: {
      fontFamily: fonts.textBold,
      fontSize: 10,
      color: colors.success,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    correctionText: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      lineHeight: 20,
      color: colors.success,
    },
    correctionExplain: {
      fontFamily: fonts.text,
      fontSize: 12,
      lineHeight: 17,
      color: colors.onSurfaceSecondary,
      fontStyle: "italic",
    },
    hintBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      backgroundColor: colors.brandTertiary,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    hintText: {
      flex: 1,
      fontFamily: fonts.textSemi,
      fontSize: 12,
      color: colors.brand,
    },
    bubbleTime: {
      fontFamily: fonts.text,
      fontSize: 10,
      color: colors.onSurfaceSecondary,
    },
    bubbleTimeMine: {
      color: "rgba(255,255,255,0.8)",
    },
    recordingBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    recordingDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.error,
    },
    recordingTime: {
      fontFamily: fonts.textBold,
      fontSize: 15,
      color: colors.onSurface,
    },
    recordingHint: {
      flex: 1,
      fontFamily: fonts.text,
      fontSize: 13,
      color: colors.onSurfaceSecondary,
    },
    recordCancel: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    recordSend: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    toolBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.brandTertiary,
      alignItems: "center",
      justifyContent: "center",
    },
    input: {
      flex: 1,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 2,
      fontFamily: fonts.text,
      fontSize: 15,
      color: colors.onSurface,
      maxHeight: 110,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
    },
  });
