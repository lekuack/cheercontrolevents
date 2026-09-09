import { ReactNode } from "react";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a]">
      {/* Mobile Navbar */}
      <nav className="glass-panel sticky top-0 z-50 flex items-center justify-between p-4 rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📱</span>
          <div>
            <h1 className="font-bold text-white">Staff App</h1>
            <p className="text-xs text-primary">Control de Tiempos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors text-gray-400">
            🏠 Hub
          </Link>
          <LogoutButton redirectTo="/login" label="🔒 Salir" />
        </div>
      </nav>

      {/* Main Content (Mobile Optimized) */}
      <main className="flex-1 p-4 pb-24 max-w-lg mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
