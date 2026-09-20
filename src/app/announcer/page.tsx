import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AnnouncerEventsPage({
  searchParams
}: {
  searchParams: Promise<{ userId?: string }>
}) {
  const { userId } = await searchParams;
  const events = await prisma.event.findMany({
    orderBy: { date: "asc" }
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="mb-8 text-center md:text-left">
        <h2 className="text-2xl font-bold text-white mb-2">Selecciona el Evento a Anunciar</h2>
        <p className="text-sm text-gray-400">Selecciona el evento en el cual actuarás como animador hoy para recibir las alertas de los jueces.</p>
      </div>

      {events.length === 0 ? (
        <div className="glass-panel p-8 text-center text-gray-400 text-sm">
          No hay eventos activos en este momento.
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <Link
              key={event.id}
              href={{ pathname: `/announcer/${event.id}`, query: userId ? { userId } : {} }}
              className="block"
            >
              <div className="glass-panel p-5 flex items-center gap-6 hover:bg-white/5 border border-white/10 hover:border-warning/50 transition-all rounded-xl">
                {event.logoUrl ? (
                  <img src={event.logoUrl} alt="Logo" className="w-14 h-14 rounded-lg object-cover bg-white/5" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-warning/20 flex items-center justify-center text-2xl border border-warning/30"></div>
                )}
                <div>
                  <h3 className="font-bold text-white text-xl">{event.name}</h3>
                  <p className="text-sm text-warning font-medium mt-1">{new Date(event.date).toLocaleDateString()}</p>
                </div>
                <div className="ml-auto text-warning text-xl font-bold font-mono">EN VIVO →</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
