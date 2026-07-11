"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { getIceServers } from "@/lib/webrtc-config";

export type CallConnectionState =
  | "idle"
  | "requesting-media"
  | "connecting"
  | "connected"
  | "failed";

interface UseWebRtcCallOptions {
  socket: Socket | null;
  sessionId: string | null;
  myAlias: string | null;
  enabled: boolean;
  initialStream?: MediaStream | null;
  initialAudioEnabled?: boolean;
  initialVideoEnabled?: boolean;
}

interface PartnerMediaState {
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export function useWebRtcCall({
  socket,
  sessionId,
  myAlias,
  enabled,
  initialStream = null,
  initialAudioEnabled = true,
  initialVideoEnabled = true,
}: UseWebRtcCallOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(
    initialStream,
  );
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(initialAudioEnabled);
  const [videoEnabled, setVideoEnabled] = useState(initialVideoEnabled);
  const [partnerMedia, setPartnerMedia] = useState<PartnerMediaState>({
    audioEnabled: true,
    videoEnabled: true,
  });
  const [connectionState, setConnectionState] =
    useState<CallConnectionState>("idle");
  const [mediaError, setMediaError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(initialStream);
  const ownsStreamRef = useRef(!initialStream);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const callReadySentRef = useRef(false);
  const mediaStartedRef = useRef(false);

  useEffect(() => {
    if (initialStream) {
      localStreamRef.current = initialStream;
      setLocalStream(initialStream);
      setAudioEnabled(initialAudioEnabled);
      setVideoEnabled(initialVideoEnabled);
    }
  }, [initialStream, initialAudioEnabled, initialVideoEnabled]);

  const broadcastMediaState = useCallback(
    (nextAudio: boolean, nextVideo: boolean) => {
      if (!socket?.connected || !sessionId) return;
      socket.emit("call-media-state", {
        sessionId,
        audioEnabled: nextAudio,
        videoEnabled: nextVideo,
      });
    },
    [sessionId, socket],
  );

  const stopMedia = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    if (ownsStreamRef.current) {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    setRemoteStream(null);
    setConnectionState("idle");
    callReadySentRef.current = false;
    makingOfferRef.current = false;
    ignoreOfferRef.current = false;
    mediaStartedRef.current = false;
  }, []);

  const attachLocalTracks = useCallback(
    (stream: MediaStream, pc: RTCPeerConnection) => {
      for (const track of stream.getTracks()) {
        const existing = pc
          .getSenders()
          .find((sender) => sender.track?.kind === track.kind);
        if (existing) {
          void existing.replaceTrack(track);
        } else {
          pc.addTrack(track, stream);
        }
      }
    },
    [],
  );

  const ensurePeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    pc.onicecandidate = (event) => {
      if (!event.candidate || !socket?.connected || !sessionId) return;
      socket.emit("webrtc-ice-candidate", {
        sessionId,
        candidate: event.candidate.toJSON(),
      });
    };
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) setRemoteStream(stream);
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") setConnectionState("connected");
      else if (state === "failed" || state === "disconnected") {
        setConnectionState("failed");
      } else if (state === "connecting") {
        setConnectionState("connecting");
      }
    };

    pcRef.current = pc;
    return pc;
  }, [sessionId, socket]);

  const ensurePeerConnectionWithTracks = useCallback(() => {
    const pc = ensurePeerConnection();
    const stream = localStreamRef.current;
    if (stream) attachLocalTracks(stream, pc);
    return pc;
  }, [attachLocalTracks, ensurePeerConnection]);

  const acquireLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;

    setConnectionState("requesting-media");
    setMediaError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      localStreamRef.current = stream;
      ownsStreamRef.current = true;
      setLocalStream(stream);
      setAudioEnabled(true);
      setVideoEnabled(true);
      broadcastMediaState(true, true);
      return stream;
    } catch {
      setMediaError("Camera or microphone access was denied.");
      setConnectionState("failed");
      return null;
    }
  }, [broadcastMediaState]);

  const createOffer = useCallback(async () => {
    if (!socket?.connected || !sessionId || !myAlias) return;
    const pc = ensurePeerConnectionWithTracks();
    makingOfferRef.current = true;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc-offer", { sessionId, sdp: offer });
    } catch (err) {
      console.error("WebRTC offer failed:", err);
      setConnectionState("failed");
    } finally {
      makingOfferRef.current = false;
    }
  }, [ensurePeerConnectionWithTracks, myAlias, sessionId, socket]);

  const handleRemoteOffer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      if (!socket?.connected || !sessionId) return;
      try {
        const pc = ensurePeerConnectionWithTracks();
        const offerCollision =
          makingOfferRef.current || pc.signalingState !== "stable";
        ignoreOfferRef.current = offerCollision;
        if (ignoreOfferRef.current) return;

        await pc.setRemoteDescription(sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc-answer", { sessionId, sdp: answer });
      } catch (err) {
        console.error("WebRTC answer failed:", err);
        setConnectionState("failed");
      }
    },
    [ensurePeerConnectionWithTracks, sessionId, socket],
  );

  const handleRemoteAnswer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(sdp);
      } catch (err) {
        console.error("WebRTC remote answer failed:", err);
        setConnectionState("failed");
      }
    },
    [],
  );

  const handleRemoteIce = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc || !candidate?.candidate) return;
    try {
      await pc.addIceCandidate(candidate);
    } catch {
      // Ignore stale ICE candidates during negotiation.
    }
  }, []);

  useEffect(() => {
    if (!enabled || !sessionId || !socket?.connected) return;
    if (mediaStartedRef.current) return;

    let cancelled = false;
    mediaStartedRef.current = true;

    void (async () => {
      const stream = localStreamRef.current ?? (await acquireLocalMedia());
      if (cancelled || !stream) {
        mediaStartedRef.current = false;
        return;
      }
      ensurePeerConnectionWithTracks();
      setConnectionState("connecting");
      broadcastMediaState(
        stream.getAudioTracks().every((t) => t.enabled),
        stream.getVideoTracks().every((t) => t.enabled),
      );

      if (!callReadySentRef.current) {
        callReadySentRef.current = true;
        socket.emit("call-ready", { sessionId });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    acquireLocalMedia,
    broadcastMediaState,
    enabled,
    ensurePeerConnectionWithTracks,
    sessionId,
    socket?.connected,
  ]);

  useEffect(() => {
    return () => {
      if (enabled) {
        mediaStartedRef.current = false;
        stopMedia();
      }
    };
  }, [sessionId, enabled, stopMedia]);

  useEffect(() => {
    if (!socket || !sessionId || !myAlias || !enabled) return;

    const onSignalStart = (payload: {
      sessionId: string;
      initiatorAlias: string;
    }) => {
      if (payload.sessionId !== sessionId) return;
      if (payload.initiatorAlias === myAlias) {
        void createOffer();
      }
    };

    const onOffer = (payload: {
      sessionId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (payload.sessionId !== sessionId) return;
      void handleRemoteOffer(payload.sdp);
    };

    const onAnswer = (payload: {
      sessionId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (payload.sessionId !== sessionId) return;
      void handleRemoteAnswer(payload.sdp);
    };

    const onIce = (payload: {
      sessionId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (payload.sessionId !== sessionId) return;
      void handleRemoteIce(payload.candidate);
    };

    const onPartnerReady = (payload: { sessionId: string }) => {
      if (payload.sessionId !== sessionId) return;
      if (!callReadySentRef.current) {
        callReadySentRef.current = true;
        socket.emit("call-ready", { sessionId });
      }
    };

    const onMediaState = (payload: {
      sessionId: string;
      audioEnabled: boolean;
      videoEnabled: boolean;
    }) => {
      if (payload.sessionId !== sessionId) return;
      setPartnerMedia({
        audioEnabled: payload.audioEnabled,
        videoEnabled: payload.videoEnabled,
      });
    };

    socket.on("call-signal-start", onSignalStart);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("webrtc-ice-candidate", onIce);
    socket.on("partner-call-ready", onPartnerReady);
    socket.on("call-media-state", onMediaState);

    return () => {
      socket.off("call-signal-start", onSignalStart);
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("webrtc-ice-candidate", onIce);
      socket.off("partner-call-ready", onPartnerReady);
      socket.off("call-media-state", onMediaState);
    };
  }, [
    createOffer,
    enabled,
    handleRemoteAnswer,
    handleRemoteIce,
    handleRemoteOffer,
    myAlias,
    sessionId,
    socket,
  ]);

  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !audioEnabled;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setAudioEnabled(next);
    broadcastMediaState(next, videoEnabled);
  }, [audioEnabled, broadcastMediaState, videoEnabled]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !videoEnabled;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setVideoEnabled(next);
    broadcastMediaState(audioEnabled, next);
  }, [audioEnabled, broadcastMediaState, videoEnabled]);

  return {
    localStream,
    remoteStream,
    audioEnabled,
    videoEnabled,
    partnerMedia,
    connectionState,
    mediaError,
    toggleAudio,
    toggleVideo,
    stopMedia,
  };
}
