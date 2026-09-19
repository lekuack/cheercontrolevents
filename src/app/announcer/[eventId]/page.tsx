import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AnnouncerRealtime from "@/components/AnnouncerRealtime";
import DemoStationSwitcher from "@/components/DemoStationSwitcher";
import { updateScheduleStatus, toggleHitZeroAwarded } from "@/app/admin/actions";

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

  // Equipos con Hit Zero pendientes de entregarse (no otorgados aún)
  const hitZeroSchedules = event.schedules.filter(s => s.isHitZero && !s.hitZeroAwarded);
  const pendingHitZero = hitZeroSchedules;

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
      {event.isDemo && (
        <DemoStationSwitcher
          eventId={event.id}
          demoPin={event.demoPin || "1234"}
          activeRole="ANNOUNCER"
        />
      )}
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

      {/* Alerta de Reconocimientos Hit Zero Pendientes para el Animador */}
      {hitZeroSchedules.length > 0 && (
        <div className="glass-panel p-5 border-2 border-amber-400/60 bg-amber-500/10 rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl animate-bounce">🎯</span>
              <h3 className="font-black text-amber-300 text-lg uppercase tracking-wide">
                Reconocimientos Hit Zero ({pendingHitZero.length} Pendiente{pendingHitZero.length === 1 ? "" : "s"})
              </h3>
            </div>
            <span className="text-xs text-amber-200 font-bold bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30">
              Anunciar por Micrófono 🎤
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hitZeroSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  schedule.hitZeroAwarded
                    ? "bg-black/30 border-white/10 opacity-70"
                    : "bg-amber-400/15 border-amber-400/50 shadow-lg animate-pulse"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-black text-white text-base truncate">{schedule.team?.name}</p>
                  <p className="text-xs text-amber-200 truncate">{schedule.team?.institution.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">Orden #{schedule.orderIndex}</p>
                </div>

                {schedule.hitZeroAwarded ? (
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-500/30 shrink-0">
                    ✅ Otorgado
                  </span>
                ) : (
                  <form action={async (formData: FormData) => {
                    "use server";
                    const id = formData.get("scheduleId") as string;
                    await toggleHitZeroAwarded(id, true);
                  }}>
                    <input type="hidden" name="scheduleId" value={schedule.id} />
                    <button
                      type="submit"
                      className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 border border-emerald-300/50 transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <span>🏆</span>
                      <span>Marcar Entregado</span>
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerta Realtime de Luz Verde y Datos */}
      <AnnouncerRealtime 
        eventId={eventId} 
        nextTeamName={nextPerformance?.team?.name || null}
        nextTeamInstitution={nextPerformance?.team?.institution?.name || null}
        nextTeamCity={nextPerformance?.team?.institution?.city || null}
        nextTeamCoach={nextPerformance?.team?.coach || null}
        nextTeamAthletes={nextPerformance?.team?.athletesCount || null}
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
