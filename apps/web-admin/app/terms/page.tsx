import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: "Terms of Use | HiTeam",
  description: "HiTeam Terms of Use by ALT TECHNOLOGIES L.L.C.",
};

export default function TermsPage() {
  return <LegalDocumentPage document={LEGAL_DOCUMENTS.terms} />;
}
