import { redirect } from "next/navigation";

type SignupPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = searchParams ? await searchParams : {};
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (item) query.append(key, item);
      }
    }
  }

  const suffix = query.toString();
  redirect(suffix ? `/create?${suffix}` : "/create");
}
