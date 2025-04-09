import logger from "@calcom/lib/logger";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM } from "@calcom/types/CrmService";

import appStore from "..";

type Class<I, Args extends any[] = any[]> = new (...args: Args) => I;

type CrmClass = Class<CRM, [CredentialPayload, any]>;

const log = logger.getSubLogger({ prefix: ["CrmManager"] });
export const getCrm = async (credential: CredentialPayload, appOptions: any) => {
  if (!credential || !credential.key) return null;
  const { type: crmType } = credential;

  const crmName = crmType.split("_")[0];

  const crmAppImportFn = appStore[crmName as keyof typeof appStore];

  if (!crmAppImportFn) {
    log.warn(`crm of type ${crmType} is not implemented`);
    return null;
  }

  return null;
};

export default getCrm;
