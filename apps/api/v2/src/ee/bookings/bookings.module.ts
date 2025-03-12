<<<<<<< HEAD:apps/api/v2/src/ee/bookings/bookings.module.ts
import { BookingsController } from "@/ee/bookings/controllers/bookings.controller";
import { BillingModule } from "@/modules/billing/billing.module";
=======
import { BookingsController_2024_04_15 } from "@/ee/bookings/2024-04-15/controllers/bookings.controller";
import { ApiKeyRepository } from "@/modules/api-key/api-key-repository";
>>>>>>> c2bc804973 (Remove usage from booking service):apps/api/v2/src/ee/bookings/2024-04-15/bookings.module.ts
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { Module } from "@nestjs/common";

@Module({
<<<<<<< HEAD:apps/api/v2/src/ee/bookings/bookings.module.ts
  imports: [PrismaModule, RedisModule, TokensModule, BillingModule],
  providers: [TokensRepository, OAuthFlowService, OAuthClientRepository],
  controllers: [BookingsController],
=======
  imports: [PrismaModule, RedisModule, TokensModule],
  providers: [TokensRepository, OAuthFlowService, OAuthClientRepository, ApiKeyRepository],
  controllers: [BookingsController_2024_04_15],
>>>>>>> c2bc804973 (Remove usage from booking service):apps/api/v2/src/ee/bookings/2024-04-15/bookings.module.ts
})
export class BookingsModule {}
