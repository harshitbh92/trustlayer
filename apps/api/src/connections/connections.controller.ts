import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ConnectionsService } from "./connections.service";
import type { User } from "@prisma/client";

@Controller("connections")
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.connections.list(user.id);
  }

  @Post()
  request(@CurrentUser() user: User, @Body() body: { username: string }) {
    return this.connections.request(user.id, body.username);
  }

  @Patch(":id/accept")
  accept(@CurrentUser() user: User, @Param("id") id: string) {
    return this.connections.respond(user.id, id, true);
  }

  @Patch(":id/reject")
  reject(@CurrentUser() user: User, @Param("id") id: string) {
    return this.connections.respond(user.id, id, false);
  }

  @Delete(":id")
  disconnect(@CurrentUser() user: User, @Param("id") id: string) {
    return this.connections.disconnect(user.id, id);
  }
}
