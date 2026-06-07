import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AnonymousService } from "./anonymous.service";
import { ZodPipe } from "../common/zod.pipe";
import { startMatchSchema, type StartMatchInput } from "@trustlayer/shared";
import type { User } from "@prisma/client";

@Controller("anonymous")
@UseGuards(JwtAuthGuard)
export class AnonymousController {
  constructor(private readonly anonymous: AnonymousService) {}

  @Post("match")
  match(
    @CurrentUser() user: User,
    @Body(new ZodPipe(startMatchSchema)) body: StartMatchInput,
  ) {
    return this.anonymous.startMatch(user.id, body);
  }

  @Get(":id")
  get(@CurrentUser() user: User, @Param("id") id: string) {
    return this.anonymous.getSession(user.id, id);
  }

  @Post(":id/end")
  end(@CurrentUser() user: User, @Param("id") id: string) {
    return this.anonymous.endSession(user.id, id);
  }

  @Post(":id/feedback")
  feedback(
    @CurrentUser() user: User,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.anonymous.submitFeedback(user.id, id, body);
  }
}
