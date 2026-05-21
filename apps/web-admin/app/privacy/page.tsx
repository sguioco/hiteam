import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: "Privacy Policy | HiTeam",
  description: "HiTeam Privacy Policy by ALT TECHNOLOGIES L.L.C.",
};

export default function PrivacyPage() {
  return <LegalDocumentPage document={LEGAL_DOCUMENTS.privacy} />;
}
