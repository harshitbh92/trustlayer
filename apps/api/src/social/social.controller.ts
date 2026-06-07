import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { SocialService } from "./social.service";
import { ZodPipe } from "../common/zod.pipe";
import {
  createCommentSchema,
  createPostSchema,
  type CreateCommentInput,
  type CreatePostInput,
} from "@trustlayer/shared";
import type { User } from "@prisma/client";

@Controller("posts")
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Post()
  create(
    @CurrentUser() user: User,
    @Body(new ZodPipe(createPostSchema)) body: CreatePostInput,
  ) {
    return this.social.createPost(user.id, body);
  }

  @Get("feed")
  feed(
    @CurrentUser() user: User,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const n = Math.min(Math.max(Number(limit ?? 20) || 20, 1), 50);
    return this.social.feed(user.id, cursor, n);
  }

  @Get(":id/comments")
  comments(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const n = Math.min(Math.max(Number(limit ?? 30) || 30, 1), 100);
    return this.social.listComments(user.id, id, cursor, n);
  }

  @Post(":id/comments")
  addComment(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body(new ZodPipe(createCommentSchema)) body: CreateCommentInput,
  ) {
    return this.social.createComment(user.id, id, body);
  }

  @Delete(":id")
  removePost(@CurrentUser() user: User, @Param("id") id: string) {
    return this.social.deletePost(user.id, id);
  }

  @Delete(":id/comments/:commentId")
  removeComment(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Param("commentId") commentId: string,
  ) {
    return this.social.deleteComment(user.id, id, commentId);
  }

  @Post(":id/like")
  like(@CurrentUser() user: User, @Param("id") id: string) {
    return this.social.toggleLike(user.id, id, true);
  }

  @Delete(":id/like")
  unlike(@CurrentUser() user: User, @Param("id") id: string) {
    return this.social.toggleLike(user.id, id, false);
  }
}
