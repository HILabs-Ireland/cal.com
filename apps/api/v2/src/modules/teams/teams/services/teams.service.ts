import { TeamsMembershipsRepository } from "@/modules/teams/memberships/teams-memberships.repository";
import { CreateTeamInput } from "@/modules/teams/teams/inputs/create-team.input";
import { UpdateTeamDto } from "@/modules/teams/teams/inputs/update-team.input";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TeamsService {
  constructor(
    private readonly teamsRepository: TeamsRepository,
    private readonly teamsMembershipsRepository: TeamsMembershipsRepository,
    private readonly configService: ConfigService
  ) {}

  async createTeam(input: CreateTeamInput, ownerId: number) {
    const { autoAcceptCreator, ...teamData } = input;

    const existingTeam = await this.teamsMembershipsRepository.findTeamMembershipsByNameAndUser(
      input.name,
      ownerId
    );
    if (existingTeam) {
      throw new BadRequestException({
        message: `You already have created a team with name=${input.name}`,
      });
    }

    const team = await this.teamsRepository.create(teamData);
    await this.teamsMembershipsRepository.createTeamMembership(team.id, {
      userId: ownerId,
      role: "OWNER",
      accepted: !!autoAcceptCreator,
    });
    return team;
  }

  async getUserTeams(userId: number) {
    const teams = await this.teamsRepository.getTeamsUserIsMemberOf(userId);
    return teams;
  }

  async updateTeam(teamId: number, data: UpdateTeamDto) {
    const team = await this.teamsRepository.update(teamId, data);
    return team;
  }
}
