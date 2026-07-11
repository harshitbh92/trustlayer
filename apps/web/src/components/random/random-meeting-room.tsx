"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import type { Socket } from "socket.io-client";
import { useWebRtcCall } from "@/lib/use-webrtc-call";

interface ChatMessage {
  id: string;
  alias: string;
  content: string;
  fromMe: boolean;
}

export type MeetingStage = "preview" | "waiting" | "connecting" | "live";

interface RandomMeetingRoomProps {
  stage: MeetingStage;
  myAlias: string;
  partnerAlias?: string | null;
  previewStream: MediaStream | null;
  previewAudioEnabled: boolean;
  previewVideoEnabled: boolean;
  onTogglePreviewAudio: () => void;
  onTogglePreviewVideo: () => void;
  previewError?: string | null;
  sessionId?: string;
  socket?: Socket | null;
  messages?: ChatMessage[];
  input?: string;
  onInputChange?: (value: string) => void;
  onSend?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryBusy?: boolean;
  primaryDisabled?: boolean;
  onCancel?: () => void;
  onEnd?: () => void;
}

function VideoTile({
  stream,
  label,
  muted = false,
  large = false,
  videoEnabled = true,
  audioEnabled = true,
  placeholder = "Waiting for others…",
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  large?: boolean;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
  }, [stream]);

  const showVideo =
    videoEnabled && stream?.getVideoTracks().some((track) => track.enabled);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-zinc-900 ${
        large ? "h-full min-h-[200px] w-full" : "aspect-video w-full max-w-[220px]"
      }`}
    >
      {showVideo ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={muted}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-800 to-zinc-950 p-4">
          {label ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-xl font-semibold text-accent sm:h-20 sm:w-20 sm:text-2xl">
                {label.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-center text-sm font-medium text-zinc-200">
                {label}
              </p>
            </>
          ) : (
            <p className="text-center text-sm text-zinc-400">{placeholder}</p>
          )}
          {!audioEnabled ? (
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-300">
              Muted
            </span>
          ) : null}
        </div>
      )}
      {label ? (
        <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2 py-1 text-xs text-white backdrop-blur">
          {label}
          {!audioEnabled ? " · muted" : ""}
        </div>
      ) : null}
    </div>
  );
}

export function RandomMeetingRoom({
  stage,
  myAlias,
  partnerAlias,
  previewStream,
  previewAudioEnabled,
  previewVideoEnabled,
  onTogglePreviewAudio,
  onTogglePreviewVideo,
  previewError,
  sessionId,
  socket,
  messages = [],
  input = "",
  onInputChange,
  onSend,
  primaryLabel,
  onPrimary,
  primaryBusy,
  primaryDisabled,
  onCancel,
  onEnd,
}: RandomMeetingRoomProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const isLive = stage === "live" || stage === "connecting";

  const webrtc = useWebRtcCall({
    socket: socket ?? null,
    sessionId: sessionId ?? null,
    myAlias,
    enabled: isLive && Boolean(sessionId),
    initialStream: previewStream,
    initialAudioEnabled: previewAudioEnabled,
    initialVideoEnabled: previewVideoEnabled,
  });

  const localStream = isLive ? (webrtc.localStream ?? previewStream) : previewStream;
  const localAudio = isLive ? webrtc.audioEnabled : previewAudioEnabled;
  const localVideo = isLive ? webrtc.videoEnabled : previewVideoEnabled;
  const toggleAudio = isLive ? webrtc.toggleAudio : onTogglePreviewAudio;
  const toggleVideo = isLive ? webrtc.toggleVideo : onTogglePreviewVideo;

  const statusText =
    stage === "preview"
      ? "Ready to join"
      : stage === "waiting"
        ? "Looking for someone to join…"
        : stage === "connecting"
          ? `Connecting with ${partnerAlias ?? "partner"}…`
          : webrtc.connectionState === "connected"
            ? `In call with ${partnerAlias}`
            : `Joining ${partnerAlias ?? "partner"}…`;

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, chatOpen]);

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-zinc-950 text-zinc-100 shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div>
          <p className="text-sm font-medium text-zinc-100">Random meeting</p>
          <p className="text-xs text-zinc-400">{statusText}</p>
        </div>
        <div className="flex items-center gap-2">
          {isLive ? (
            <button
              type="button"
              onClick={() => setChatOpen((open) => !open)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
                chatOpen
                  ? "bg-accent/20 text-accent"
                  : "border border-white/10 text-zinc-200 hover:bg-white/5"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </button>
          ) : null}
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              aria-label="Leave"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4 lg:flex-row">
            <div className="relative flex flex-1 items-center justify-center rounded-2xl bg-zinc-900/50 p-2">
              {isLive && partnerAlias ? (
                <VideoTile
                  stream={webrtc.remoteStream}
                  label={partnerAlias}
                  large
                  videoEnabled={webrtc.partnerMedia.videoEnabled}
                  audioEnabled={webrtc.partnerMedia.audioEnabled}
                />
              ) : (
                <VideoTile
                  stream={null}
                  label=""
                  large
                  placeholder={
                    stage === "waiting"
                      ? "Waiting for a partner to join…"
                      : "Your partner will appear here"
                  }
                />
              )}

              {(stage === "waiting" || stage === "connecting") && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 backdrop-blur-[1px]">
                  <div className="rounded-2xl border border-white/10 bg-zinc-900/95 px-6 py-5 text-center">
                    <div className="mx-auto mb-3 h-9 w-9 animate-pulse rounded-full bg-accent/40" />
                    <p className="text-sm text-zinc-200">
                      {stage === "waiting"
                        ? "Finding someone compatible…"
                        : "Setting up audio and video…"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-3 lg:w-72">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Your name in this call
                </p>
                <p className="mt-1 text-lg font-semibold text-accent">{myAlias}</p>
                <p className="mt-2 text-xs text-zinc-400">
                  Others only see this alias — not your real profile.
                </p>
              </div>
              <VideoTile
                stream={localStream}
                label={myAlias}
                muted
                videoEnabled={localVideo}
                audioEnabled={localAudio}
              />
            </div>
          </div>

          {(previewError || webrtc.mediaError) && (
            <p className="px-4 pb-2 text-center text-sm text-rose-300">
              {previewError ?? webrtc.mediaError}
            </p>
          )}

          {stage === "preview" && (
            <div className="border-t border-white/10 px-4 py-3 text-center text-xs text-zinc-500">
              Check your camera and mic, then start the call when you&apos;re ready.
            </div>
          )}
        </div>

        {isLive && chatOpen ? (
          <aside className="flex w-full shrink-0 flex-col border-t border-white/10 bg-zinc-900/90 lg:w-80 lg:border-l lg:border-t-0">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-sm font-medium">In-call messages</p>
            </div>
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.fromMe ? "bg-accent/25 text-zinc-100" : "bg-zinc-800"
                    }`}
                  >
                    <p className="text-xs text-zinc-400">{m.alias}</p>
                    <p>{m.content}</p>
                  </div>
                </div>
              ))}
              {messages.length === 0 ? (
                <p className="text-center text-xs text-zinc-500">
                  Send a message anytime during the call.
                </p>
              ) : null}
            </div>
            <div className="border-t border-white/10 p-3">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => onInputChange?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSend?.();
                    }
                  }}
                  placeholder="Message everyone…"
                  className="input flex-1 border-white/10 bg-zinc-800 text-zinc-100"
                />
                <button type="button" onClick={onSend} className="btn-primary shrink-0">
                  Send
                </button>
              </div>
            </div>
          </aside>
        ) : null}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-zinc-900 px-4 py-4">
        <button
          type="button"
          onClick={toggleAudio}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
            localAudio ? "bg-zinc-700 hover:bg-zinc-600" : "bg-rose-600 hover:bg-rose-500"
          }`}
          aria-label={localAudio ? "Mute" : "Unmute"}
        >
          {localAudio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={toggleVideo}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
            localVideo ? "bg-zinc-700 hover:bg-zinc-600" : "bg-rose-600 hover:bg-rose-500"
          }`}
          aria-label={localVideo ? "Turn off camera" : "Turn on camera"}
        >
          {localVideo ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
        </button>

        {isLive ? (
          <button
            type="button"
            onClick={() => setChatOpen((open) => !open)}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition lg:hidden ${
              chatOpen ? "bg-accent/30 text-accent" : "bg-zinc-700 hover:bg-zinc-600"
            }`}
            aria-label="Toggle chat"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        ) : null}

        {stage === "preview" ? (
          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled || primaryBusy}
            className="btn-primary min-w-[140px] px-6 py-3"
          >
            {primaryBusy ? "Starting…" : primaryLabel}
          </button>
        ) : null}

        {isLive && onEnd ? (
          <button
            type="button"
            onClick={onEnd}
            className="flex h-12 items-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-medium hover:bg-rose-500"
          >
            <PhoneOff className="h-5 w-5" />
            Leave
          </button>
        ) : null}

        {(stage === "preview" || stage === "waiting") && onCancel ? (
          <button type="button" onClick={onCancel} className="btn-ghost text-sm text-zinc-400">
            Cancel
          </button>
        ) : null}
      </footer>
    </div>
  );
}
