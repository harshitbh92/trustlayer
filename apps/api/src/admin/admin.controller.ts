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
import type { ReportStatus } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AdminService } from "./admin.service";
import { ZodPipe } from "../common/zod.pipe";
import {
  createModerationActionSchema,
  updateReportStatusSchema,
  updateUserRoleSchema,
  type CreateModerationActionInput,
  type UpdateReportStatusInput,
  type UpdateUserRoleInput,
} from "@trustlayer/shared";
import type { User } from "@prisma/client";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("stats")
  stats() {
    return this.admin.getStats();
  }

  @Get("analytics")
  analytics() {
    return this.admin.getAnalytics();
  }

  @Get("reports")
  reports(@Query("status") status?: ReportStatus) {
    return this.admin.listReports(status);
  }

  @Patch("reports/:id")
  updateReport(
    @Param("id") id: string,
    @Body(new ZodPipe(updateReportStatusSchema)) body: UpdateReportStatusInput,
  ) {
    return this.admin.updateReportStatus(id, body);
  }

  @Post("moderation")
  moderate(
    @CurrentUser() user: User,
    @Body(new ZodPipe(createModerationActionSchema))
    body: CreateModerationActionInput,
  ) {
    return this.admin.createModerationAction(user.id, body);
  }

  @Get("moderation")
  moderationLog() {
    return this.admin.listModerationActions();
  }

  @Get("users")
  users(@Query("q") q?: string) {
    return this.admin.searchUsers(q);
  }

  @Patch("users/:id/role")
  updateRole(
    @CurrentUser() actor: User,
    @Param("id") id: string,
    @Body(new ZodPipe(updateUserRoleSchema)) body: UpdateUserRoleInput,
  ) {
    return this.admin.updateUserRole(id, body.role, actor.id);
  }

  @Delete("users/:id")
  deleteUser(@CurrentUser() actor: User, @Param("id") id: string) {
    return this.admin.deleteUser(actor.id, id);
  }
}
