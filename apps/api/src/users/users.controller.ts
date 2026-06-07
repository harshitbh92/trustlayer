import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { UsersService } from "./users.service";
import { ZodPipe } from "../common/zod.pipe";
import {
  toPublicUser,
} from "../common/public-user.mapper";
import { publicUserInclude } from "../common/public-user.mapper";
import { PrismaService } from "../prisma/prisma.service";
import { updateProfileSchema, type UpdateProfileInput } from "@trustlayer/shared";
import type { User } from "@prisma/client";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("me")
  async me(@CurrentUser() user: User) {
    const full = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: publicUserInclude,
    });
    if (!full) return null;
    return {
      ...toPublicUser(full),
      birthDate: full.birthDate?.toISOString().slice(0, 10) ?? null,
      addressLine: full.addressLine ?? null,
      discoverLayout: full.discoverLayout,
    };
  }

  @Patch("me")
  async updateMe(
    @CurrentUser() user: User,
    @Body(new ZodPipe(updateProfileSchema)) input: UpdateProfileInput,
  ) {
    const updated = await this.users.updateMe(user.id, input);
    return toPublicUser(updated);
  }

  @Get("discover")
  discover(
    @CurrentUser() user: User,
    @Query("limit") limit?: string,
  ) {
    const n = Math.min(Math.max(Number(limit ?? 20) || 20, 1), 50);
    return this.users.discover(user.id, n);
  }

  @Get(":username")
  byUsername(@CurrentUser() user: User, @Param("username") username: string) {
    return this.users.getPublicByUsername(user.id, username);
  }

  @Post(":username/follow")
  follow(@CurrentUser() user: User, @Param("username") username: string) {
    return this.users.toggleFollow(user.id, username, true);
  }

  @Delete(":username/follow")
  unfollow(@CurrentUser() user: User, @Param("username") username: string) {
    return this.users.toggleFollow(user.id, username, false);
  }
}
