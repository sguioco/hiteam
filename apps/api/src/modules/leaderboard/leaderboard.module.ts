import { Module } from "@nestjs/common";
import { CollaborationModule } from "../collaboration/collaboration.module";
import { PrismaModule } from "../prisma/prisma.module";
import { LeaderboardController } from "./leaderboard.controller";
import { LeaderboardService } from "./leaderboard.service";

@Module({
  imports: [PrismaModule, CollaborationModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
