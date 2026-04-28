export type PublicInvitationPayload = {
  id: string;
  email: string | null;
  status: string;
  tenantName: string;
  tenantSlug: string;
  companyName?: string | null;
  expiresAt: string;
  submittedAt: string | null;
  registrationCompleted: boolean;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};
