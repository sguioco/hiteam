import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";

export const metadata: Metadata = {
  title: "Data Processing Agreement | HiTeam",
  description: "HiTeam Data Processing Agreement by ALT TECHNOLOGIES L.L.C.",
};

export default function DpaPage() {
  return <LegalDocumentPage document={LEGAL_DOCUMENTS.dpa} />;
}
