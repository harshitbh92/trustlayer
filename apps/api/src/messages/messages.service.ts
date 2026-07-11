import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  publicUserInclude,
  toPublicUser,
} from "../common/public-user.mapper";
import {
  isMessageReactionEmoji,
  MESSAGE_DELETE_WINDOW_MS,
  type CreateConversationInput,
  type MessageReactionInput,
  type SendMessageInput,
} from "@trustlayer/shared";
import { assertCanMessage } from "./messages.util";

type MessageWithRelations = {
  id: string;
  conversationId?: string;
  senderId: string;
  replyToId: string | null;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  deletedAt: Date | null;
  createdAt: Date;
  sender: Parameters<typeof toPublicUser>[0];
  replyTo?: {
    id: string;
    content: string;
    mediaUrl: string | null;
    mediaType: string | null;
    deletedAt: Date | null;
    sender: Parameters<typeof toPublicUser>[0];
  } | null;
  reactions?: { userId: string; emoji: string }[];
};

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listInbox(userId: string) {
    const [connections, participations] = await Promise.all([
      this.prisma.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: userId }, { receiverId: userId }],
        },
        include: {
          requester: { include: publicUserInclude },
          receiver: { include: publicUserInclude },
        },
      }),
      this.prisma.conversationParticipant.findMany({
        where: { userId },
        include: {
          conversation: {
            include: {
              participants: { select: { userId: true } },
              messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    const convByOtherUserId = new Map<
      string,
      {
        conversationId: string;
        updatedAt: Date;
        lastReadAt: Date | null;
        lastMessage: (typeof participations)[0]["conversation"]["messages"][0] | null;
      }
    >();

    for (const p of participations) {
      const otherId = p.conversation.participants.find(
        (x) => x.userId !== userId,
      )?.userId;
      if (!otherId) continue;
      convByOtherUserId.set(otherId, {
        conversationId: p.conversationId,
        updatedAt: p.conversation.updatedAt,
        lastReadAt: p.lastReadAt,
        lastMessage: p.conversation.messages[0] ?? null,
      });
    }

    const unreadByConversation = new Map<string, number>();
    await Promise.all(
      [...convByOtherUserId.values()].map(async (conv) => {
        const count = await this.prisma.message.count({
          where: {
            conversationId: conv.conversationId,
            senderId: { not: userId },
            deletedAt: null,
            ...(conv.lastReadAt
              ? { createdAt: { gt: conv.lastReadAt } }
              : {}),
          },
        });
        unreadByConversation.set(conv.conversationId, count);
      }),
    );

    const items = connections.map((conn) => {
      const otherRaw =
        conn.requesterId === userId ? conn.receiver : conn.requester;
      const conv = convByOtherUserId.get(otherRaw.id);
      const last = conv?.lastMessage ?? null;

      return {
        otherUser: toPublicUser(otherRaw),
        conversationId: conv?.conversationId ?? null,
        lastMessage: last ? this.serializeLastMessage(last) : null,
        unreadCount: conv
          ? (unreadByConversation.get(conv.conversationId) ?? 0)
          : 0,
        sortAt: (
          last?.createdAt ??
          conv?.updatedAt ??
          conn.updatedAt
        ).toISOString(),
      };
    });

    items.sort(
      (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime(),
    );

    return items;
  }

  async markConversationRead(userId: string, conversationId: string) {
    await this.assertParticipant(userId, conversationId);
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  async listConversations(userId: string) {
    const participations = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: { user: { include: publicUserInclude } },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: "desc" } },
    });

    return participations.map((p) => {
      const other = p.conversation.participants.find((x) => x.userId !== userId);
      const last = p.conversation.messages[0];
      return {
        id: p.conversation.id,
        updatedAt: p.conversation.updatedAt.toISOString(),
        otherUser: other ? toPublicUser(other.user) : null,
        lastMessage: last
          ? this.serializeLastMessage(last)
          : null,
      };
    });
  }

  async getOrCreateConversation(userId: string, input: CreateConversationInput) {
    const target = await this.prisma.user.findUnique({
      where: { username: input.username },
    });
    if (!target) throw new NotFoundException("User not found");

    await assertCanMessage(this.prisma, userId, target.id);

    const existing = await this.findDirectConversation(userId, target.id);
    if (existing) {
      return this.serializeConversation(existing, userId);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId }, { userId: target.id }],
        },
      },
      include: this.conversationInclude(),
    });

    return this.serializeConversation(conversation, userId);
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: this.conversationInclude(),
    });
    if (!conversation) throw new NotFoundException("Conversation not found");

    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) throw new ForbiddenException("Not a participant");

    await this.markConversationRead(userId, conversationId);

    return this.serializeConversation(conversation, userId);
  }

  async listMessages(
    userId: string,
    conversationId: string,
    cursor?: string,
    limit = 50,
  ) {
    await this.assertParticipant(userId, conversationId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: this.messageInclude(),
    });

    const hasMore = messages.length > limit;
    const items = messages.slice(0, limit).reverse();

    return {
      items: items.map((m) => this.serializeMessage(m, userId)),
      nextCursor: hasMore ? messages[limit - 1].id : null,
    };
  }

  async listRecentMessagesForSocket(
    userId: string,
    conversationId: string,
    limit = 100,
  ) {
    await this.assertParticipant(userId, conversationId);

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: this.messageInclude(),
    });

    return messages.map((m) =>
      this.serializeMessage(m, userId, conversationId),
    );
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    input: SendMessageInput,
  ) {
    await this.assertParticipant(userId, conversationId);

    if (input.replyToId) {
      const parent = await this.prisma.message.findUnique({
        where: { id: input.replyToId },
      });
      if (!parent || parent.conversationId !== conversationId) {
        throw new BadRequestException("Invalid reply target");
      }
    }

    const content = (input.content ?? "").trim().slice(0, 2000);
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        replyToId: input.replyToId ?? null,
        content,
        mediaUrl: input.mediaUrl ?? null,
        mediaType: input.mediaType ?? null,
      },
      include: this.messageInclude(),
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return this.serializeMessage(message, userId, conversationId);
  }

  async toggleReaction(
    userId: string,
    conversationId: string,
    messageId: string,
    input: MessageReactionInput,
  ) {
    if (!isMessageReactionEmoji(input.emoji)) {
      throw new BadRequestException("Invalid reaction emoji");
    }

    await this.assertParticipant(userId, conversationId);

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException("Message not found");
    }
    if (message.deletedAt) {
      throw new BadRequestException("Cannot react to a deleted message");
    }

    const existing = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId: { messageId, userId } },
    });

    if (existing?.emoji === input.emoji) {
      await this.prisma.messageReaction.delete({
        where: { id: existing.id },
      });
    } else if (existing) {
      await this.prisma.messageReaction.update({
        where: { id: existing.id },
        data: { emoji: input.emoji },
      });
    } else {
      await this.prisma.messageReaction.create({
        data: { messageId, userId, emoji: input.emoji },
      });
    }

    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
    });

    return {
      messageId,
      conversationId,
      reactions: this.serializeReactions(reactions, userId),
    };
  }

  async deleteMessage(
    userId: string,
    conversationId: string,
    messageId: string,
  ) {
    await this.assertParticipant(userId, conversationId);

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { sender: { include: publicUserInclude } },
    });
    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException("Message not found");
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException("You can only delete your own messages");
    }
    if (message.deletedAt) {
      return this.serializeDeletedMessage(message, conversationId);
    }

    const ageMs = Date.now() - message.createdAt.getTime();
    if (ageMs > MESSAGE_DELETE_WINDOW_MS) {
      throw new ForbiddenException("Messages can only be deleted within 24 hours");
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        deletedAt: new Date(),
        content: "",
        mediaUrl: null,
        mediaType: null,
      },
      include: { sender: { include: publicUserInclude } },
    });

    return this.serializeDeletedMessage(updated, conversationId);
  }

  async assertParticipant(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    if (!participant) {
      throw new ForbiddenException("Not a participant");
    }
  }

  private async findDirectConversation(userA: string, userB: string) {
    const participationsA = await this.prisma.conversationParticipant.findMany({
      where: { userId: userA },
      select: { conversationId: true },
    });

    for (const { conversationId } of participationsA) {
      const participants = await this.prisma.conversationParticipant.findMany({
        where: { conversationId },
      });
      if (
        participants.length === 2 &&
        participants.some((p) => p.userId === userA) &&
        participants.some((p) => p.userId === userB)
      ) {
        return this.prisma.conversation.findUnique({
          where: { id: conversationId },
          include: this.conversationInclude(),
        });
      }
    }
    return null;
  }

  private conversationInclude() {
    return {
      participants: {
        include: { user: { include: publicUserInclude } },
      },
      messages: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
      },
    };
  }

  messageInclude() {
    return {
      sender: { include: publicUserInclude },
      replyTo: {
        include: {
          sender: { include: publicUserInclude },
        },
      },
      reactions: true,
    };
  }

  private serializeConversation(
    conversation: {
      id: string;
      updatedAt: Date;
      participants: {
        userId: string;
        user: Parameters<typeof toPublicUser>[0];
      }[];
      messages: { id: string; content: string; mediaUrl: string | null; mediaType: string | null; deletedAt: Date | null; senderId: string; createdAt: Date }[];
    },
    viewerId: string,
  ) {
    const other = conversation.participants.find((p) => p.userId !== viewerId);
    const last = conversation.messages[0];
    return {
      id: conversation.id,
      updatedAt: conversation.updatedAt.toISOString(),
      otherUser: other ? toPublicUser(other.user) : null,
      lastMessage: last ? this.serializeLastMessage(last) : null,
    };
  }

  serializeMessage(
    m: MessageWithRelations,
    viewerId: string,
    conversationId?: string,
  ) {
    if (m.deletedAt) {
      return {
        id: m.id,
        ...(conversationId ? { conversationId } : {}),
        content: "",
        mediaUrl: null,
        mediaType: null,
        replyTo: null,
        reactions: [],
        deletedAt: m.deletedAt.toISOString(),
        createdAt: m.createdAt.toISOString(),
        sender: toPublicUser(m.sender),
        fromMe: m.senderId === viewerId,
      };
    }

    return {
      id: m.id,
      ...(conversationId ? { conversationId } : {}),
      content: m.content,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
      replyTo: m.replyTo ? this.serializeReplyPreview(m.replyTo) : null,
      reactions: this.serializeReactions(m.reactions ?? [], viewerId),
      deletedAt: null,
      createdAt: m.createdAt.toISOString(),
      sender: toPublicUser(m.sender),
      fromMe: m.senderId === viewerId,
    };
  }

  private serializeReplyPreview(reply: {
    id: string;
    content: string;
    mediaUrl: string | null;
    mediaType: string | null;
    deletedAt: Date | null;
    sender: Parameters<typeof toPublicUser>[0];
  }) {
    if (reply.deletedAt) {
      return {
        id: reply.id,
        content: "",
        mediaUrl: null,
        mediaType: null,
        deletedAt: reply.deletedAt.toISOString(),
        sender: toPublicUser(reply.sender),
      };
    }

    return {
      id: reply.id,
      content: reply.content,
      mediaUrl: reply.mediaUrl,
      mediaType: reply.mediaType,
      deletedAt: null,
      sender: toPublicUser(reply.sender),
    };
  }

  serializeReactions(
    reactions: { userId: string; emoji: string }[],
    viewerId: string,
  ) {
    const byEmoji = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const reaction of reactions) {
      const entry = byEmoji.get(reaction.emoji) ?? {
        count: 0,
        reactedByMe: false,
      };
      entry.count += 1;
      if (reaction.userId === viewerId) entry.reactedByMe = true;
      byEmoji.set(reaction.emoji, entry);
    }

    return [...byEmoji.entries()].map(([emoji, data]) => ({
      emoji,
      count: data.count,
      reactedByMe: data.reactedByMe,
    }));
  }

  private serializeDeletedMessage(
    m: {
      id: string;
      senderId: string;
      deletedAt: Date | null;
      createdAt: Date;
      sender: Parameters<typeof toPublicUser>[0];
    },
    conversationId: string,
  ) {
    return {
      id: m.id,
      conversationId,
      content: "",
      mediaUrl: null,
      mediaType: null,
      deletedAt: m.deletedAt?.toISOString() ?? new Date().toISOString(),
      createdAt: m.createdAt.toISOString(),
      sender: toPublicUser(m.sender),
    };
  }

  private serializeLastMessage(last: {
    id: string;
    content: string;
    mediaUrl: string | null;
    mediaType: string | null;
    deletedAt: Date | null;
    senderId: string;
    createdAt: Date;
  }) {
    if (last.deletedAt) {
      return {
        id: last.id,
        content: "",
        mediaUrl: null,
        mediaType: null,
        deletedAt: last.deletedAt.toISOString(),
        senderId: last.senderId,
        createdAt: last.createdAt.toISOString(),
      };
    }

    return {
      id: last.id,
      content: last.content,
      mediaUrl: last.mediaUrl,
      mediaType: last.mediaType,
      deletedAt: null,
      senderId: last.senderId,
      createdAt: last.createdAt.toISOString(),
    };
  }
}
