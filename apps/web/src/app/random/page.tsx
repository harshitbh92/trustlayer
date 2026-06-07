"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Smile } from "lucide-react";
import { apiFetch, API_BASE, currentAccessToken } from "@/lib/api";
import { FeedbackModal } from "@/components/feedback-modal";
import { EmojiPickerPopover } from "@/components/emoji-picker-popover";
import { QuestionnaireGateDialog } from "@/components/questionnaire-gate-dialog";
import { useAuth } from "@/lib/auth-context";
import { useQuestionnaireGate } from "@/lib/use-questionnaire-gate";
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

type EndReason = "self" | "partner" | null;

const MOODS = ["chill", "curious", "playful", "deep"];

export default function RandomChatPage() {
  const { user: me } = useAuth();
  const { dialogOpen, closeDialog, requireComplete } = useQuestionnaireGate();
  const [mood, setMood] = useState<string | undefined>();
  const [topic, setTopic] = useState("");
  const [session, setSession] = useState<SessionState | null>(null);
  const [input, setInput] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [tagsEarned, setTagsEarned] = useState<string[] | null>(null);
  const [endReason, setEndReason] = useState<EndReason>(null);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<SessionState | null>(null);
  const endedHandledRef = useRef(false);
  const meIdRef = useRef<string | undefined>(me?.id);

  sessionRef.current = session;
  meIdRef.current = me?.id;

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
    socketRef.current?.disconnect();
    socketRef.current = null;
    if (hadPartner) setFeedbackOpen(true);
  }, []);

  const joinRoom = useCallback((socket: Socket, sessionId: string) => {
    socket.emit("join-session", { sessionId });
  }, []);

  const connectSocket = useCallback(
    (sessionId: string) => {
      const token = currentAccessToken();
      if (!token) return null;

      const attachHandlers = (socket: Socket) => {
        socket.off("session-joined");
        socket.off("new-message");
        socket.off("session-active");
        socket.off("session-ended");
        socket.off("error-message");
        socket.off("connect");

        socket.on("connect", () => joinRoom(socket, sessionId));

        socket.on("session-joined", (payload: {
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
          if (payload.status === "ENDED") {
            void applySessionEnded(false);
          }
        });

        socket.on("new-message", (msg: Omit<ChatMessage, "fromMe">) => {
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

        socket.on("session-active", () => {
          setSession((prev) => (prev ? { ...prev, status: "ACTIVE" } : prev));
        });

        socket.on(
          "session-ended",
          (payload: { sessionId: string; endedByUserId: string }) => {
            if (sessionRef.current?.id !== payload.sessionId) return;
            const endedBySelf =
              Boolean(payload.endedByUserId) &&
              payload.endedByUserId === meIdRef.current;
            void applySessionEnded(endedBySelf);
          },
        );

        socket.on("error-message", (message: string) => {
          console.error("Chat socket:", message);
        });
      };

      let socket = socketRef.current;
      if (!socket || !socket.connected) {
        if (socket) socket.disconnect();
        socket = io(API_BASE, {
          auth: { token },
          transports: ["websocket", "polling"],
          reconnection: true,
        });
        socketRef.current = socket;
      }

      attachHandlers(socket);
      if (socket.connected) {
        joinRoom(socket, sessionId);
      }

      return socket;
    },
    [joinRoom, applySessionEnded],
  );

  async function findMatch() {
    requireComplete(async () => {
      setBusy(true);
      setTagsEarned(null);
      setFeedbackSubmitted(false);
      setEndReason(null);
      endedHandledRef.current = false;
      try {
        const s = await apiFetch<SessionState>("/anonymous/match", {
          method: "POST",
          body: JSON.stringify({
            mood,
            topic: topic.trim() || undefined,
          }),
        });
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
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [session?.messages.length]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  function send() {
    if (!session || session.status !== "ACTIVE" || !input.trim()) return;
    const socket = socketRef.current;
    if (!socket?.connected) {
      connectSocket(session.id);
      return;
    }
    const content = input.trim();
    socket.emit("send-message", {
      sessionId: session.id,
      content,
    });
    setInput("");
  }

  async function endChat() {
    if (!session) return;
    await apiFetch(`/anonymous/${session.id}/end`, { method: "POST" });
    await applySessionEnded(true);
  }

  async function submitFeedback(values: InteractionFeedbackInput) {
    if (!session) return;
    const res = await apiFetch<{ tagsAwarded: string[] }>(
      `/anonymous/${session.id}/feedback`,
      {
        method: "POST",
        body: JSON.stringify(values),
      },
    );
    setTagsEarned(res.tagsAwarded);
    setFeedbackSubmitted(true);
    setFeedbackOpen(false);
  }

  function reset() {
    setSession(null);
    setInput("");
    setTagsEarned(null);
    setFeedbackSubmitted(false);
    setEndReason(null);
    setFeedbackOpen(false);
    endedHandledRef.current = false;
  }

  const hadPartner = Boolean(session?.partnerAlias);
  const showLeaveFeedback =
    session?.status === "ENDED" && hadPartner && !feedbackSubmitted;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Random chat</h1>
        <p className="mt-1 text-sm text-muted">
          You'll appear as an alias. Your real identity stays hidden, but
          accountability is preserved through reports and blocks.
        </p>
      </header>

      {!session && (
        <div className="surface-elevated p-5 space-y-4">
          <div>
            <label className="label">Mood (optional)</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMood((prev) => (prev === m ? undefined : m))}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    mood === m
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border hover:border-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Topic (optional)</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input mt-2"
              placeholder="e.g. books, late-night thoughts"
              maxLength={40}
            />
          </div>
          <button onClick={findMatch} disabled={busy} className="btn-primary">
            {busy ? "Finding someone…" : "Find a conversation"}
          </button>
        </div>
      )}

      {session && session.status === "WAITING" && (
        <div className="surface p-6 text-center">
          <p className="text-sm text-muted">Waiting for someone to match…</p>
          <p className="mt-1 text-xs text-muted">You'll appear as <span className="text-accent">{session.myAlias}</span>.</p>
          <button onClick={endChat} className="btn-ghost mt-4">Cancel</button>
        </div>
      )}

      {session && session.status === "ACTIVE" && (
        <div className="surface-elevated flex h-[60vh] flex-col">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm">
                You: <span className="text-accent">{session.myAlias}</span>
              </p>
              <p className="text-xs text-muted">
                Talking with{" "}
                <span className="text-warm">{session.partnerAlias}</span>
              </p>
            </div>
            <button onClick={endChat} className="btn-ghost text-sm">
              End chat
            </button>
          </header>
          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto p-4"
          >
            {session.messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.fromMe
                      ? "bg-accent/15 border border-accent/20"
                      : "bg-surface-elevated border border-border"
                  }`}
                >
                  <p className="text-xs text-muted">{m.alias}</p>
                  <p>{m.content}</p>
                </div>
              </div>
            ))}
            {session.messages.length === 0 && (
              <p className="text-center text-xs text-muted">
                Say hello — the way you talk is what shapes your tags.
              </p>
            )}
          </div>
          <footer className="relative flex gap-2 border-t border-border p-3">
            <button
              type="button"
              onClick={() => setEmojiOpen((open) => !open)}
              className="btn-ghost shrink-0 px-3"
              aria-label="Add emoji"
            >
              <Smile className="h-5 w-5" />
            </button>
            <EmojiPickerPopover
              open={emojiOpen}
              onSelect={(emoji) => setInput((value) => `${value}${emoji}`)}
              onClose={() => setEmojiOpen(false)}
              className="bottom-full left-3"
            />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type a message…"
              maxLength={2000}
              className="input"
            />
            <button onClick={send} className="btn-primary shrink-0">
              Send
            </button>
          </footer>
        </div>
      )}

      {session && session.status === "ENDED" && (
        <div className="surface p-6 space-y-4">
          <div className="rounded-lg border border-border bg-surface-elevated px-4 py-3">
            <p className="text-sm font-medium">Call ended</p>
            <p className="mt-1 text-sm text-muted">
              {endReason === "self"
                ? "You ended the conversation."
                : endReason === "partner"
                  ? "Your partner ended the conversation."
                  : "Conversation ended."}
            </p>
          </div>
          {tagsEarned && tagsEarned.length > 0 && (
            <div>
              <p className="label">Tags this conversation earned them</p>
              <p className="mt-2 text-sm">
                {tagsEarned.map((t) => (
                  <span
                    key={t}
                    className="mr-2 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300"
                  >
                    {t}
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
              Talk to someone else
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
