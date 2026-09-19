import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import SocketSync from "@/components/SocketSync";
import AdminScheduleRow from "@/components/AdminScheduleRow";
import ResetEventButton from "@/components/ResetEventButton";

interface EventDetailPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      schedules: {
        where: { eventSessionId: null }, // Solo traer los que no tienen sesión asignada (legacy)
        orderBy: { orderIndex: "asc" },
        include: {
          team: {
            include: {
              institution: true
            }
          }
        }
      },
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

  if (!event) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <SocketSync eventId={eventId} />

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 border-l-4 border-l-primary">
        <div className="flex items-center gap-4">
          {event.logoUrl ? (
            <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-1.5 shadow-lg">
              <img src={event.logoUrl} alt={event.name} className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-3xl shrink-0 shadow-lg">
              🏟️
            </div>
          )}
          <div>
            <div className="text-xs text-gray-400">Panel de Administración de Evento</div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
              <span>{event.name}</span>
            </h1>
            <p className="text-sm text-warning mt-1">
              📅 {new Date(event.date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ResetEventButton eventId={eventId} />
          <Link
            href={`/admin/events/${eventId}/teams`}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-all"
          >
            🏆 Equipos Participantes
          </Link>
          <Link
            href={`/admin/events/${eventId}/sessions`}
            className="bg-accent hover:bg-accent-hover text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-all"
          >
            📅 Configurar Cronograma
          </Link>
          <Link
            href="/admin"
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-all"
          >
            ← Volver
          </Link>
          <Link
            href="/admin/staff"
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-all"
          >
            👥 Staff
          </Link>
        </div>
      </div>

      {/* Lista de Equipos en el Cronograma */}
      <div className="space-y-8">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-lg font-bold text-white">Equipos en Cronograma</h2>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Configuración de Zonas Paralelas & Coach</span>
        </div>

        {event.schedules.length === 0 && event.sessions.length === 0 ? (
          <div className="glass-panel p-8 text-center text-gray-400">
            Aún no hay equipos programados. Ve a "Configurar Cronograma" para crear jornadas y añadir equipos.
          </div>
        ) : (
          <>
            {/* Equipos Sin Jornada Asignada (Legacy / Generados por Test Data) */}
            {event.schedules.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 mb-2">Equipos sin jornada asignada ({event.schedules.length})</h3>
                {event.schedules.map((schedule) => (
                  <AdminScheduleRow 
                    key={schedule.id} 
                    schedule={schedule} 
                    eventId={eventId} 
                    warmupZonesCount={event.warmupZonesCount}
                    springfloorZonesCount={event.springfloorZonesCount}
                    forceSameZone={event.forceSameZone}
                  />
                ))}
              </div>
            )}

            {/* Equipos por Jornada */}
            {event.sessions.map((session) => {
              const sessionSchedules = session.schedules.filter(s => s.type === "TEAM"); // Excluir Breaks del panel de zonas
              if (sessionSchedules.length === 0) return null;

              return (
                <div key={session.id} className="space-y-4">
                  <h3 className="text-sm font-bold text-primary mb-2">Jornada: {session.name} ({sessionSchedules.length})</h3>
                  {sessionSchedules.map((schedule) => (
                    <AdminScheduleRow 
                      key={schedule.id} 
                      schedule={schedule} 
                      eventId={eventId} 
                      warmupZonesCount={event.warmupZonesCount}
                      springfloorZonesCount={event.springfloorZonesCount}
                      forceSameZone={event.forceSameZone}
                    />
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
