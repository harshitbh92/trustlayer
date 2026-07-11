"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { apiFetch, API_BASE, currentAccessToken } from "@/lib/api";
import { FeedbackModal } from "@/components/feedback-modal";
import { QuestionnaireGateDialog } from "@/components/questionnaire-gate-dialog";
import {
  RandomMeetingRoom,
  type MeetingStage,
} from "@/components/random/random-meeting-room";
import { useAuth } from "@/lib/auth-context";
import { useQuestionnaireGate } from "@/lib/use-questionnaire-gate";
import { useMediaPreview } from "@/lib/use-media-preview";
import { generatePreviewAlias } from "@/lib/preview-alias";
import type { InteractionFeedbackInput } from "@trustlayer/shared";

interface SessionState {
  id: string;
  status: "WAITING" | "ACTIVE" | "ENDED";
  myAlias: string | null;
  partnerAlias: string | null;
  messages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  sessionId?: string;
  alias: string;
  content: string;
  createdAt: string;
  fromMe: boolean;
}

type Phase = "landing" | "meeting" | "ended";
type EndReason = "self" | "partner" | null;

function meetingStage(session: SessionState | null): MeetingStage {
  if (!session) return "preview";
  if (session.status === "WAITING") return "waiting";
  if (session.status === "ACTIVE" && !session.partnerAlias) return "connecting";
  if (session.status === "ACTIVE") return "live";
  return "preview";
}

export default function RandomChatPage() {
  const { user: me } = useAuth();
  const { dialogOpen, closeDialog, requireComplete } = useQuestionnaireGate();

  const [phase, setPhase] = useState<Phase>("landing");
  const [previewAlias, setPreviewAlias] = useState("");
  const [session, setSession] = useState<SessionState | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [tagsEarned, setTagsEarned] = useState<string[] | null>(null);
  const [tagsFromAi, setTagsFromAi] = useState<string[] | null>(null);
  const [endReason, setEndReason] = useState<EndReason>(null);

  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const sessionRef = useRef<SessionState | null>(null);
  const endedHandledRef = useRef(false);
  const meIdRef = useRef<string | undefined>(me?.id);

  const mediaPreview = useMediaPreview(phase === "meeting");

  sessionRef.current = session;
  meIdRef.current = me?.id;

  const displayAlias = session?.myAlias ?? previewAlias;

  const applySessionEnded = useCallback(async (endedBySelf: boolean) => {
    if (endedHandledRef.current) return;
    const sessionId = sessionRef.current?.id;
    if (!sessionId) return;

    let snapshot = sessionRef.current;
    try {
      const fresh = await apiFetch<SessionState>(`/anonymous/${sessionId}`);
      snapshot = fresh;
      sessionRef.current = fresh;
      setSession(fresh);
    } catch {
      if (!snapshot) return;
      snapshot = { ...snapshot, status: "ENDED" };
      sessionRef.current = snapshot;
      setSession(snapshot);
    }

    if (snapshot.status !== "ENDED") return;

    endedHandledRef.current = true;
    const hadPartner = Boolean(snapshot.partnerAlias);
    setEndReason(endedBySelf ? "self" : "partner");
    setPhase("ended");
    socketRef.current?.disconnect();
    socketRef.current = null;
    setSocket(null);
    if (hadPartner) setFeedbackOpen(true);
  }, []);

  const refreshSession = useCallback(async (sessionId: string) => {
    try {
      const fresh = await apiFetch<SessionState>(`/anonymous/${sessionId}`);
      sessionRef.current = fresh;
      setSession(fresh);
    } catch {
      // ignore refresh errors
    }
  }, []);

  const joinRoom = useCallback((sock: Socket, sessionId: string) => {
    sock.emit("join-session", { sessionId });
  }, []);

  const connectSocket = useCallback(
    (sessionId: string) => {
      const token = currentAccessToken();
      if (!token) return null;

      const attachHandlers = (sock: Socket) => {
        sock.off("session-joined");
        sock.off("new-message");
        sock.off("session-active");
        sock.off("session-ended");
        sock.off("error-message");
        sock.off("connect");

        sock.on("connect", () => joinRoom(sock, sessionId));

        sock.on(
          "session-joined",
          (payload: {
            sessionId: string;
            alias: string;
            status: SessionState["status"];
            messages: Omit<ChatMessage, "fromMe">[];
          }) => {
            setSession((prev) => {
              if (!prev || prev.id !== payload.sessionId) return prev;
              return {
                ...prev,
                status: payload.status,
                myAlias: payload.alias,
                messages: payload.messages.map((m) => ({
                  ...m,
                  fromMe: payload.alias === m.alias,
                })),
              };
            });
            if (payload.status === "ACTIVE") {
              void refreshSession(payload.sessionId);
            }
            if (payload.status === "ENDED") {
              void applySessionEnded(false);
            }
          },
        );

        sock.on("new-message", (msg: Omit<ChatMessage, "fromMe">) => {
          setSession((prev) => {
            if (!prev || prev.id !== msg.sessionId) return prev;
            if (prev.messages.some((m) => m.id === msg.id)) return prev;
            return {
              ...prev,
              messages: [
                ...prev.messages,
                { ...msg, fromMe: prev.myAlias === msg.alias },
              ],
            };
          });
        });

        sock.on("session-active", () => {
          void refreshSession(sessionId);
        });

        sock.on(
          "session-ended",
          (payload: { sessionId: string; endedByUserId: string }) => {
            if (sessionRef.current?.id !== payload.sessionId) return;
            const endedBySelf =
              Boolean(payload.endedByUserId) &&
              payload.endedByUserId === meIdRef.current;
            void applySessionEnded(endedBySelf);
          },
        );

        sock.on("error-message", (message: string) => {
          console.error("Chat socket:", message);
        });
      };

      let sock = socketRef.current;
      if (!sock || !sock.connected) {
        if (sock) sock.disconnect();
        sock = io(API_BASE, {
          auth: { token },
          transports: ["websocket", "polling"],
          reconnection: true,
        });
        socketRef.current = sock;
      }

      attachHandlers(sock);
      setSocket(sock);
      if (sock.connected) {
        joinRoom(sock, sessionId);
      }

      return sock;
    },
    [joinRoom, applySessionEnded, refreshSession],
  );

  function enterLobby() {
    requireComplete(() => {
      setPreviewAlias(generatePreviewAlias());
      setPhase("meeting");
      setSession(null);
      setTagsEarned(null);
      setFeedbackSubmitted(false);
      setEndReason(null);
      endedHandledRef.current = false;
    });
  }

  async function startCall() {
    requireComplete(async () => {
      setBusy(true);
      try {
        const s = await apiFetch<SessionState>("/anonymous/match", {
          method: "POST",
          body: JSON.stringify({}),
        });
        sessionRef.current = s;
        setSession(s);
        connectSocket(s.id);
      } finally {
        setBusy(false);
      }
    });
  }

  useEffect(() => {
    if (!session || session.status !== "ACTIVE") return;
    const poll = setInterval(() => {
      void (async () => {
        try {
          const s = await apiFetch<SessionState>(`/anonymous/${session.id}`);
          if (s.status === "ENDED") {
            sessionRef.current = s;
            setSession(s);
            await applySessionEnded(false);
            clearInterval(poll);
          } else {
            sessionRef.current = s;
            setSession(s);
          }
        } catch {
          // ignore polling errors
        }
      })();
    }, 2000);
    return () => clearInterval(poll);
  }, [session?.id, session?.status, applySessionEnded]);

  useEffect(() => {
    if (!session || session.status !== "WAITING") return;
    const poll = setInterval(async () => {
      try {
        const s = await apiFetch<SessionState>(`/anonymous/${session.id}`);
        if (s.status !== "WAITING") {
          sessionRef.current = s;
          setSession(s);
          connectSocket(s.id);
          clearInterval(poll);
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [session, connectSocket]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  function send() {
    if (!session || session.status !== "ACTIVE" || !input.trim()) return;
    const sock = socketRef.current;
    if (!sock?.connected) {
      connectSocket(session.id);
      return;
    }
    sock.emit("send-message", {
      sessionId: session.id,
      content: input.trim(),
    });
    setInput("");
  }

  async function leaveMeeting() {
    if (session) {
      await apiFetch(`/anonymous/${session.id}/end`, { method: "POST" });
      await applySessionEnded(true);
      return;
    }
    setPhase("landing");
    setSession(null);
    setPreviewAlias("");
  }

  async function submitFeedback(values: InteractionFeedbackInput) {
    if (!session) return;
    const res = await apiFetch<{
      tagsAwarded: string[];
      tagsFromAi?: string[];
    }>(`/anonymous/${session.id}/feedback`, {
      method: "POST",
      body: JSON.stringify(values),
    });
    setTagsEarned(res.tagsAwarded);
    setTagsFromAi(res.tagsFromAi ?? []);
    setFeedbackSubmitted(true);
    setFeedbackOpen(false);
  }

  function reset() {
    setPhase("landing");
    setSession(null);
    setPreviewAlias("");
    setInput("");
    setTagsEarned(null);
    setTagsFromAi(null);
    setFeedbackSubmitted(false);
    setEndReason(null);
    setFeedbackOpen(false);
    endedHandledRef.current = false;
  }

  const stage = meetingStage(session);
  const hadPartner = Boolean(session?.partnerAlias);
  const showLeaveFeedback =
    phase === "ended" && hadPartner && !feedbackSubmitted;

  return (
    <div className="space-y-6">
      {phase === "landing" && (
        <>
          <header>
            <h1 className="text-2xl font-semibold">Random chat</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Meet someone new over video, audio, or chat — all in one room.
              You&apos;ll get an anonymous alias; your real identity stays
              hidden.
            </p>
          </header>

          <div className="surface-elevated flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15">
              <span className="text-2xl">👋</span>
            </div>
            <h2 className="text-lg font-semibold">Ready to meet someone new?</h2>
            <p className="mt-2 max-w-sm text-sm text-muted">
              You&apos;ll preview your camera and mic first, then join a random
              partner when you&apos;re ready.
            </p>
            <button
              type="button"
              onClick={enterLobby}
              className="btn-primary mt-8 min-w-[200px] px-8 py-3 text-base"
            >
              Connect random
            </button>
          </div>
        </>
      )}

      {phase === "meeting" && displayAlias && (
        <RandomMeetingRoom
          stage={stage}
          myAlias={displayAlias}
          partnerAlias={session?.partnerAlias}
          previewStream={mediaPreview.stream}
          previewAudioEnabled={mediaPreview.audioEnabled}
          previewVideoEnabled={mediaPreview.videoEnabled}
          onTogglePreviewAudio={mediaPreview.toggleAudio}
          onTogglePreviewVideo={mediaPreview.toggleVideo}
          previewError={mediaPreview.error}
          sessionId={session?.id}
          socket={socket}
          messages={session?.messages ?? []}
          input={input}
          onInputChange={setInput}
          onSend={send}
          primaryLabel="Start call"
          onPrimary={startCall}
          primaryBusy={busy}
          primaryDisabled={Boolean(mediaPreview.error) || !mediaPreview.stream}
          onCancel={leaveMeeting}
          onEnd={session ? leaveMeeting : undefined}
        />
      )}

      {phase === "ended" && (
        <div className="surface space-y-4 p-6">
          <header>
            <h1 className="text-2xl font-semibold">Call ended</h1>
          </header>
          <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3">
            <p className="text-sm font-medium">Thanks for chatting</p>
            <p className="mt-1 text-sm text-muted">
              {endReason === "self"
                ? "You left the meeting."
                : endReason === "partner"
                  ? "Your partner left the meeting."
                  : "The meeting has ended."}
            </p>
          </div>
          {tagsEarned && tagsEarned.length > 0 && (
            <div>
              <p className="label">Tags this conversation earned them</p>
              <p className="mt-2 text-sm">
                {tagsEarned.map((t) => (
                  <span
                    key={t}
                    className={`mr-2 inline-block rounded-full border px-2.5 py-0.5 text-xs ${
                      tagsFromAi?.includes(t)
                        ? "border-sky-500/25 bg-sky-500/10 text-sky-300"
                        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {t}
                    {tagsFromAi?.includes(t) ? " · AI" : ""}
                  </span>
                ))}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {showLeaveFeedback && (
              <button
                onClick={() => setFeedbackOpen(true)}
                className="btn-ghost"
              >
                Leave feedback
              </button>
            )}
            <button onClick={reset} className="btn-primary">
              Connect random again
            </button>
          </div>
        </div>
      )}

      <FeedbackModal
        open={feedbackOpen}
        onSubmit={submitFeedback}
        onClose={() => setFeedbackOpen(false)}
      />

      <QuestionnaireGateDialog open={dialogOpen} onClose={closeDialog} />
    </div>
  );
}
