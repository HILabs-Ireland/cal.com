import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationsService } from "@/modules/organizations/services/organizations.service";
import { PrismaModule } from "@/modules/prisma/prisma.module";
<<<<<<< HEAD
import { StripeModule } from "@/modules/stripe/stripe.module";
import { Module } from "@nestjs/common";

@Module({
  imports: [PrismaModule, StripeModule],
  providers: [OrganizationsRepository, OrganizationsService],
  exports: [OrganizationsService, OrganizationsRepository],
=======
import { RedisModule } from "@/modules/redis/redis.module";
import { TeamsEventTypesModule } from "@/modules/teams/event-types/teams-event-types.module";
import { TeamsModule } from "@/modules/teams/teams/teams.module";
import { UsersModule } from "@/modules/users/users.module";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";
import { WebhooksRepository } from "@/modules/webhooks/webhooks.repository";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    PrismaModule,
    SchedulesModule_2024_06_11,
    UsersModule,
    RedisModule,
    EmailModule,
    EventTypesModule_2024_06_14,
    TeamsEventTypesModule,
    TeamsModule,
  ],
  providers: [
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    OrganizationsService,
    OrganizationsTeamsService,
    MembershipsRepository,
    OrganizationsSchedulesService,
    OrganizationSchedulesRepository,
    OrganizationsUsersRepository,
    OrganizationsUsersService,
    EmailService,
    OrganizationsMembershipRepository,
    OrganizationsMembershipService,
    OrganizationsEventTypesService,
    InputOrganizationsEventTypesService,
    OutputOrganizationsEventTypesService,
    OrganizationsEventTypesRepository,
    OrganizationsTeamsMembershipsRepository,
    OrganizationsTeamsMembershipsService,
    OrganizationAttributesService,
    OrganizationAttributeOptionService,
    OrganizationAttributeOptionRepository,
    OrganizationAttributesRepository,
    OrganizationsWebhooksRepository,
    OrganizationsWebhooksService,
    WebhooksRepository,
    WebhooksService,
    OutputTeamEventTypesResponsePipe,
    UserOOOService,
    UserOOORepository,
    OrgUsersOOOService,
    OrgUsersOOORepository,
  ],
  exports: [
    OrganizationsService,
    OrganizationsRepository,
    OrganizationsTeamsRepository,
    OrganizationsUsersRepository,
    OrganizationsUsersService,
    OrganizationsMembershipRepository,
    OrganizationsMembershipService,
    OrganizationsTeamsMembershipsRepository,
    OrganizationsTeamsMembershipsService,
    OrganizationAttributesService,
    OrganizationAttributeOptionService,
    OrganizationAttributeOptionRepository,
    OrganizationAttributesRepository,
    OrganizationsWebhooksRepository,
    OrganizationsWebhooksService,
    WebhooksRepository,
    WebhooksService,
    OrganizationsEventTypesService,
  ],
  controllers: [
    OrganizationsTeamsController,
    OrganizationsSchedulesController,
    OrganizationsUsersController,
    OrganizationsMembershipsController,
    OrganizationsEventTypesController,
    OrganizationsTeamsMembershipsController,
    OrganizationsAttributesController,
    OrganizationsOptionsAttributesController,
    OrganizationsWebhooksController,
    OrganizationsTeamsSchedulesController,
    OrganizationsUsersOOOController,
  ],
>>>>>>> f801e1a2ae (Remove major stripe files)
})
export class OrganizationsModule {}
