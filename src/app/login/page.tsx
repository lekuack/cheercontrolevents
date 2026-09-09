import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import LoginForm from "./LoginForm";

// Verificar sesión activa en el servidor antes de renderizar el formulario
export default async function LoginPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      // Ya hay sesión activa — redirigir según rol
      if (user.role === "SUPER_ADMIN" || user.role === "PRODUCER_ADMIN") {
        redirect("/admin");
      } else if (user.role === "STAFF") {
        redirect(`/staff?userId=${user.id}`);
      } else if (user.role === "JUDGE") {
        redirect(`/judge?userId=${user.id}`);
      } else if (user.role === "ANNOUNCER") {
        redirect(`/announcer?userId=${user.id}`);
      }
    }
  }

  return <LoginForm />;
}
