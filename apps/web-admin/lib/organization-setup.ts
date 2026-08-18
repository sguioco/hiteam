import { toAdminHref } from "./admin-routes";

export const ORGANIZATION_SETUP_REQUIRED_EVENT =
  "smart:organization-setup-required";
export const ORGANIZATION_SETUP_REQUIRED_STORAGE_KEY =
  "smart:organization-setup-required-pending";

export function isOrganizationSetupAllowedPath(pathname: string) {
  return (
    pathname === toAdminHref("/organization") ||
    pathname === toAdminHref("/billing")
  );
}
