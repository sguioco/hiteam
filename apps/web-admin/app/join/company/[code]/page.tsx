import CompanyJoinLandingPageClient from "./company-join-landing-page-client";

type CompanyJoinLandingPageProps = {
  params: Promise<{ code: string }>;
};

export default async function CompanyJoinLandingPage({
  params,
}: CompanyJoinLandingPageProps) {
  const { code } = await params;
  return <CompanyJoinLandingPageClient code={code} />;
}
