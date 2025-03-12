import { PlatformEndpointsModule } from "@/ee/platform-endpoints-module";
<<<<<<< HEAD
import { BillingModule } from "@/modules/billing/billing.module";
=======
import { AtomsModule } from "@/modules/atoms/atoms.module";
import { ConferencingModule } from "@/modules/conferencing/conferencing.module";
import { DestinationCalendarsModule } from "@/modules/destination-calendars/destination-calendars.module";
>>>>>>> 6530483014 (Remove usage from booking service and modules)
import { OAuthClientModule } from "@/modules/oauth-clients/oauth-client.module";
import { TimezoneModule } from "@/modules/timezones/timezones.module";
import type { MiddlewareConsumer, NestModule } from "@nestjs/common";
import { Module } from "@nestjs/common";

@Module({
<<<<<<< HEAD
  imports: [OAuthClientModule, BillingModule, PlatformEndpointsModule, TimezoneModule],
=======
  imports: [
    OAuthClientModule,
    PlatformEndpointsModule,
    TimezoneModule,
    UsersModule,
    WebhooksModule,
    DestinationCalendarsModule,
    AtomsModule,
    StripeModule,
    ConferencingModule,
    RouterModule,
  ],
>>>>>>> 6530483014 (Remove usage from booking service and modules)
})
export class EndpointsModule implements NestModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(_consumer: MiddlewareConsumer) {
    // TODO: apply ratelimits
  }
}
