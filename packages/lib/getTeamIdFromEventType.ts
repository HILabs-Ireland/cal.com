export async function getTeamIdFromEventType({
  eventType,
}: {
  eventType: { team: { id: number | null } | null; parentId: number | null };
}) {
  if (!eventType) {
    return null;
  }

  if (eventType?.team?.id) {
    return eventType.team.id;
  }
}
