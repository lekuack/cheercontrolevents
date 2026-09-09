import { ReactNode } from "react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function AnnouncerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-white">
      {/* High-visibility Nav */}
      <nav className="glass-panel sticky top-0 z-50 flex items-center justify-between px-6 py-4 rounded-none border-x-0 border-t-0 bg-slate-950/80 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎙️</span>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-white">Consola de Animador</h1>
            <p className="text-xs text-warning font-semibold">Alertas en Tiempo Real & Presentaciones</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-warning/20 text-warning px-3 py-1 rounded-full font-bold border border-warning/30 animate-pulse">
            En Vivo 🟢
          </span>
          <Link href="/" className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors text-gray-400">
            🏠 Hub
          </Link>
          <LogoutButton redirectTo="/login" label="🔒 Salir" />
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
