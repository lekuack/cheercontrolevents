import { redirect } from "next/navigation";

export default async function AdminTvPairRedirect({
  searchParams,
}: {
  searchParams: Promise<{ pin?: string }>;
}) {
  const params = await searchParams;
  const pin = params?.pin;
  if (pin) {
    redirect(`/tv-pair?pin=${pin}`);
  }
  redirect("/tv-pair");
}
