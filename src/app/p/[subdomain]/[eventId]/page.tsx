import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicEventTabs from "@/components/PublicEventTabs";
import DemoStationSwitcher from "@/components/DemoStationSwitcher";

interface Props {
  params: Promise<{ subdomain: string; eventId: string }>;
}

export default async function ProducerEventPage({ params }: Props) {
  const { subdomain, eventId } = await params;

  const producer = await prisma.producer.findUnique({ where: { subdomain } });
  if (!producer) notFound();

  const event = await prisma.event.findFirst({
    where: { id: eventId, producerId: producer.id },
    include: {
      teams: {
        include: { team: { include: { institution: true } } }
      },
      sessions: {
        orderBy: { date: "asc" },
        include: {
          schedules: {
            include: { team: { include: { institution: true } } },
            orderBy: { orderIndex: "asc" }
          }
        }
      }
    }
  });

  if (!event) notFound();

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const eventMidnight = new Date(event.date);
  eventMidnight.setHours(0, 0, 0, 0);

  const isToday = todayMidnight.getTime() === eventMidnight.getTime();
  const isPast = eventMidnight < todayMidnight;

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ 
        background: event.pageBgGradientFrom 
          ? `linear-gradient(to bottom, ${event.pageBgGradientFrom}, ${event.pageBgGradientVia || event.pageBgGradientFrom}, ${event.pageBgGradientTo || event.pageBgGradientFrom})` 
          : (event.pageBgColor || "#050b18"),
        fontFamily: event.fontFamily || "Inter"
      }}
    >
      {/* Switcher de Puesto para Capacitaciones / Demos */}
      {event.isDemo && (
        <DemoStationSwitcher
          eventId={event.id}
          demoPin={event.demoPin || "1234"}
          activeRole="PUBLIC_WEB"
        />
      )}
      {/* Header */}
      <header className="border-b border-white/5 bg-black/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/p/${subdomain}`}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition-colors"
            >
              ←
            </Link>
            {producer.logoUrl ? (
              <img src={producer.logoUrl} alt={producer.name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-white text-sm">
                {producer.name.charAt(0)}
              </div>
            )}
            <span className="text-white font-semibold text-sm hidden sm:block">{producer.name}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 space-y-6">

        {/* Hero del Evento */}
        <section className="flex flex-col sm:flex-row gap-5 items-start">
          {event.logoUrl ? (
            <div className="w-24 h-24 rounded-2xl bg-black/40 border border-white/10 shadow-2xl flex-shrink-0 flex items-center justify-center p-2 overflow-hidden">
              <img
                src={event.logoUrl}
                alt={event.name}
                className="max-w-full max-h-full object-contain rounded-xl"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/30 to-violet-700/30 border border-primary/20 flex items-center justify-center text-4xl flex-shrink-0">
              🏆
            </div>
          )}
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {isToday && (
                <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  En Curso Hoy
                </span>
              )}
              {isPast && (
                <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-gray-500 text-xs font-bold px-3 py-1 rounded-full">
                  Finalizado
                </span>
              )}
              {!isToday && !isPast && (
                <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 text-primary text-xs font-bold px-3 py-1 rounded-full">
                  Próximamente
                </span>
              )}
            </div>
            <h1 className={`text-${event.titleFontSize || "3xl"} font-black leading-tight`} style={{ color: event.titleColor || "#ffffff" }}>
              {event.name}
            </h1>
            <p className="text-gray-400 mt-1.5 text-sm">
              📅 {new Date(event.date).toLocaleDateString("es-CL", {
                weekday: "long", day: "numeric", month: "long", year: "numeric"
              })}
            </p>
          </div>
        </section>

        {/* Pestañas del evento */}
        <PublicEventTabs event={event as any} isToday={isToday} />

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-5 px-4 mt-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href={`/p/${subdomain}`} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            ← Volver a {producer.name}
          </Link>
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
