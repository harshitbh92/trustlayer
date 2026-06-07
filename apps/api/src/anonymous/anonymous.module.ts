import { Module } from "@nestjs/common";
import { AnonymousController } from "./anonymous.controller";
import { AnonymousService } from "./anonymous.service";
import { MatchQueueService } from "./match-queue.service";
import { AnonymousGateway } from "./anonymous.gateway";

@Module({
  controllers: [AnonymousController],
  providers: [AnonymousService, MatchQueueService, AnonymousGateway],
})
export class AnonymousModule {}
