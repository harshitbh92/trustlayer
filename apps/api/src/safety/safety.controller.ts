import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { SafetyService } from "./safety.service";
import { ZodPipe } from "../common/zod.pipe";
import { createReportSchema, type CreateReportInput } from "@trustlayer/shared";
import type { User } from "@prisma/client";

@Controller()
@UseGuards(JwtAuthGuard)
export class SafetyController {
  constructor(private readonly safety: SafetyService) {}

  @Post("blocks/:username")
  block(@CurrentUser() user: User, @Param("username") username: string) {
    return this.safety.block(user.id, username);
  }

  @Delete("blocks/:username")
  unblock(@CurrentUser() user: User, @Param("username") username: string) {
    return this.safety.unblock(user.id, username);
  }

  @Get("blocks")
  list(@CurrentUser() user: User) {
    return this.safety.listBlocks(user.id);
  }

  @Post("reports")
  report(
    @CurrentUser() user: User,
    @Body(new ZodPipe(createReportSchema)) body: CreateReportInput,
  ) {
    return this.safety.report(user.id, body);
  }
}
