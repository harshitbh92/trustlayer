"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useMediaPreview(active: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setError(null);
      return;
    }

    let cancelled = false;

    void navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = media;
        setStream(media);
        setAudioEnabled(true);
        setVideoEnabled(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Camera or microphone access is required for random chat.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  const toggleAudio = useCallback(() => {
    const media = streamRef.current;
    if (!media) return;
    const next = !audioEnabled;
    media.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setAudioEnabled(next);
  }, [audioEnabled]);

  const toggleVideo = useCallback(() => {
    const media = streamRef.current;
    if (!media) return;
    const next = !videoEnabled;
    media.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setVideoEnabled(next);
  }, [videoEnabled]);

  return {
    stream,
    streamRef,
    audioEnabled,
    videoEnabled,
    error,
    toggleAudio,
    toggleVideo,
  };
}
