import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";
import { verifyToken } from "../auth/jwt.util";

interface AuthedSocket extends Socket {
  data: {
    userId?: string;
    alias?: string;
    sessionId?: string;
    authReady?: Promise<boolean>;
  };
}

interface JoinPayload {
  sessionId: string;
}
interface SendPayload {
  sessionId: string;
  content: string;
}
interface TypingPayload {
  sessionId: string;
  isTyping: boolean;
}

interface CallSessionPayload {
  sessionId: string;
}

interface WebRtcSdpPayload {
  sessionId: string;
  sdp: { type: string; sdp: string };
}

interface WebRtcIcePayload {
  sessionId: string;
  candidate: {
    candidate?: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
  };
}

interface CallMediaStatePayload {
  sessionId: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? [
      "http://localhost:3000",
    ],
    credentials: true,
  },
})
export class AnonymousGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AnonymousGateway.name);
  private readonly signalingStarted = new Set<string>();

  @WebSocketServer()
  server!: Server;

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(socket: AuthedSocket) {
    socket.data.authReady = this.authenticate(socket);
  }

  private async authenticate(socket: AuthedSocket): Promise<boolean> {
    const token = (socket.handshake.auth?.token ??
      socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "")) as
      | string
      | undefined;

    if (!token) {
      socket.emit("error-message", "Missing token");
      socket.disconnect(true);
      return false;
    }
    try {
      const payload = verifyToken(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (!user) {
        socket.emit("error-message", "Unknown user");
        socket.disconnect(true);
        return false;
      }
      socket.data.userId = user.id;
      return true;
    } catch {
      socket.emit("error-message", "Invalid token");
      socket.disconnect(true);
      return false;
    }
  }

  private async ensureAuthed(socket: AuthedSocket): Promise<string | null> {
    const ready = socket.data.authReady;
    if (ready) {
      const ok = await ready;
      if (!ok) return null;
    }
    return socket.data.userId ?? null;
  }

  handleDisconnect(socket: AuthedSocket) {
    if (socket.data.sessionId) {
      this.signalingStarted.delete(socket.data.sessionId);
    }
    this.logger.debug(`socket disconnect ${socket.id}`);
  }

  @SubscribeMessage("join-session")
  async onJoin(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: JoinPayload,
  ) {
    const userId = await this.ensureAuthed(socket);
    if (!userId || !payload?.sessionId) {
      socket.emit("error-message", "Not authenticated");
      return;
    }

    const participant = await this.prisma.anonymousSessionParticipant.findUnique({
      where: { sessionId_userId: { sessionId: payload.sessionId, userId } },
    });
    if (!participant) {
      socket.emit("error-message", "Not a session participant");
      return;
    }

    if (socket.data.sessionId && socket.data.sessionId !== payload.sessionId) {
      await socket.leave(this.room(socket.data.sessionId));
    }

    socket.data.alias = participant.alias;
    socket.data.sessionId = payload.sessionId;
    await socket.join(this.room(payload.sessionId));

    const session = await this.prisma.anonymousSession.findUnique({
      where: { id: payload.sessionId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    socket.emit("session-joined", {
      sessionId: payload.sessionId,
      alias: participant.alias,
      status: session?.status ?? "WAITING",
      messages: (session?.messages ?? []).map((m) => ({
        id: m.id,
        alias: m.alias,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });

    if (session?.status === "ACTIVE") {
      this.server.to(this.room(payload.sessionId)).emit("session-active", {
        sessionId: payload.sessionId,
      });
    }

    if (session?.status === "ENDED") {
      socket.emit("session-ended", {
        sessionId: payload.sessionId,
        endedByUserId: "",
      });
    }
  }

  emitSessionEnded(sessionId: string, endedByUserId: string) {
    this.server.to(this.room(sessionId)).emit("session-ended", {
      sessionId,
      endedByUserId,
    });
  }

  emitSessionActive(sessionId: string) {
    this.server.to(this.room(sessionId)).emit("session-active", {
      sessionId,
    });
  }

  private async relayToSessionPeers(
    socket: AuthedSocket,
    sessionId: string,
    event: string,
    payload: Record<string, unknown>,
  ) {
    socket.to(this.room(sessionId)).emit(event, {
      ...payload,
      fromAlias: socket.data.alias,
    });
  }

  private async assertActiveParticipant(
    socket: AuthedSocket,
    sessionId: string,
  ): Promise<boolean> {
    const userId = await this.ensureAuthed(socket);
    if (!userId || !socket.data.alias) return false;

    const session = await this.prisma.anonymousSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.status !== "ACTIVE") return false;
    return true;
  }

  @SubscribeMessage("call-ready")
  async onCallReady(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: CallSessionPayload,
  ) {
    if (!(await this.assertActiveParticipant(socket, payload.sessionId))) return;

    await this.relayToSessionPeers(socket, payload.sessionId, "partner-call-ready", {
      sessionId: payload.sessionId,
    });

    const participants = await this.prisma.anonymousSessionParticipant.findMany({
      where: { sessionId: payload.sessionId },
      orderBy: { joinedAt: "asc" },
    });

    if (participants.length >= 2 && !this.signalingStarted.has(payload.sessionId)) {
      this.signalingStarted.add(payload.sessionId);
      const initiatorAlias = participants[0]?.alias;
      this.server.to(this.room(payload.sessionId)).emit("call-signal-start", {
        sessionId: payload.sessionId,
        initiatorAlias,
      });
    }
  }

  @SubscribeMessage("webrtc-offer")
  async onWebRtcOffer(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: WebRtcSdpPayload,
  ) {
    if (!(await this.assertActiveParticipant(socket, payload.sessionId))) return;
    await this.relayToSessionPeers(socket, payload.sessionId, "webrtc-offer", {
      sessionId: payload.sessionId,
      sdp: payload.sdp,
    });
  }

  @SubscribeMessage("webrtc-answer")
  async onWebRtcAnswer(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: WebRtcSdpPayload,
  ) {
    if (!(await this.assertActiveParticipant(socket, payload.sessionId))) return;
    await this.relayToSessionPeers(socket, payload.sessionId, "webrtc-answer", {
      sessionId: payload.sessionId,
      sdp: payload.sdp,
    });
  }

  @SubscribeMessage("webrtc-ice-candidate")
  async onWebRtcIce(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: WebRtcIcePayload,
  ) {
    if (!(await this.assertActiveParticipant(socket, payload.sessionId))) return;
    await this.relayToSessionPeers(
      socket,
      payload.sessionId,
      "webrtc-ice-candidate",
      {
        sessionId: payload.sessionId,
        candidate: payload.candidate,
      },
    );
  }

  @SubscribeMessage("call-media-state")
  async onCallMediaState(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: CallMediaStatePayload,
  ) {
    if (!(await this.assertActiveParticipant(socket, payload.sessionId))) return;
    await this.relayToSessionPeers(
      socket,
      payload.sessionId,
      "call-media-state",
      {
        sessionId: payload.sessionId,
        audioEnabled: payload.audioEnabled,
        videoEnabled: payload.videoEnabled,
      },
    );
  }

  @SubscribeMessage("send-message")
  async onSend(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: SendPayload,
  ) {
    const userId = await this.ensureAuthed(socket);
    const alias = socket.data.alias;
    if (!userId || !alias || !payload?.sessionId || !payload?.content?.trim()) {
      socket.emit("error-message", "Join the session before sending messages");
      return;
    }
    const content = payload.content.trim().slice(0, 2000);

    const session = await this.prisma.anonymousSession.findUnique({
      where: { id: payload.sessionId },
    });
    if (!session || session.status !== "ACTIVE") {
      socket.emit("error-message", "Session not active");
      return;
    }

    const message = await this.prisma.anonymousMessage.create({
      data: {
        sessionId: payload.sessionId,
        senderId: userId,
        alias,
        content,
      },
    });
    this.server.to(this.room(payload.sessionId)).emit("new-message", {
      id: message.id,
      sessionId: payload.sessionId,
      alias,
      content,
      createdAt: message.createdAt.toISOString(),
    });
  }

  @SubscribeMessage("typing")
  async onTyping(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: TypingPayload,
  ) {
    await this.ensureAuthed(socket);
    if (!socket.data.alias || !payload?.sessionId) return;
    socket.to(this.room(payload.sessionId)).emit("typing", {
      alias: socket.data.alias,
      isTyping: payload.isTyping,
    });
  }

  private room(sessionId: string) {
    return `session:${sessionId}`;
  }
}
