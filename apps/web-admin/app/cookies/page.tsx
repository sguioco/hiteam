import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: "Cookie Policy | HiTeam",
  description: "HiTeam Cookie Policy by ALT TECHNOLOGIES L.L.C.",
};

export default function CookiesPage() {
  return <LegalDocumentPage document={LEGAL_DOCUMENTS.cookies} />;
}
