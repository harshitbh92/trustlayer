import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  publicUserInclude,
  toPublicUser,
} from "../common/public-user.mapper";
import {
  fetchConnectionsForUsers,
  resolveViewerConnectionStatus,
} from "../connections/connection-status.util";
import {
  ViewerConnectionStatus,
  type DiscoverUser,
  type UpdateProfileInput,
} from "@trustlayer/shared";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicByUsername(
    viewerId: string,
    username: string,
  ): Promise<DiscoverUser> {
    const u = await this.prisma.user.findUnique({
      where: { username },
      include: publicUserInclude,
    });
    if (!u) throw new NotFoundException("User not found");

    let connectionStatus: ViewerConnectionStatus = ViewerConnectionStatus.NONE;
    if (u.id !== viewerId) {
      const connections = await fetchConnectionsForUsers(this.prisma, viewerId, [
        u.id,
      ]);
      connectionStatus = resolveViewerConnectionStatus(
        viewerId,
        u.id,
        connections,
      );
    }

    return { ...toPublicUser(u), connectionStatus };
  }

  async discover(viewerId: string, limit = 20, query?: string) {
    const blockedRows = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    });
    const excludedIds = new Set<string>([viewerId]);
    for (const b of blockedRows) {
      excludedIds.add(b.blockerId);
      excludedIds.add(b.blockedId);
    }

    const q = query?.trim();
    const searchFilter = q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" as const } },
            { displayName: { contains: q, mode: "insensitive" as const } },
            { bio: { contains: q, mode: "insensitive" as const } },
            { city: { contains: q, mode: "insensitive" as const } },
            { country: { contains: q, mode: "insensitive" as const } },
            { interests: { hasSome: [q] } },
            {
              personalityProfile: {
                OR: [
                  {
                    personalityType: {
                      contains: q,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    personalitySubType: {
                      contains: q,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    communicationStyle: {
                      contains: q,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    socialEnergy: {
                      contains: q,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          ],
        }
      : {};

    const users = await this.prisma.user.findMany({
      where: {
        id: { notIn: Array.from(excludedIds) },
        role: { notIn: ["GUEST", "ADMIN"] },
        ...searchFilter,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: publicUserInclude,
    });

    const targetIds = users.map((u) => u.id);
    const connections = await fetchConnectionsForUsers(
      this.prisma,
      viewerId,
      targetIds,
    );

    return users.map((u) => ({
      ...toPublicUser(u),
      connectionStatus: resolveViewerConnectionStatus(
        viewerId,
        u.id,
        connections,
      ),
    }));
  }

  async updateMe(userId: string, input: UpdateProfileInput) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.displayName !== undefined && {
          displayName: input.displayName,
        }),
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        ...(input.interests !== undefined && { interests: input.interests }),
        ...(input.birthDate !== undefined && {
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
        }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.country !== undefined && { country: input.country }),
        ...(input.addressLine !== undefined && {
          addressLine: input.addressLine,
        }),
        ...(input.discoverLayout !== undefined && {
          discoverLayout: input.discoverLayout,
        }),
      },
      include: publicUserInclude,
    });
  }

  async toggleFollow(viewerId: string, targetUsername: string, follow: boolean) {
    const target = await this.prisma.user.findUnique({
      where: { username: targetUsername },
    });
    if (!target) throw new NotFoundException("User not found");
    if (target.id === viewerId) return { following: false };

    if (follow) {
      await this.prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: target.id,
          },
        },
        update: {},
        create: { followerId: viewerId, followingId: target.id },
      });
    } else {
      await this.prisma.follow
        .delete({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: target.id,
            },
          },
        })
        .catch(() => undefined);
    }
    return { following: follow };
  }
}
