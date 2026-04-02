export type PublicInvitationPayload = {
  id: string;
  email: string;
  status: string;
  tenantName: string;
  tenantSlug: string;
  companyName?: string | null;
  companyCode?: string | null;
  expiresAt: string;
  submittedAt: string | null;
  registrationCompleted: boolean;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};
