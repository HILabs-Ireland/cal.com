import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { IsWebhookInOrg } from "@/modules/auth/guards/organizations/is-webhook-in-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { OrganizationsWebhooksService } from "@/modules/organizations/services/organizations-webhooks.service";
import { CreateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import { UpdateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import {
  TeamWebhookOutputDto as OrgWebhookOutputDto,
  TeamWebhookOutputResponseDto as OrgWebhookOutputResponseDto,
  TeamWebhooksOutputResponseDto as OrgWebhooksOutputResponseDto,
} from "@/modules/webhooks/outputs/team-webhook.output";
import { PartialWebhookInputPipe, WebhookInputPipe } from "@/modules/webhooks/pipes/WebhookInputPipe";
import { WebhookOutputPipe } from "@/modules/webhooks/pipes/WebhookOutputPipe";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";
import {
  Controller,
  UseGuards,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Delete,
  Patch,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId/webhooks",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Webhooks")
export class OrganizationsWebhooksController {
  constructor(
    private organizationsWebhooksService: OrganizationsWebhooksService,
    private webhooksService: WebhooksService
  ) {}

  @Roles("ORG_ADMIN")
  @Get("/")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all webhooks" })
  async getAllOrganizationWebhooks(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<OrgWebhooksOutputResponseDto> {
    const { skip, take } = queryParams;
    const webhooks = await this.organizationsWebhooksService.getWebhooksPaginated(
      orgId,
      skip ?? 0,
      take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: webhooks.map((webhook) =>
        plainToClass(OrgWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
          strategy: "excludeAll",
        })
      ),
    };
  }

  @Roles("ORG_ADMIN")
  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a webhook" })
  async createOrganizationWebhook(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() body: CreateWebhookInputDto
  ): Promise<OrgWebhookOutputResponseDto> {
    const webhook = await this.organizationsWebhooksService.createWebhook(
      orgId,
      new WebhookInputPipe().transform(body)
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Roles("ORG_ADMIN")
  @UseGuards(IsWebhookInOrg)
  @Get("/:webhookId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a webhook" })
  async getOrganizationWebhook(@Param("webhookId") webhookId: string): Promise<OrgWebhookOutputResponseDto> {
    const webhook = await this.organizationsWebhooksService.getWebhook(webhookId);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Roles("ORG_ADMIN")
  @UseGuards(IsWebhookInOrg)
  @Delete("/:webhookId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a webhook" })
  async deleteWebhook(@Param("webhookId") webhookId: string): Promise<OrgWebhookOutputResponseDto> {
    const webhook = await this.webhooksService.deleteWebhook(webhookId);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Roles("ORG_ADMIN")
  @UseGuards(IsWebhookInOrg)
  @Patch("/:webhookId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update a webhook" })
  async updateOrgWebhook(
    @Param("webhookId") webhookId: string,
    @Body() body: UpdateWebhookInputDto
  ): Promise<OrgWebhookOutputResponseDto> {
    const webhook = await this.organizationsWebhooksService.updateWebhook(
      webhookId,
      new PartialWebhookInputPipe().transform(body)
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }
}
