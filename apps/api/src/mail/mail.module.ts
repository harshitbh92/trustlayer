import { Global, Module } from "@nestjs/common";
import { MailService } from "./mail.service";
import { OtpService } from "./otp.service";

@Global()
@Module({
  providers: [MailService, OtpService],
  exports: [MailService, OtpService],
})
export class MailModule {}
