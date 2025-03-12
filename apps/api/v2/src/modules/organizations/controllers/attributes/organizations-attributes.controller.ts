import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateOrganizationAttributeInput } from "@/modules/organizations/inputs/attributes/create-organization-attribute.input";
import { UpdateOrganizationAttributeInput } from "@/modules/organizations/inputs/attributes/update-organization-attribute.input";
import { CreateOrganizationAttributesOutput } from "@/modules/organizations/outputs/attributes/create-organization-attributes.output";
import { DeleteOrganizationAttributesOutput } from "@/modules/organizations/outputs/attributes/delete-organization-attributes.output";
import {
  GetOrganizationAttributesOutput,
  GetSingleAttributeOutput,
} from "@/modules/organizations/outputs/attributes/get-organization-attributes.output";
import { UpdateOrganizationAttributesOutput } from "@/modules/organizations/outputs/attributes/update-organization-attributes.output";
import { OrganizationAttributesService } from "@/modules/organizations/services/attributes/organization-attributes.service";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Attributes")
export class OrganizationsAttributesController {
  constructor(private readonly organizationsAttributesService: OrganizationAttributesService) {}
  // Gets all attributes for an organization
  @Roles("ORG_MEMBER")
  @Get("/attributes")
  @ApiOperation({ summary: "Get all attributes" })
  async getOrganizationAttributes(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<GetOrganizationAttributesOutput> {
    const { skip, take } = queryParams;
    const attributes = await this.organizationsAttributesService.getOrganizationAttributes(orgId, skip, take);

    return {
      status: SUCCESS_STATUS,
      data: attributes,
    };
  }

  // Gets a single attribute for an organization
  @Roles("ORG_MEMBER")
  @Get("/attributes/:attributeId")
  @ApiOperation({ summary: "Get an attribute" })
  async getOrganizationAttribute(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string
  ): Promise<GetSingleAttributeOutput> {
    const attribute = await this.organizationsAttributesService.getOrganizationAttribute(orgId, attributeId);
    return {
      status: SUCCESS_STATUS,
      data: attribute,
    };
  }

  // Creates an attribute for an organization
  @Roles("ORG_ADMIN")
  @Post("/attributes")
  @ApiOperation({ summary: "Create an attribute" })
  async createOrganizationAttribute(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() bodyAttribute: CreateOrganizationAttributeInput
  ): Promise<CreateOrganizationAttributesOutput> {
    const attribute = await this.organizationsAttributesService.createOrganizationAttribute(
      orgId,
      bodyAttribute
    );
    return {
      status: SUCCESS_STATUS,
      data: attribute,
    };
  }

  // Updates an attribute for an organization
  @Roles("ORG_ADMIN")
  @Patch("/attributes/:attributeId")
  @ApiOperation({ summary: "Update an attribute" })
  async updateOrganizationAttribute(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string,
    @Body() bodyAttribute: UpdateOrganizationAttributeInput
  ): Promise<UpdateOrganizationAttributesOutput> {
    const attribute = await this.organizationsAttributesService.updateOrganizationAttribute(
      orgId,
      attributeId,
      bodyAttribute
    );
    return {
      status: SUCCESS_STATUS,
      data: attribute,
    };
  }

  // Deletes an attribute for an organization
  @Roles("ORG_ADMIN")
  @Delete("/attributes/:attributeId")
  @ApiOperation({ summary: "Delete an attribute" })
  async deleteOrganizationAttribute(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string
  ): Promise<DeleteOrganizationAttributesOutput> {
    const attribute = await this.organizationsAttributesService.deleteOrganizationAttribute(
      orgId,
      attributeId
    );
    return {
      status: SUCCESS_STATUS,
      data: attribute,
    };
  }
}
