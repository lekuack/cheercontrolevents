import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function Home() {
  const producers = await prisma.producer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { events: true } }
    }
  });

  return (
    <main className="min-h-screen flex flex-col bg-radial-gradient">
      {/* Hero Header */}
      <header className="py-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 blur-[120px] rounded-full" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs text-gray-400 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Plataforma de Gestión de Eventos
          </div>
          <h1 className="text-6xl md:text-7xl font-black tracking-tight mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500">
              CheerControl
            </span>
            <br />
            <span className="text-white text-5xl md:text-6xl font-bold">Events</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mt-4">
            Sistema de gestión en tiempo real para eventos de Cheerleading. 
            Cronogramas, estaciones, jueces y animadores, todo sincronizado.
          </p>
        </div>
      </header>

      {/* Productoras Section */}
      <section className="flex-1 px-6 pb-16 max-w-6xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Productoras</h2>
            <p className="text-sm text-gray-500 mt-1">Selecciona la organización de tu evento</p>
          </div>
          <span className="text-xs text-gray-600 border border-white/5 bg-white/3 px-3 py-1 rounded-full">
            {producers.length} productora{producers.length !== 1 ? "s" : ""} activa{producers.length !== 1 ? "s" : ""}
          </span>
        </div>

        {producers.length === 0 ? (
          <div className="glass-panel p-12 text-center space-y-4">
            <div className="text-5xl">🏟️</div>
            <h3 className="text-xl font-bold text-white">Sin productoras registradas</h3>
            <p className="text-gray-400 text-sm">
              Accede al panel de Super Admin para crear la primera productora.
            </p>
            <Link href="/superadmin" className="btn-primary inline-block mt-2">
              Ir a Super Admin
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {producers.map(producer => (
              <Link
                key={producer.id}
                href={`/p/${producer.subdomain}`}
                className="group block"
              >
                <div className="glass-panel p-6 h-full border border-white/5 hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 flex flex-col">
                  {/* Logo / Avatar */}
                  <div className="flex items-center gap-4 mb-5">
                    {producer.logoUrl ? (
                      <img
                        src={producer.logoUrl}
                        alt={producer.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-violet-600/30 border border-primary/20 flex items-center justify-center text-2xl font-black text-white">
                        {producer.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-lg leading-tight truncate group-hover:text-primary transition-colors">
                        {producer.name}
                      </h3>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        @{producer.subdomain}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/5">
                    <span className="text-xs text-gray-400">
                      🗓️ {producer._count.events} evento{producer._count.events !== 1 ? "s" : ""}
                    </span>
                    <span className="ml-auto text-xs font-bold text-primary group-hover:translate-x-1 transition-transform inline-block">
                      Ver eventos →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer / Dev Links */}
      <footer className="border-t border-white/5 py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            CheerControl Events — Sistema de Gestión de Competencias
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <Link href="/login" className="hover:text-gray-400 transition-colors">
              Acceso Operativo
            </Link>
            <span className="text-white/10">|</span>
            <Link href="/admin-access" className="hover:text-gray-400 transition-colors">
              Acceso Administrativo
            </Link>
            <span className="text-white/10">|</span>
            <Link href="/superadmin" className="hover:text-gray-400 transition-colors">
              Super Admin
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
