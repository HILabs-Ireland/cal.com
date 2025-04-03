import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Logger } from "@nestjs/common";
import { Injectable } from "@nestjs/common";

import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class ConferencingAtomsService {
  private logger = new Logger("ConferencingAtomService");

  constructor(private readonly dbWrite: PrismaWriteService) {}

  async getConferencingApps(user: UserWithProfile): Promise<null> {
    return null;
  }
}
