import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { RolesGuard } from "../auth/roles.guard";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [MailModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
  exports: [AdminService],
})
export class AdminModule {}
