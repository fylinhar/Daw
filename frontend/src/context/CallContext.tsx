import { Ionicons } from "@expo/vector-icons";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Avatar } from "@/src/components/Avatar";
import { useAuth } from "@/src/context/AuthContext";
import { useTheme } from "@/src/context/ThemeContext";
import { fonts, radius, spacing, ThemeColors } from "@/src/theme";
import { User, wsUrl } from "@/src/utils/api";

type SignalHandler = (event: any) => void;

interface CallState {
  status: "outgoing" | "incoming" | "active";
  peer: User;
  offerSdp?: any;
}

interface CallContextValue {
  startCall: (peer: User) => void;
  sendSignal: (data: Record<string, unknown>) => void;
  subscribe: (fn: SignalHandler) => () => void;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const webrtcAvailable = () =>
  Platform.OS === "web" &&
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices &&
  typeof (window as any).RTCPeerConnection === "function";

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const wsRef = useRef<WebSocket | null>(null);
  const subscribersRef = useRef<Set<SignalHandler>>(new Set());
  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const remoteAudioRef = useRef<any>(null);
  const callRef = useRef<CallState | null>(null);
  const [call, setCallState] = useState<CallState | null>(null);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const setCall = (c: CallState | null) => {
    callRef.current = c;
    setCallState(c);
  };

  const sendSignal = useCallback((data: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  const subscribe = useCallback((fn: SignalHandler) => {
    subscribersRef.current.add(fn);
    return () => {
      subscribersRef.current.delete(fn);
    };
  }, []);

  const cleanupMedia = () => {
    pcRef.current?.close?.();
    pcRef.current = null;
    localStreamRef.current?.getTracks?.().forEach((t: any) => t.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
    setMuted(false);
    setSeconds(0);
  };

  const createPeer = async (peerId: string) => {
    const stream = await (navigator as any).mediaDevices.getUserMedia({
      audio: true,
    });
    localStreamRef.current = stream;
    const pc = new (window as any).RTCPeerConnection(RTC_CONFIG);
    stream.getTracks().forEach((t: any) => pc.addTrack(t, stream));
    pc.onicecandidate = (e: any) => {
      if (e.candidate) {
        sendSignal({ type: "call_ice", to: peerId, candidate: e.candidate });
      }
    };
    pc.ontrack = (e: any) => {
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.srcObject = e.streams[0];
      remoteAudioRef.current = audio;
    };
    pcRef.current = pc;
    return pc;
  };

  const startCall = useCallback(
    async (peer: User) => {
      if (callRef.current) return;
      if (!webrtcAvailable()) {
        Alert.alert(
          "Audio calls",
          "Audio calling works in the web app or a development build. Voice messages work everywhere!",
        );
        return;
      }
      try {
        setCall({ status: "outgoing", peer });
        const pc = await createPeer(peer.id);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({ type: "call_offer", to: peer.id, sdp: offer });
      } catch {
        cleanupMedia();
        setCall(null);
        Alert.alert("Call failed", "Could not access the microphone.");
      }
    },
    [sendSignal],
  );

  const acceptCall = async () => {
    const current = callRef.current;
    if (!current?.offerSdp) return;
    if (!webrtcAvailable()) {
      sendSignal({ type: "call_decline", to: current.peer.id });
      setCall(null);
      Alert.alert(
        "Audio calls",
        "Audio calling works in the web app or a development build.",
      );
      return;
    }
    try {
      const pc = await createPeer(current.peer.id);
      await pc.setRemoteDescription(current.offerSdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal({ type: "call_answer", to: current.peer.id, sdp: answer });
      setCall({ ...current, status: "active" });
    } catch {
      sendSignal({ type: "call_decline", to: current.peer.id });
      cleanupMedia();
      setCall(null);
    }
  };

  const declineCall = () => {
    const current = callRef.current;
    if (current) sendSignal({ type: "call_decline", to: current.peer.id });
    cleanupMedia();
    setCall(null);
  };

  const endCall = () => {
    const current = callRef.current;
    if (current) sendSignal({ type: "call_end", to: current.peer.id });
    cleanupMedia();
    setCall(null);
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t: any) => {
      t.enabled = !next;
    });
    setMuted(next);
  };

  const handleEvent = useCallback(async (event: any) => {
    subscribersRef.current.forEach((fn) => fn(event));
    const current = callRef.current;
    switch (event.type) {
      case "call_offer":
        if (current) {
          sendSignal({ type: "call_decline", to: event.from });
          return;
        }
        setCall({
          status: "incoming",
          peer: event.caller || { id: event.from, name: "Unknown" },
          offerSdp: event.sdp,
        });
        break;
      case "call_answer":
        if (current?.status === "outgoing" && pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(event.sdp);
            setCall({ ...current, status: "active" });
          } catch {
            endCall();
          }
        }
        break;
      case "call_ice":
        if (pcRef.current && event.candidate) {
          try {
            await pcRef.current.addIceCandidate(event.candidate);
          } catch {
            // stale candidate; ignore
          }
        }
        break;
      case "call_decline":
      case "call_end":
        if (current) {
          cleanupMedia();
          setCall(null);
        }
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const ws = new WebSocket(wsUrl());
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          handleEvent(JSON.parse(e.data));
        } catch {
          // ignore malformed
        }
      };
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 3000);
      };
    };
    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [user, handleEvent]);

  useEffect(() => {
    if (call?.status !== "active") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [call?.status]);

  const styles = makeStyles(colors);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <CallContext.Provider value={{ startCall, sendSignal, subscribe }}>
      {children}
      <Modal visible={!!call} transparent animationType="fade">
        {call && (
          <View style={styles.backdrop} testID="call-overlay">
            <View style={styles.card}>
              <Avatar name={call.peer.name} url={call.peer.avatar_url} size={88} />
              <Text style={styles.name}>{call.peer.name}</Text>
              <Text style={styles.status}>
                {call.status === "incoming" && "Incoming audio call..."}
                {call.status === "outgoing" && "Calling..."}
                {call.status === "active" &&
                  `${mins}:${secs.toString().padStart(2, "0")}`}
              </Text>
              <View style={styles.actions}>
                {call.status === "incoming" && (
                  <>
                    <Pressable
                      testID="call-decline-btn"
                      style={[styles.actionBtn, styles.danger]}
                      onPress={declineCall}
                    >
                      <Ionicons name="call" size={26} color="#FFF" style={{ transform: [{ rotate: "135deg" }] }} />
                    </Pressable>
                    <Pressable
                      testID="call-accept-btn"
                      style={[styles.actionBtn, styles.accept]}
                      onPress={acceptCall}
                    >
                      <Ionicons name="call" size={26} color="#FFF" />
                    </Pressable>
                  </>
                )}
                {call.status !== "incoming" && (
                  <>
                    {call.status === "active" && (
                      <Pressable
                        testID="call-mute-btn"
                        style={[styles.actionBtn, styles.neutral]}
                        onPress={toggleMute}
                      >
                        <Ionicons
                          name={muted ? "mic-off" : "mic"}
                          size={24}
                          color={colors.onSurface}
                        />
                      </Pressable>
                    )}
                    <Pressable
                      testID="call-end-btn"
                      style={[styles.actionBtn, styles.danger]}
                      onPress={endCall}
                    >
                      <Ionicons name="call" size={26} color="#FFF" style={{ transform: [{ rotate: "135deg" }] }} />
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </View>
        )}
      </Modal>
    </CallContext.Provider>
  );
};

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(8, 25, 43, 0.72)",
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.xl,
    },
    card: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.xxl,
      alignItems: "center",
      gap: spacing.md,
    },
    name: {
      fontFamily: fonts.display,
      fontSize: 22,
      color: colors.onSurface,
    },
    status: {
      fontFamily: fonts.textSemi,
      fontSize: 14,
      color: colors.onSurfaceSecondary,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.xxl,
      marginTop: spacing.lg,
    },
    actionBtn: {
      width: 60,
      height: 60,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center",
    },
    danger: {
      backgroundColor: "#EF4444",
    },
    accept: {
      backgroundColor: "#10B981",
    },
    neutral: {
      backgroundColor: colors.surfaceSecondary,
    },
  });
