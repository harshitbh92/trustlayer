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
