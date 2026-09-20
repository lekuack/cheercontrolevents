import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import TvLiveDisplay from "@/components/TvLiveDisplay";
import Link from "next/link";

interface Props {
  params: Promise<{ eventId: string }>;
}

export default async function DedicatedTvPage({ params }: Props) {
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      producer: true,
      schedules: {
        include: { team: { include: { institution: true } } },
        orderBy: { orderIndex: "asc" }
      }
    }
  });

  if (!event) notFound();

  // Determinar logo del evento o de la productora creadora
  const logoSrc = event.logoUrl || event.producer?.logoUrl;

  // Filtrar presentaciones con equipo
  const allSchedules = event.schedules.filter(s => s.type !== "BREAK" && s.team);

  return (
    <div className="min-h-screen bg-[#070d19] text-white p-4 sm:p-6 space-y-6 flex flex-col justify-between tv-mode">
      <div>
        {/* Header Exclusivo TV */}
        <div className="flex items-center justify-between glass-panel p-4 rounded-2xl border border-white/10 mb-6">
          <div className="flex items-center gap-3">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={event.name}
                className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-md flex-shrink-0"
              />
            ) : null}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">{event.name}</h1>
              <p className="text-xs text-primary font-bold">Pantalla Oficial de Transmisión del Evento</p>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs bg-white/5 hover:bg-white/10 text-gray-400 px-3 py-1.5 rounded-full transition-colors hidden sm:block"
          >
            Hub
          </Link>
        </div>

        {/* Pantalla Exclusiva de Transmisión TV en Vivo */}
        <TvLiveDisplay
          eventId={event.id}
          schedules={allSchedules as any}
          tickerIntervalSeconds={25}
        />
      </div>

      <footer className="text-center text-[10px] text-gray-600 border-t border-white/5 pt-4">
        CheerControl TV Broadcast System • Transmisión Oficial en Vivo
      </footer>
    </div>
  );
}
