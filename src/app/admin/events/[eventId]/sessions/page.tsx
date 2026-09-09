import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SessionManager from "@/components/SessionManager";
import Link from "next/link";

import { calculateScheduleTimes } from "@/lib/scheduleEngine";

export default async function SessionsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      sessions: {
        include: {
          schedules: {
            orderBy: { orderIndex: "asc" },
            include: {
              team: {
                include: { institution: true }
              }
            }
          }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!event) notFound();

  // Forzar recálculo dinámico en memoria para que la vista siempre refleje las duraciones y zonas exactas
  event.sessions.forEach(session => {
    const calculated = calculateScheduleTimes(
      session as any, 
      session.schedules as any,
      event.warmupZonesCount,
      event.springfloorZonesCount,
      event.registrationZonesCount
    );
    session.schedules = calculated as any;
  });

  // Traer los equipos participantes asignados a este evento
  const eventTeams = await prisma.eventTeam.findMany({
    where: { eventId },
    include: {
      team: {
        include: { institution: true }
      }
    }
  });

  const availableTeams = eventTeams.map(et => et.team).sort((a, b) => {
    const instNameA = a.institution?.name || "";
    const instNameB = b.institution?.name || "";
    if (instNameA !== instNameB) return instNameA.localeCompare(instNameB);
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center glass-panel p-6 border-l-4 border-l-primary">
        <div>
          <div className="text-xs text-gray-400">Configuración de Jornadas</div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
            <span>Cronograma: {event.name}</span>
          </h1>
        </div>
        <Link href={`/admin/events/${eventId}`} className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-sm text-white font-bold transition">
          Volver al Evento
        </Link>
      </div>

      <SessionManager 
        eventId={eventId} 
        sessions={event.sessions as any} 
        availableTeams={availableTeams} 
        warmupZonesCount={event.warmupZonesCount}
        springfloorZonesCount={event.springfloorZonesCount}
        registrationZonesCount={event.registrationZonesCount}
      />
    </div>
  );
}
