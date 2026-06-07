import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { publicUserInclude, toPublicUser } from "../common/public-user.mapper";
import {
  fetchConnectionsForUsers,
  resolveViewerConnectionStatus,
} from "../connections/connection-status.util";
import {
  CONTENT_DELETE_WINDOW_MS,
  type CreateCommentInput,
  type CreatePostInput,
} from "@trustlayer/shared";

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  async createPost(authorId: string, input: CreatePostInput) {
    const post = await this.prisma.post.create({
      data: {
        authorId,
        content: input.content.trim(),
        imageUrl: input.imageUrl ?? null,
        videoUrl: input.videoUrl ?? null,
      },
      include: {
        author: { include: publicUserInclude },
        likes: { select: { userId: true } },
        _count: { select: { comments: true } },
      },
    });
    return this.serialize(post, authorId, []);
  }

  async feed(viewerId: string, cursor?: string, limit = 20) {
    const blockedIds = await this.blockedUserIds(viewerId);

    const posts = await this.prisma.post.findMany({
      where: {
        ...(blockedIds.size ? { authorId: { notIn: [...blockedIds] } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { include: publicUserInclude },
        likes: { select: { userId: true } },
        _count: { select: { comments: true } },
      },
    });

    const hasMore = posts.length > limit;
    const authorIds = [...new Set(posts.slice(0, limit).map((p) => p.authorId))];
    const connections = await fetchConnectionsForUsers(
      this.prisma,
      viewerId,
      authorIds,
    );
    const items = posts
      .slice(0, limit)
      .map((p) =>
        this.serialize(p, viewerId, connections),
      );
    return {
      items,
      nextCursor: hasMore ? posts[limit - 1].id : null,
    };
  }

  async toggleLike(viewerId: string, postId: string, like: boolean) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("Post not found");

    if (like) {
      await this.prisma.postLike.upsert({
        where: { postId_userId: { postId, userId: viewerId } },
        update: {},
        create: { postId, userId: viewerId },
      });
    } else {
      await this.prisma.postLike
        .delete({ where: { postId_userId: { postId, userId: viewerId } } })
        .catch(() => undefined);
    }
    const likeCount = await this.prisma.postLike.count({ where: { postId } });
    return { liked: like, likeCount };
  }

  async listComments(
    viewerId: string,
    postId: string,
    cursor?: string,
    limit = 30,
  ) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("Post not found");
    await this.assertCanViewPost(viewerId, post.authorId);

    const comments = await this.prisma.postComment.findMany({
      where: { postId, parentId: null },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { include: publicUserInclude },
        replies: {
          orderBy: { createdAt: "asc" },
          include: { author: { include: publicUserInclude } },
        },
      },
    });

    const hasMore = comments.length > limit;
    const items = comments.slice(0, limit).map((c) => this.serializeComment(c));

    return {
      items,
      nextCursor: hasMore ? comments[limit - 1].id : null,
    };
  }

  async createComment(
    viewerId: string,
    postId: string,
    input: CreateCommentInput,
  ) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException("Post not found");
    await this.assertCanViewPost(viewerId, post.authorId);

    if (input.parentId) {
      const parent = await this.prisma.postComment.findUnique({
        where: { id: input.parentId },
      });
      if (!parent || parent.postId !== postId) {
        throw new NotFoundException("Parent comment not found");
      }
    }

    const comment = await this.prisma.postComment.create({
      data: {
        postId,
        authorId: viewerId,
        content: input.content.trim(),
        imageUrl: input.imageUrl ?? null,
        videoUrl: input.videoUrl ?? null,
        parentId: input.parentId ?? null,
      },
      include: {
        author: { include: publicUserInclude },
        replies: {
          include: { author: { include: publicUserInclude } },
        },
      },
    });

    return this.serializeComment(comment);
  }

  async deleteComment(viewerId: string, postId: string, commentId: string) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
      include: {
        author: { include: publicUserInclude },
        replies: { include: { author: { include: publicUserInclude } } },
      },
    });
    if (!comment || comment.postId !== postId) {
      throw new NotFoundException("Comment not found");
    }
    if (comment.authorId !== viewerId) {
      throw new ForbiddenException("You can only delete your own comments");
    }
    if (comment.deletedAt) {
      return this.serializeComment(comment);
    }

    const ageMs = Date.now() - comment.createdAt.getTime();
    if (ageMs > CONTENT_DELETE_WINDOW_MS) {
      throw new ForbiddenException("Comments can only be deleted within 24 hours");
    }

    const updated = await this.prisma.postComment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date(),
        content: "",
        imageUrl: null,
        videoUrl: null,
      },
      include: {
        author: { include: publicUserInclude },
        replies: {
          orderBy: { createdAt: "asc" },
          include: { author: { include: publicUserInclude } },
        },
      },
    });

    return this.serializeComment(updated);
  }

  async deletePost(viewerId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { include: publicUserInclude },
        likes: { select: { userId: true } },
        _count: { select: { comments: true } },
      },
    });
    if (!post) throw new NotFoundException("Post not found");
    if (post.authorId !== viewerId) {
      throw new ForbiddenException("You can only delete your own posts");
    }
    if (post.deletedAt) {
      return this.serialize(post, viewerId, []);
    }

    const ageMs = Date.now() - post.createdAt.getTime();
    if (ageMs > CONTENT_DELETE_WINDOW_MS) {
      throw new ForbiddenException("Posts can only be deleted within 24 hours");
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        deletedAt: new Date(),
        content: "",
        imageUrl: null,
        videoUrl: null,
      },
      include: {
        author: { include: publicUserInclude },
        likes: { select: { userId: true } },
        _count: { select: { comments: true } },
      },
    });

    return this.serialize(updated, viewerId, []);
  }

  private async assertCanViewPost(viewerId: string, authorId: string) {
    const blockedIds = await this.blockedUserIds(viewerId);
    if (blockedIds.has(authorId)) {
      throw new ForbiddenException("Cannot interact with this post");
    }
  }

  private async blockedUserIds(viewerId: string) {
    const blocked = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    });
    const blockedIds = new Set<string>();
    for (const b of blocked) {
      blockedIds.add(b.blockerId);
      blockedIds.add(b.blockedId);
    }
    blockedIds.delete(viewerId);
    return blockedIds;
  }

  private serializeComment(c: {
    id: string;
    content: string;
    imageUrl: string | null;
    videoUrl: string | null;
    deletedAt: Date | null;
    createdAt: Date;
    author: Parameters<typeof toPublicUser>[0];
    replies?: {
      id: string;
      content: string;
      imageUrl: string | null;
      videoUrl: string | null;
      deletedAt: Date | null;
      createdAt: Date;
      author: Parameters<typeof toPublicUser>[0];
    }[];
  }) {
    return {
      id: c.id,
      content: c.deletedAt ? "" : c.content,
      imageUrl: c.deletedAt ? null : c.imageUrl,
      videoUrl: c.deletedAt ? null : c.videoUrl,
      deletedAt: c.deletedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      author: toPublicUser(c.author),
      replies: (c.replies ?? []).map((r) => ({
        id: r.id,
        content: r.deletedAt ? "" : r.content,
        imageUrl: r.deletedAt ? null : r.imageUrl,
        videoUrl: r.deletedAt ? null : r.videoUrl,
        deletedAt: r.deletedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        author: toPublicUser(r.author),
      })),
    };
  }

  private serialize(
    p: {
      id: string;
      authorId: string;
      content: string;
      imageUrl: string | null;
      videoUrl: string | null;
      deletedAt: Date | null;
      createdAt: Date;
      author: Parameters<typeof toPublicUser>[0];
      likes: { userId: string }[];
      _count: { comments: number };
    },
    viewerId: string,
    connections: Awaited<ReturnType<typeof fetchConnectionsForUsers>>,
  ) {
    return {
      id: p.id,
      content: p.deletedAt ? "" : p.content,
      imageUrl: p.deletedAt ? null : p.imageUrl,
      videoUrl: p.deletedAt ? null : p.videoUrl,
      deletedAt: p.deletedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      author: toPublicUser(p.author),
      authorConnectionStatus: resolveViewerConnectionStatus(
        viewerId,
        p.authorId,
        connections,
      ),
      likeCount: p.likes.length,
      likedByViewer: p.likes.some((l) => l.userId === viewerId),
      commentCount: p._count.comments,
    };
  }
}
