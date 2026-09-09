import { ReactNode } from "react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function JudgeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a] text-white">
      {/* Tablet-optimized Header */}
      <header className="glass-panel sticky top-0 z-50 flex items-center justify-between px-6 py-4 rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⚖️</span>
          <div>
            <h1 className="font-bold text-xl text-white">Panel de Jueces</h1>
            <p className="text-xs text-primary">Evaluación y Control del Evento</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-bold border border-primary/30">
            Modo Tablet 📱
          </span>
          <Link href="/" className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors text-gray-400">
            🏠 Hub
          </Link>
          <LogoutButton redirectTo="/login" label="🔒 Salir" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
