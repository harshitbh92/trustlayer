import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { join } from "path";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { PersonalityModule } from "./personality/personality.module";
import { SocialModule } from "./social/social.module";
import { ConnectionsModule } from "./connections/connections.module";
import { AnonymousModule } from "./anonymous/anonymous.module";
import { MessagesModule } from "./messages/messages.module";
import { ReputationModule } from "./reputation/reputation.module";
import { SafetyModule } from "./safety/safety.module";
import { AdminModule } from "./admin/admin.module";
import { RedisModule } from "./redis/redis.module";
import { MailModule } from "./mail/mail.module";
import { UploadsModule } from "./uploads/uploads.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, "..", ".env"),
    }),
    PrismaModule,
    RedisModule,
    MailModule,
    AuthModule,
    UsersModule,
    PersonalityModule,
    SocialModule,
    ConnectionsModule,
    AnonymousModule,
    MessagesModule,
    ReputationModule,
    SafetyModule,
    AdminModule,
    UploadsModule,
  ],
})
export class AppModule {}
