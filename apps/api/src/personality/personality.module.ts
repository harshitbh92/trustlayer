import { Module } from "@nestjs/common";
import { PersonalityController } from "./personality.controller";

@Module({
  controllers: [PersonalityController],
})
export class PersonalityModule {}
