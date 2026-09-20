import { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import LogoutButton from "@/components/LogoutButton";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, role: true }
  });

  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "PRODUCER_ADMIN")) {
    redirect("/login");
  }

  const userName = user.name;
  const userRole = user.role === "SUPER_ADMIN" ? "Super Admin" : "Productor";

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="w-full md:w-64 glass-panel m-4 flex flex-col p-4 space-y-4 rounded-xl border-l-4 border-l-warning">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Productor</h2>
          <p className="text-xs text-gray-400">Panel de Control</p>
        </div>
        <nav className="flex flex-col space-y-2 flex-1">
          <Link href="/admin" className="p-3 rounded-lg hover:bg-white/10 transition-colors font-medium">🏆 Mis Eventos</Link>
          <Link href="/admin/institutions" className="p-3 rounded-lg hover:bg-white/10 transition-colors font-medium">🏅 Clubes y Equipos</Link>
          <Link href="/admin/staff" className="p-3 rounded-lg hover:bg-white/10 transition-colors font-medium">👥 Cuentas de Staff</Link>
          <Link href="/superadmin" className="p-3 rounded-lg hover:bg-white/10 transition-colors font-medium text-gray-400">🏢 Super Admin</Link>
          <Link href="/" className="p-3 rounded-lg hover:bg-white/10 transition-colors font-medium text-gray-400">⬅️ Hub Principal</Link>

          {/* Hub de Pruebas */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-[10px] uppercase font-bold text-purple-400 px-3 mb-2 tracking-widest flex items-center gap-1.5">
              <span>🧪</span> Hub de Pruebas
            </p>
            <div className="space-y-1">
              <Link href="/staff" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-purple-500/10 text-gray-400 hover:text-purple-300 transition-colors text-xs font-medium">
                <span>📱</span> Panel Staff
              </Link>
              <Link href="/judge" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-purple-500/10 text-gray-400 hover:text-purple-300 transition-colors text-xs font-medium">
                <span>⚖️</span> Panel Jueces
              </Link>
              <Link href="/announcer" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-purple-500/10 text-gray-400 hover:text-purple-300 transition-colors text-xs font-medium">
                <span>🎤</span> Panel Animador
              </Link>
              <Link href="/tv-pair" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-purple-500/10 text-gray-400 hover:text-purple-300 transition-colors text-xs font-medium">
                <span>📺</span> Vincular Pantalla TV
              </Link>
              <a href="/tv" target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-purple-500/10 text-gray-400 hover:text-purple-300 transition-colors text-xs font-medium">
                <span>🖥️</span> Abrir TV (`/tv`)
              </a>
              <Link href="/public" className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-purple-500/10 text-gray-400 hover:text-purple-300 transition-colors text-xs font-medium">
                <span>🏆</span> Vista Pública
              </Link>
            </div>
          </div>
        </nav>
        {/* Sesión activa */}
        <div className="border-t border-white/10 pt-4 space-y-2">
          <div className="px-2">
            <p className="text-xs text-gray-500">Sesión activa como</p>
            <p className="text-sm font-bold text-white truncate">{userName}</p>
            <p className="text-[10px] text-warning">{userRole}</p>
          </div>
          <LogoutButton redirectTo="/" label="🔒 Cerrar Sesión" className="w-full text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 hover:text-red-300 py-2 rounded-lg transition-all font-semibold" />
        </div>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
