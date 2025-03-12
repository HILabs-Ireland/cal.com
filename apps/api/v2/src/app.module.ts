import appConfig from "@/config/app";
import { AppLoggerMiddleware } from "@/middleware/app.logger.middleware";
import { RewriterMiddleware } from "@/middleware/app.rewrites.middleware";
import { RawBodyMiddleware } from "@/middleware/body/raw.body.middleware";
import { ResponseInterceptor } from "@/middleware/request-ids/request-id.interceptor";
import { RequestIdMiddleware } from "@/middleware/request-ids/request-id.middleware";
import { AuthModule } from "@/modules/auth/auth.module";
import { EndpointsModule } from "@/modules/endpoints.module";
import { JwtModule } from "@/modules/jwt/jwt.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { RedisModule } from "@/modules/redis/redis.module";
import { RedisService } from "@/modules/redis/redis.service";
<<<<<<< HEAD
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
=======
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { BullModule } from "@nestjs/bull";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
>>>>>>> 79bd2d1104 (Remove global vars and dedicated js files)
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR, RouterModule } from "@nestjs/core";
import { seconds, ThrottlerModule } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "nestjs-throttler-storage-redis";

import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
      isGlobal: true,
      load: [appConfig],
    }),
    RedisModule,
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        throttlers: [
          {
            name: "short",
            ttl: seconds(10),
            limit: 3,
          },
          {
            name: "medium",
            ttl: seconds(30),
            limit: 10,
          },
        ],
        storage: new ThrottlerStorageRedisService(redisService.redis),
      }),
    }),
    PrismaModule,
    EndpointsModule,
    AuthModule,
    JwtModule,
    //register prefix for all routes in EndpointsModule
    RouterModule.register([{ path: "/v2", module: EndpointsModule }]),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes("*")
      .apply(RequestIdMiddleware)
      .forRoutes("*")
      .apply(AppLoggerMiddleware)
      .forRoutes("*")
      .apply(RewriterMiddleware)
      .forRoutes("/");
  }
}
