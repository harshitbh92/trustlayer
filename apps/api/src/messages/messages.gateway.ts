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
import { MessagesService } from "./messages.service";
import { publicUserInclude } from "../common/public-user.mapper";

interface AuthedSocket extends Socket {
  data: {
    userId?: string;
    conversationId?: string;
    authReady?: Promise<boolean>;
  };
}

interface JoinPayload {
  conversationId: string;
}

interface SendPayload {
  conversationId: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
}

interface DeletePayload {
  conversationId: string;
  messageId: string;
}

interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}

@WebSocketGateway({
  namespace: "/messages",
  cors: {
    origin: process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? [
      "http://localhost:3000",
    ],
    credentials: true,
  },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MessagesGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: MessagesService,
  ) {}

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

  @SubscribeMessage("join-conversation")
  async onJoin(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: JoinPayload,
  ) {
    const userId = await this.ensureAuthed(socket);
    if (!userId || !payload?.conversationId) {
      socket.emit("error-message", "Not authenticated");
      return;
    }

    try {
      await this.messages.assertParticipant(userId, payload.conversationId);
    } catch {
      socket.emit("error-message", "Not a participant");
      return;
    }

    if (
      socket.data.conversationId &&
      socket.data.conversationId !== payload.conversationId
    ) {
      await socket.leave(this.room(socket.data.conversationId));
    }

    socket.data.conversationId = payload.conversationId;
    await socket.join(this.room(payload.conversationId));

    const messages = await this.prisma.message.findMany({
      where: { conversationId: payload.conversationId },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { sender: { include: publicUserInclude } },
    });

    socket.emit("conversation-joined", {
      conversationId: payload.conversationId,
      messages: messages.map((m) =>
        this.messages.serializeMessage(m, userId, payload.conversationId),
      ),
    });
  }

  @SubscribeMessage("send-message")
  async onSend(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: SendPayload,
  ) {
    const userId = await this.ensureAuthed(socket);
    const content = payload?.content?.trim() ?? "";
    const hasMedia = Boolean(payload?.mediaUrl && payload?.mediaType);
    if (!userId || !payload?.conversationId || (!content && !hasMedia)) {
      socket.emit("error-message", "Join the conversation before sending");
      return;
    }

    try {
      const message = await this.messages.sendMessage(
        userId,
        payload.conversationId,
        {
          content,
          mediaUrl: payload.mediaUrl,
          mediaType: payload.mediaType,
        },
      );
      this.server.to(this.room(payload.conversationId)).emit("new-message", message);
    } catch {
      socket.emit("error-message", "Could not send message");
    }
  }

  @SubscribeMessage("delete-message")
  async onDelete(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: DeletePayload,
  ) {
    const userId = await this.ensureAuthed(socket);
    if (!userId || !payload?.conversationId || !payload?.messageId) {
      socket.emit("error-message", "Could not delete message");
      return;
    }

    try {
      const deleted = await this.messages.deleteMessage(
        userId,
        payload.conversationId,
        payload.messageId,
      );
      this.server
        .to(this.room(payload.conversationId))
        .emit("message-deleted", deleted);
    } catch {
      socket.emit("error-message", "Could not delete message");
    }
  }

  @SubscribeMessage("typing")
  async onTyping(
    @ConnectedSocket() socket: AuthedSocket,
    @MessageBody() payload: TypingPayload,
  ) {
    const userId = await this.ensureAuthed(socket);
    if (!userId || !payload?.conversationId) return;
    socket.to(this.room(payload.conversationId)).emit("typing", {
      userId,
      isTyping: payload.isTyping,
    });
  }

  private room(conversationId: string) {
    return `conversation:${conversationId}`;
  }
}
