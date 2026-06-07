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
import { MessagesService } from "./messages.service";
import { ZodPipe } from "../common/zod.pipe";
import {
  createConversationSchema,
  sendMessageSchema,
  type CreateConversationInput,
  type SendMessageInput,
} from "@trustlayer/shared";
import type { User } from "@prisma/client";

@Controller("conversations")
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.messages.listConversations(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: User,
    @Body(new ZodPipe(createConversationSchema)) body: CreateConversationInput,
  ) {
    return this.messages.getOrCreateConversation(user.id, body);
  }

  @Get(":id")
  get(@CurrentUser() user: User, @Param("id") id: string) {
    return this.messages.getConversation(user.id, id);
  }

  @Get(":id/messages")
  history(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    const n = Math.min(Math.max(Number(limit ?? 50) || 50, 1), 100);
    return this.messages.listMessages(user.id, id, cursor, n);
  }

  @Post(":id/messages")
  send(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body(new ZodPipe(sendMessageSchema)) body: SendMessageInput,
  ) {
    return this.messages.sendMessage(user.id, id, body);
  }

  @Delete(":conversationId/messages/:messageId")
  deleteMessage(
    @CurrentUser() user: User,
    @Param("conversationId") conversationId: string,
    @Param("messageId") messageId: string,
  ) {
    return this.messages.deleteMessage(user.id, conversationId, messageId);
  }
}
