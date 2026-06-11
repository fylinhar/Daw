import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { RoomMember } from "@/src/utils/api";

interface RoomAudioParams {
  roomId: string;
  myId: string;
  members: RoomMember[];
  sendSignal: (data: Record<string, unknown>) => void;
  subscribe: (fn: (event: any) => void) => () => void;
}

const RTC_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const webrtcAvailable = () =>
  Platform.OS === "web" &&
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices &&
  typeof (window as any).RTCPeerConnection === "function";

/**
 * Full-mesh WebRTC audio for a voice room (web only).
 * Speakers publish their mic; everyone receives. Deterministic initiator
 * (greater id offers) avoids glare. Mic toggle enables/disables the track.
 */
export function useRoomAudio({
  roomId,
  myId,
  members,
  sendSignal,
  subscribe,
}: RoomAudioParams) {
  const peersRef = useRef<Map<string, any>>(new Map());
  const audioElsRef = useRef<Map<string, any>>(new Map());
  const localStreamRef = useRef<any>(null);
  const me = members.find((m) => m.id === myId);
  const iSpeak = !!me && (me.role === "host" || me.role === "speaker");
  const micOn = !!me?.mic_on;
  const iSpeakRef = useRef(iSpeak);

  // Keep local track enabled state in sync with mic_on
  useEffect(() => {
    localStreamRef.current?.getAudioTracks?.().forEach((t: any) => {
      t.enabled = micOn;
    });
  }, [micOn]);

  // Rebuild mesh when my speaking capability changes
  useEffect(() => {
    if (!webrtcAvailable()) return;
    if (iSpeakRef.current !== iSpeak) {
      iSpeakRef.current = iSpeak;
      closeAllPeers();
      // peers re-created by the membership effect below
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iSpeak]);

  const closePeer = (peerId: string) => {
    peersRef.current.get(peerId)?.close?.();
    peersRef.current.delete(peerId);
    const el = audioElsRef.current.get(peerId);
    if (el) {
      el.srcObject = null;
      audioElsRef.current.delete(peerId);
    }
  };

  const closeAllPeers = () => {
    for (const id of Array.from(peersRef.current.keys())) closePeer(id);
  };

  const ensureLocalStream = async () => {
    if (!iSpeakRef.current) return null;
    if (!localStreamRef.current) {
      try {
        localStreamRef.current = await (
          navigator as any
        ).mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current.getAudioTracks().forEach((t: any) => {
          t.enabled = micOn;
        });
      } catch {
        return null;
      }
    }
    return localStreamRef.current;
  };

  const createPeer = async (peerId: string) => {
    const pc = new (window as any).RTCPeerConnection(RTC_CONFIG);
    peersRef.current.set(peerId, pc);
    const stream = await ensureLocalStream();
    if (stream) {
      stream.getTracks().forEach((t: any) => pc.addTrack(t, stream));
    }
    pc.onicecandidate = (e: any) => {
      if (e.candidate) {
        sendSignal({
          type: "rtc_ice",
          to: peerId,
          room_id: roomId,
          candidate: e.candidate,
        });
      }
    };
    pc.ontrack = (e: any) => {
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.srcObject = e.streams[0];
      audioElsRef.current.set(peerId, audio);
    };
    return pc;
  };

  // Connect/disconnect peers as membership changes
  useEffect(() => {
    if (!webrtcAvailable() || !me) return;
    const otherIds = new Set(
      members.filter((m) => m.id !== myId).map((m) => m.id),
    );
    // close departed
    for (const id of Array.from(peersRef.current.keys())) {
      if (!otherIds.has(id)) closePeer(id);
    }
    // initiate to new peers when I'm the designated initiator
    otherIds.forEach(async (peerId) => {
      if (peersRef.current.has(peerId)) return;
      if (myId > peerId) {
        try {
          const pc = await createPeer(peerId);
          const offer = await pc.createOffer({ offerToReceiveAudio: true });
          await pc.setLocalDescription(offer);
          sendSignal({
            type: "rtc_offer",
            to: peerId,
            room_id: roomId,
            sdp: offer,
          });
        } catch {
          closePeer(peerId);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, myId, me?.role]);

  // Handle signaling
  useEffect(() => {
    if (!webrtcAvailable()) return;
    const unsub = subscribe(async (event: any) => {
      if (event.room_id !== roomId) return;
      const from = event.from;
      try {
        if (event.type === "rtc_offer") {
          closePeer(from);
          const pc = await createPeer(from);
          await pc.setRemoteDescription(event.sdp);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({
            type: "rtc_answer",
            to: from,
            room_id: roomId,
            sdp: answer,
          });
        } else if (event.type === "rtc_answer") {
          await peersRef.current.get(from)?.setRemoteDescription(event.sdp);
        } else if (event.type === "rtc_ice") {
          await peersRef.current.get(from)?.addIceCandidate(event.candidate);
        }
      } catch {
        // signaling race; peer will retry on next membership change
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, subscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closeAllPeers();
      localStreamRef.current?.getTracks?.().forEach((t: any) => t.stop());
      localStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { audioActive: webrtcAvailable() };
}
