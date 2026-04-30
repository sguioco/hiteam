import { redirect } from "next/navigation";
import { toAdminHref } from "@/lib/admin-routes";

export default function OrganizationBillingRedirectPage() {
  redirect(toAdminHref("/billing"));
}
