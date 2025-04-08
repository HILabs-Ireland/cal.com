import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisService } from "@/modules/redis/redis.service";
import { Module } from "@nestjs/common";

import { DeploymentsRepository } from "./deployments.repository";

@Module({
  imports: [PrismaModule],
  providers: [DeploymentsRepository, RedisService],
  exports: [DeploymentsRepository],
})
export class DeploymentsModule {}
