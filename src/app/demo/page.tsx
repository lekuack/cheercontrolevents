import DemoPinForm from "./DemoPinForm";
import Link from "next/link";

export const metadata = {
  title: "Portal de Capacitación Privado | CheerControl",
  description: "Acceso exclusivo para pruebas y capacitación de staff, jueces y animadores."
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#070d19] text-white flex flex-col justify-between p-6">
      <header className="flex items-center justify-between max-w-5xl mx-auto w-full py-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏟️</span>
          <span className="font-bold text-lg text-white tracking-wide">CheerControl <span className="text-xs bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-500/30">Capacitación</span></span>
        </div>
        <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors">
          🏠 Hub Principal
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center my-8">
        <DemoPinForm />
      </main>

      <footer className="text-center text-xs text-gray-500 py-4">
        CheerControl System • Entorno Privado de Entrenamiento Operativo
      </footer>
    </div>
  );
}
