import { AssignmentReasonEnum } from "@calcom/prisma/enums";

const assignmentReasonBadgeTitleMap = (assignmentReason: AssignmentReasonEnum) => {
  switch (assignmentReason) {
    case AssignmentReasonEnum.REASSIGNED:
      return "reassigned";
    case AssignmentReasonEnum.REROUTED:
      return "rerouted";
    default:
      return "routed";
  }
};

export default assignmentReasonBadgeTitleMap;
