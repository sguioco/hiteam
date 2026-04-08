export type JwtUser = {
  sub: string;
  tenantId: string;
  email: string;
  roleCodes: string[];
  workspaceAccessAllowed: boolean;
};
