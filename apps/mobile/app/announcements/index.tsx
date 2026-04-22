import { Redirect } from "expo-router";
import { hasManagerAccess, useAuthFlowState } from "../../lib/auth-flow";

export default function AnnouncementsRoute() {
  const { roleCodes } = useAuthFlowState();

  return (
    <Redirect
      href={hasManagerAccess(roleCodes) ? "/?tab=news" : "/?tab=calendar"}
    />
  );
}
