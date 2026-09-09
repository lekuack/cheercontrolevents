import { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true }
  });

  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const userName = user.name;
  const userEmail = user.email;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="w-full md:w-64 glass-panel m-4 flex flex-col p-4 space-y-4 rounded-xl border-l-4 border-l-accent">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Super Admin</h2>
          <p className="text-xs text-gray-400">SaaS Management</p>
        </div>
        <nav className="flex flex-col space-y-2 flex-1">
          <Link href="/superadmin" className="p-3 rounded-lg hover:bg-white/10 transition-colors font-medium">🏢 Productores</Link>
          <Link href="/admin" className="p-3 rounded-lg hover:bg-white/10 transition-colors font-medium text-gray-400">⚙️ Panel de Productor</Link>
          <Link href="/" className="p-3 rounded-lg hover:bg-white/10 transition-colors font-medium text-gray-400">⬅️ Hub Principal</Link>
        </nav>
        {/* Sesión activa */}
        <div className="border-t border-white/10 pt-4 space-y-2">
          <div className="px-2">
            <p className="text-xs text-gray-500">Sesión activa como</p>
            <p className="text-sm font-bold text-white truncate">{userName}</p>
            <p className="text-[10px] text-blue-400 truncate">{userEmail}</p>
          </div>
          <LogoutButton
            redirectTo="/"
            label="🔒 Cerrar Sesión"
            className="w-full text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 hover:text-red-300 py-2 rounded-lg transition-all font-semibold"
          />
        </div>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
