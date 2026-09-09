import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AnnouncerRealtime from "@/components/AnnouncerRealtime";
import { updateScheduleStatus } from "@/app/admin/actions";

export default async function AnnouncerEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      schedules: {
        include: { team: { include: { institution: true } } },
        orderBy: { orderIndex: "asc" }
      }
    }
  });

  if (!event) return <div className="text-white p-4">Evento no encontrado</div>;

  // Filtrar breaks del cronograma para el anunciador
  event.schedules = event.schedules.filter(s => s.type !== "BREAK" && s.team) as any;

  // Equipo actualmente en pista
  const currentPerformance = event.schedules.find(s => s.status === "COMPETING");

  // Encontrar el siguiente equipo en la lista de espera
  let nextPerformance = event.schedules.find(s => s.status === "WAITING");
  if (!nextPerformance) {
    nextPerformance = event.schedules.find(s => 
      !["FINISHED", "COMPETING"].includes(s.status)
    );
  }

  // Lista de próximos equipos en el cronograma
  const upcomingSchedules = event.schedules.filter(s => 
    !["FINISHED", "COMPETING"].includes(s.status) && s.id !== nextPerformance?.id
  );

  return (
    <div className="space-y-6">
      {/* Cabecera del animador */}
      <div className="flex items-center gap-4">
        <Link href="/announcer" className="text-xl bg-white/10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20">
          ←
        </Link>
        <div>
          <h2 className="text-xl font-bold text-white">{event.name}</h2>
          <p className="text-sm text-gray-400">Control de Escenario y Micrófono</p>
        </div>
      </div>

      {/* Alerta Realtime de Luz Verde y Datos */}
      <AnnouncerRealtime 
        eventId={eventId} 
        nextTeamName={nextPerformance?.team.name || null}
        nextTeamInstitution={nextPerformance?.team.institution.name || null}
        nextTeamCity={nextPerformance?.team.institution.city || null}
        nextTeamCoach={nextPerformance?.team.coach || null}
        nextTeamAthletes={nextPerformance?.team.athletesCount || null}
        nextScheduleId={nextPerformance?.id || null}
        initialReady={event.judgesReady}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Principal - Controles del Animador */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Ficha del equipo actual en pista y botones de control de estado */}
          <div className="glass-panel p-6 border-l-4 border-l-primary bg-slate-900/40 space-y-6">
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-widest font-bold block mb-1">En el escenario ahora mismo</span>
              {currentPerformance ? (
                <div>
                  <h3 className="text-3xl font-black text-white flex items-center gap-3">
                    <span>{currentPerformance.team?.name}</span>
                    {currentPerformance.isExhibition && (
                      <span className="text-xs bg-purple-500/30 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                        (Exhibición)
                      </span>
                    )}
                  </h3>
                  <p className="text-lg text-primary font-semibold">{currentPerformance.team?.institution.name}</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/5 pt-4 mt-3 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">División / Cat</span>
                      <span className="text-sm font-bold text-white">{currentPerformance.team?.division} - {currentPerformance.team?.category}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">Nivel</span>
                      <span className="text-sm font-bold text-white">{currentPerformance.team?.level}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">📍 Ciudad</span>
                      <span className="text-sm font-bold text-white">{currentPerformance.team?.institution.city || "N/D"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase">👨‍🏫 Entrenador</span>
                      <span className="text-sm font-bold text-white">{currentPerformance.team?.coach || "Sin Entrenador"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No hay ningún equipo compitiendo en pista actualmente.</p>
              )}
            </div>

            {/* Panel de control de flujo para el Animador */}
            <div className="border-t border-white/5 pt-4 space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Acciones de Escenario</h4>
              <div>
                {/* Botón para finalizar presentación del actual */}
                {currentPerformance && (
                  <form action={updateScheduleStatus}>
                    <input type="hidden" name="scheduleId" value={currentPerformance.id} />
                    <input type="hidden" name="newStatus" value="FINISHED" />
                    <input type="hidden" name="eventId" value={eventId} />
                    <button 
                      type="submit" 
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-lg text-sm transition-transform active:scale-98"
                    >
                      ⏹️ Finalizar Presentación Actual
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha - Próximos equipos */}
        <div className="glass-panel p-5 space-y-4 h-fit">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Próximos Turnos ({upcomingSchedules.length + (nextPerformance ? 1 : 0)})</h3>
          
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {nextPerformance && (
              <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="text-[9px] bg-warning text-black font-extrabold px-1 rounded uppercase">Siguiente</span>
                  <p className="font-bold text-white truncate mt-1">{nextPerformance.team?.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{nextPerformance.team?.institution.name}</p>
                </div>
                <span className="shrink-0 bg-black/40 text-warning px-2 py-1 rounded font-mono font-bold text-[10px]">
                  {new Date(nextPerformance.scheduledPerformance || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {upcomingSchedules.map(schedule => (
              <div key={schedule.id} className="bg-white/5 p-3 rounded-lg flex items-center justify-between text-xs hover:bg-white/10 transition-colors">
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{schedule.team?.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{schedule.team?.institution.name}</p>
                </div>
                <span className="shrink-0 bg-white/10 px-2 py-1 rounded text-gray-400 text-[10px]">
                  {new Date(schedule.scheduledPerformance || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
