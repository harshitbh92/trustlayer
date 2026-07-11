import { Global, Module } from "@nestjs/common";
import { AiReputationAssistService } from "./ai-reputation-assist.service";
import { ReputationService } from "./reputation.service";

@Global()
@Module({
  providers: [ReputationService, AiReputationAssistService],
  exports: [ReputationService, AiReputationAssistService],
})
export class ReputationModule {}
