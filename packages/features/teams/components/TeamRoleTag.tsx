import { useLocale } from "@calcom/lib/hooks/useLocale";

interface TeamRoleTagProps {
  role: "MEMBER" | "ADMIN" | "OWNER";
}

function TeamRoleTag({ role }: TeamRoleTagProps) {
  const { t } = useLocale();
  const roleClasses = {
    MEMBER: "bg-slate-500 text-white",
    ADMIN: "bg-blue-500 text-white",
    OWNER: "bg-amber-800 text-white",
  };

  return (
    <span className={`text-medium me-1 self-center rounded-md px-1.5 py-1 text-xs ${roleClasses[role]}`}>
      {t(role.toLowerCase())}
    </span>
  );
}

export default TeamRoleTag;
