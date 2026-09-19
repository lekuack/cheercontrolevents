import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ subdomain: string }>;
}

export default async function ProducerPortalPage({ params }: Props) {
  const { subdomain } = await params;

  const producer = await prisma.producer.findUnique({
    where: { subdomain },
    include: {
      events: {
        where: { isDemo: false },
        orderBy: { date: "asc" }
      }
    }
  });

  if (!producer) notFound();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Separar eventos del día, futuros y pasados
  const todayEvents = producer.events.filter(e => {
    const d = new Date(e.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  const upcomingEvents = producer.events.filter(e => {
    const d = new Date(e.date);
    d.setHours(0, 0, 0, 0);
    return d > today;
  });

  const pastEvents = producer.events.filter(e => {
    const d = new Date(e.date);
    d.setHours(0, 0, 0, 0);
    return d < today;
  });

  // Si hay evento del día y solo uno, redirigir directo (lo haremos con un banner de acceso rápido)
  const featuredEvent = todayEvents[0] ?? upcomingEvents[0] ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-[#050b18]">
      {/* Header del Portal */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {producer.logoUrl ? (
              <img src={producer.logoUrl} alt={producer.name} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/40 to-violet-600/40 flex items-center justify-center font-black text-white text-lg">
                {producer.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-black text-white text-sm leading-tight">{producer.name}</h1>
              <p className="text-[10px] text-gray-500">Portal de Eventos</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10 space-y-12">

        {/* Si hay evento HOY → Banner destacado */}
        {todayEvents.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></span>
              <h2 className="text-xs font-bold uppercase tracking-widest text-green-400">En Curso Hoy</h2>
            </div>
            <div className="grid gap-4">
              {todayEvents.map(event => (
                <Link key={event.id} href={`/p/${subdomain}/${event.id}`} className="group block">
                  <div className="relative overflow-hidden glass-panel p-6 border border-green-500/20 hover:border-green-500/50 transition-all rounded-2xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-900/20 to-transparent pointer-events-none" />
                    <div className="relative z-10 flex items-center gap-5">
                      {event.logoUrl ? (
                        <img src={event.logoUrl} alt={event.name} className="w-16 h-16 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-green-900/40 border border-green-500/30 flex items-center justify-center text-3xl flex-shrink-0">🏆</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-black text-white group-hover:text-green-300 transition-colors">{event.name}</h3>
                        <p className="text-sm text-green-400 font-semibold mt-0.5">
                          {new Date(event.date).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                      </div>
                      <div className="text-green-400 font-bold text-sm group-hover:translate-x-1 transition-transform">
                        Ver →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Próximos Eventos */}
        {upcomingEvents.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">Próximos Eventos</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {upcomingEvents.map(event => (
                <Link key={event.id} href={`/p/${subdomain}/${event.id}`} className="group block">
                  <div className="glass-panel p-5 border border-white/5 hover:border-primary/30 transition-all rounded-2xl h-full">
                    <div className="flex items-center gap-4">
                      {event.logoUrl ? (
                        <img src={event.logoUrl} alt={event.name} className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl flex-shrink-0">🗓️</div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-white group-hover:text-primary transition-colors truncate">{event.name}</h3>
                        <p className="text-xs text-primary mt-0.5 font-medium">
                          {new Date(event.date).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Sin eventos activos */}
        {todayEvents.length === 0 && upcomingEvents.length === 0 && (
          <section className="py-20 text-center space-y-4">
            <div className="text-5xl">🏟️</div>
            <h2 className="text-2xl font-bold text-white">{producer.name}</h2>
            <p className="text-gray-400 text-sm max-w-sm mx-auto">
              No hay eventos programados próximamente. Vuelve a revisar pronto.
            </p>
          </section>
        )}

        {/* Eventos Pasados (colapsados) */}
        {pastEvents.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600">Eventos Pasados</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pastEvents.map(event => (
                <Link key={event.id} href={`/p/${subdomain}/${event.id}`} className="group block opacity-50 hover:opacity-80 transition-opacity">
                  <div className="glass-panel p-4 border border-white/5 rounded-xl flex items-center gap-3">
                    {event.logoUrl ? (
                      <img src={event.logoUrl} alt={event.name} className="w-9 h-9 rounded-lg object-cover grayscale flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-lg flex-shrink-0">📋</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-300 truncate">{event.name}</p>
                      <p className="text-[10px] text-gray-600">
                        {new Date(event.date).toLocaleDateString("es-CL")}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer con acceso equipo */}
      <footer className="border-t border-white/5 py-5 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-xs text-gray-700">{producer.name} · Powered by CheerControl Events</p>
          <Link
            href={`/p/${subdomain}/login`}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors font-semibold"
          >
            Acceso
          </Link>
        </div>
      </footer>
    </div>
  );
}
