import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import ProducerLoginForm from "./ProducerLoginForm";

interface Props {
  params: Promise<{ subdomain: string }>;
}

export default async function ProducerLoginPage({ params }: Props) {
  const { subdomain } = await params;

  const producer = await prisma.producer.findUnique({ where: { subdomain } });
  if (!producer) notFound();

  // Verificar si ya hay sesión activa de un usuario de ESTA producción
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, producerId: true }
    });

    if (user && user.producerId === producer.id) {
      // Sesión activa para esta producción → redirigir al panel correspondiente
      if (user.role === "STAFF") redirect(`/staff?userId=${userId}`);
      if (user.role === "JUDGE") redirect(`/judge?userId=${userId}`);
      if (user.role === "ANNOUNCER") redirect(`/announcer?userId=${userId}`);
      if (user.role === "PRODUCER_ADMIN") redirect("/admin");
    }
  }

  return (
    <ProducerLoginForm
      producerId={producer.id}
      producerName={producer.name}
      producerLogo={producer.logoUrl}
      subdomain={subdomain}
    />
  );
}
