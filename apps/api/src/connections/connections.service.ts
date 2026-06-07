import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { publicUserInclude, toPublicUser } from "../common/public-user.mapper";
import { assertQuestionnaireComplete } from "../common/questionnaire.util";
import { connectionStatusFromDbStatus } from "./connection-status.util";

@Injectable()
export class ConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async request(requesterId: string, receiverUsername: string) {
    await assertQuestionnaireComplete(this.prisma, requesterId);
    const receiver = await this.prisma.user.findUnique({
      where: { username: receiverUsername },
    });
    if (!receiver) throw new NotFoundException("User not found");
    if (receiver.role === "ADMIN") {
      throw new BadRequestException("Cannot connect with this user");
    }
    if (receiver.id === requesterId) {
      throw new BadRequestException("Cannot connect with yourself");
    }
    const existing = await this.prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, receiverId: receiver.id },
          { requesterId: receiver.id, receiverId: requesterId },
        ],
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    });
    if (existing) {
      if (existing.status === "ACCEPTED") {
        return this.toRequestResult(requesterId, existing);
      }
      if (existing.requesterId === requesterId) {
        return this.toRequestResult(requesterId, existing);
      }
      throw new BadRequestException(
        "This user already sent you a connection request",
      );
    }
    const created = await this.prisma.connection.create({
      data: { requesterId, receiverId: receiver.id, status: "PENDING" },
    });
    return this.toRequestResult(requesterId, created);
  }

  private toRequestResult(
    viewerId: string,
    conn: {
      id: string;
      status: "PENDING" | "ACCEPTED" | "REJECTED";
      requesterId: string;
      receiverId: string;
    },
  ) {
    return {
      id: conn.id,
      status: conn.status,
      connectionStatus: connectionStatusFromDbStatus(
        viewerId,
        conn.requesterId,
        conn.receiverId,
        conn.status,
      ),
    };
  }

  async respond(userId: string, connectionId: string, accept: boolean) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn) throw new NotFoundException();
    if (conn.receiverId !== userId) {
      throw new ForbiddenException("Only the receiver can respond");
    }
    return this.prisma.connection.update({
      where: { id: connectionId },
      data: { status: accept ? "ACCEPTED" : "REJECTED" },
    });
  }

  async disconnect(userId: string, connectionId: string) {
    const conn = await this.prisma.connection.findUnique({
      where: { id: connectionId },
    });
    if (!conn) throw new NotFoundException();
    if (conn.requesterId !== userId && conn.receiverId !== userId) {
      throw new ForbiddenException("Not your connection");
    }
    if (conn.status === "ACCEPTED") {
      await this.prisma.connection.delete({ where: { id: connectionId } });
      return { ok: true };
    }
    if (conn.status === "PENDING" && conn.requesterId === userId) {
      await this.prisma.connection.delete({ where: { id: connectionId } });
      return { ok: true };
    }
    throw new BadRequestException("Cannot remove this connection");
  }

  async list(userId: string) {
    const [incoming, outgoing] = await Promise.all([
      this.prisma.connection.findMany({
        where: { receiverId: userId, status: "PENDING" },
        include: { requester: { include: publicUserInclude } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.connection.findMany({
        where: {
          OR: [
            { requesterId: userId },
            { receiverId: userId, status: "ACCEPTED" },
          ],
        },
        include: {
          requester: { include: publicUserInclude },
          receiver: { include: publicUserInclude },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return {
      incoming: incoming.map((c) => ({
        id: c.id,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        requester: toPublicUser(c.requester),
      })),
      mine: outgoing.map((c) => ({
        id: c.id,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        requester: toPublicUser(c.requester),
        receiver: toPublicUser(c.receiver),
      })),
    };
  }
}
