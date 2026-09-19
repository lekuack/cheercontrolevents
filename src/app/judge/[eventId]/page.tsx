import { prisma } from "@/lib/prisma";
import Link from "next/link";
import JudgeRealtime from "@/components/JudgeRealtime";
import DemoStationSwitcher from "@/components/DemoStationSwitcher";
import JudgeHitZeroModal from "@/components/JudgeHitZeroModal";
import { getSessionUser } from "@/app/admin/actions";

export default async function JudgeEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const user = await getSessionUser();

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

  if (user?.producerId && user.role !== "SUPER_ADMIN" && event.producerId !== user.producerId) {
    return (
      <div className="glass-panel p-8 text-center text-red-400 font-bold border border-red-500/30">
        🚫 No tienes permisos para evaluar este evento.
      </div>
    );
  }

  // Filtrar breaks del cronograma para los jueces
  event.schedules = event.schedules.filter(s => s.type !== "BREAK" && s.team) as any;

  // Encontrar equipo actual en competencia
  const currentPerformance = event.schedules.find(s => s.status === "COMPETING");

  // Encontrar el siguiente equipo
  // 1. Buscamos uno que esté esperando en boca de escenario (WAITING)
  // 2. Si no hay ninguno, buscamos el primer equipo no finalizado ni compitiendo en el cronograma
  let nextPerformance = event.schedules.find(s => s.status === "WAITING");
  
  if (!nextPerformance) {
    nextPerformance = event.schedules.find(s => 
      !["FINISHED", "COMPETING"].includes(s.status)
    );
  }

  // Lista de próximos equipos (cronograma general restante)
  const upcomingSchedules = event.schedules.filter(s => 
    !["FINISHED", "COMPETING"].includes(s.status) && s.id !== nextPerformance?.id
  );

  return (
    <div className="space-y-6">
      {/* Cabecera superior */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/judge" className="text-xl bg-white/10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20">
            ←
          </Link>
          <div>
            <h2 className="text-xl font-bold text-white">{event.name}</h2>
            <p className="text-sm text-gray-400">Panel de Control de la Mesa de Jueces</p>
          </div>
        </div>

        <JudgeHitZeroModal eventId={eventId} schedules={event.schedules as any} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Principal - Pista & Siguiente */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tarjeta del Equipo Actual en Pista */}
          <div className="glass-panel p-6 border-l-4 border-l-success bg-gradient-to-r from-success/10 via-success/5 to-transparent relative overflow-hidden shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="bg-success/20 text-success text-xs font-black font-mono px-3 py-1 rounded-full border border-success/30 animate-pulse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-ping"></span>
                  🎥 COMPITIENDO AHORA
                </span>
                {currentPerformance?.isExhibition && (
                  <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-500/30">
                    Exhibición
                  </span>
                )}
              </div>
              {currentPerformance && (
                <span className="bg-white/10 text-warning font-mono font-black text-sm px-3 py-1 rounded-lg border border-warning/30">
                  Orden #{currentPerformance.orderIndex}
                </span>
              )}
            </div>

            {currentPerformance ? (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  {currentPerformance.team?.institution.logoUrl ? (
                    <img
                      src={currentPerformance.team.institution.logoUrl}
                      alt="Logo Club"
                      className="w-16 h-16 rounded-xl object-cover bg-white/10 border border-white/20 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-3xl shrink-0">
                      🏆
                    </div>
                  )}
                  <div>
                    <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">
                      {currentPerformance.team?.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-lg text-primary font-bold">{currentPerformance.team?.institution.name}</p>
                      {currentPerformance.team?.institution.type && (
                        <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded font-semibold">
                          {currentPerformance.team.institution.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid con la Ficha Técnica Completa de Evaluación */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/40 p-4 rounded-xl border border-white/10">
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider mb-1">División</span>
                    <span className="text-base font-black text-white block">{currentPerformance.team?.division}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider mb-1">Categoría</span>
                    <span className="text-base font-black text-white block">{currentPerformance.team?.category}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider mb-1">Nivel de Dificultad</span>
                    <span className="text-base font-black text-primary block">{currentPerformance.team?.level}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider mb-1">Integrantes en Pista</span>
                    <span className="text-base font-black text-warning block">{currentPerformance.team?.athletesCount} Deportistas</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider mb-1">📍 Origen / Ciudad</span>
                    <span className="text-sm font-bold text-white block">{currentPerformance.team?.institution.city || "No registrada"}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider mb-1">👨‍🏫 Entrenador / Coach</span>
                    <span className="text-sm font-bold text-white block truncate" title={currentPerformance.team?.coach || ""}>
                      {currentPerformance.team?.coach || "Sin asignar"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider mb-1">📞 Teléfono Coach</span>
                    <span className="text-xs font-mono font-bold text-emerald-400 block truncate">
                      {currentPerformance.team?.coachPhone || "Sin registro"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider mb-1">⏱️ Hora Programada</span>
                    <span className="text-xs font-mono font-bold text-gray-300 block">
                      {currentPerformance.scheduledPerformance 
                        ? new Date(currentPerformance.scheduledPerformance).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : "En vivo"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 italic">
                Ningún equipo está en el escenario compitiendo en este momento.
              </div>
            )}
          </div>

          {/* Panel Realtime de Jueces Listos */}
          <JudgeRealtime 
            eventId={eventId} 
            currentTeamName={currentPerformance?.team?.name || null}
            nextTeamName={nextPerformance?.team?.name || null}
            initialReady={event.judgesReady}
          />
        </div>

        {/* Columna Derecha - Siguiente & Cronograma */}
        <div className="space-y-6">
          
          {/* Tarjeta Siguiente Equipo */}
          <div className="glass-panel p-5 border-l-4 border-l-warning bg-warning/5">
            <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold block mb-2">Siguiente en Presentar</span>
            
            {nextPerformance ? (
              <div className="space-y-3">
                <div>
                  <h4 className="text-xl font-bold text-white leading-tight">{nextPerformance.team?.name}</h4>
                  <p className="text-sm text-warning font-semibold">{nextPerformance.team?.institution.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Cat / Nivel</span>
                    <span>{nextPerformance.team?.category} Lvl {nextPerformance.team?.level}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">📍 Ciudad</span>
                    <span>{nextPerformance.team?.institution.city || "N/D"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">👨‍🏫 Entrenador</span>
                    <span className="truncate block" title={nextPerformance.team?.coach || ""}>{nextPerformance.team?.coach || "Sin Entrenador"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">👥 Integrantes</span>
                    <span className="text-warning font-bold">{nextPerformance.team?.athletesCount}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-xs">
                  <span className="text-gray-400">Estado actual:</span>
                  <span className="bg-warning/20 text-warning px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                    {nextPerformance.status === "WAITING" ? "En Espera (Listo)" : nextPerformance.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-gray-400 text-sm italic">
                No hay más equipos programados.
              </div>
            )}
          </div>

          {/* Cronograma Restante */}
          <div className="glass-panel p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cronograma Restante ({upcomingSchedules.length})</h3>
            
            {upcomingSchedules.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No quedan más presentaciones.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
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
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
