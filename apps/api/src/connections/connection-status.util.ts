import type { Connection, PrismaClient } from "@prisma/client";
import { ViewerConnectionStatus } from "@trustlayer/shared";

export function resolveViewerConnectionStatus(
  viewerId: string,
  targetId: string,
  connections: Connection[],
): ViewerConnectionStatus {
  const conn = connections.find(
    (c) =>
      (c.requesterId === viewerId && c.receiverId === targetId) ||
      (c.requesterId === targetId && c.receiverId === viewerId),
  );
  if (!conn || conn.status === "REJECTED") {
    return ViewerConnectionStatus.NONE;
  }
  if (conn.status === "ACCEPTED") {
    return ViewerConnectionStatus.CONNECTED;
  }
  if (conn.requesterId === viewerId) {
    return ViewerConnectionStatus.REQUESTED;
  }
  return ViewerConnectionStatus.INCOMING;
}

export async function fetchConnectionsForUsers(
  prisma: PrismaClient,
  viewerId: string,
  targetIds: string[],
): Promise<Connection[]> {
  if (targetIds.length === 0) return [];
  return prisma.connection.findMany({
    where: {
      status: { in: ["PENDING", "ACCEPTED"] },
      OR: targetIds.flatMap((id) => [
        { requesterId: viewerId, receiverId: id },
        { requesterId: id, receiverId: viewerId },
      ]),
    },
  });
}

export function connectionStatusFromDbStatus(
  viewerId: string,
  requesterId: string,
  receiverId: string,
  status: Connection["status"],
): ViewerConnectionStatus {
  if (status === "REJECTED") {
    return ViewerConnectionStatus.NONE;
  }
  if (status === "ACCEPTED") {
    return ViewerConnectionStatus.CONNECTED;
  }
  if (requesterId === viewerId) {
    return ViewerConnectionStatus.REQUESTED;
  }
  return ViewerConnectionStatus.INCOMING;
}
