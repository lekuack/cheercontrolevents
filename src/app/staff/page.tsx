import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function StaffEventsPage({
  searchParams
}: {
  searchParams: Promise<{ userId?: string }>
}) {
  const { userId } = await searchParams;
  const events = await prisma.event.findMany({
    orderBy: { date: "asc" }
  });

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-2">Selecciona un Evento</h2>
        <p className="text-sm text-gray-400">¿A qué evento estás asignado hoy?</p>
      </div>

      {events.length === 0 ? (
        <div className="glass-panel p-6 text-center text-gray-400 text-sm">
          No hay eventos activos.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <Link 
              key={event.id} 
              href={{ pathname: `/staff/${event.id}`, query: userId ? { userId } : {} }} 
              className="block"
            >
              <div className="glass-panel p-4 flex items-center gap-4 hover:bg-white/5 active:bg-white/10 transition-colors">
                {event.logoUrl ? (
                  <img src={event.logoUrl} alt="Logo" className="w-10 h-10 rounded-md object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center">🏟️</div>
                )}
                <div>
                  <h3 className="font-bold text-white text-lg">{event.name}</h3>
                  <p className="text-xs text-primary">{new Date(event.date).toLocaleDateString()}</p>
                </div>
                <div className="ml-auto text-gray-500">👉</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
