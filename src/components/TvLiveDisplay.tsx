"use client";

import { useState, useEffect } from "react";
import SocketSync from "@/components/SocketSync";

interface ScheduleItem {
  id: string;
  orderIndex: number;
  status: string;
  type: string;
  scheduledPerformance?: string | Date | null;
  scheduledRegistration?: string | Date | null;
  scheduledWarmup1?: string | Date | null;
  scheduledSpringfloor?: string | Date | null;
  isHitZero?: boolean;
  hitZeroAwarded?: boolean;
  team?: {
    name: string;
    division?: string;
    category?: string;
    level?: string;
    institution: {
      name: string;
      city?: string | null;
      logoUrl?: string | null;
    };
  } | null;
}

interface TvLiveDisplayProps {
  eventId: string;
  schedules: ScheduleItem[];
  tickerIntervalSeconds?: number;
}

export default function TvLiveDisplay({ eventId, schedules, tickerIntervalSeconds = 12 }: TvLiveDisplayProps) {
  const [showScheduleTicker, setShowScheduleTicker] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Alternar pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
        console.error("Error al activar pantalla completa:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(err => {
          console.error("Error al salir de pantalla completa:", err);
        });
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Filtrar presentaciones válidas con equipo
  const teamSchedules = schedules.filter(s => s.type !== "BREAK" && s.team);

  // Equipo compitiendo actualmente
  const currentPerformance = teamSchedules.find(s => s.status === "COMPETING");

  // Último equipo que compitió recientemente (FINISHED)
  const finishedSchedules = teamSchedules.filter(s => s.status === "FINISHED");
  const lastFinishedPerformance = finishedSchedules.length > 0 ? finishedSchedules[finishedSchedules.length - 1] : null;

  // Último equipo con Hit Zero logrado/otorgado
  const recentHitZeroTeam = [...finishedSchedules].reverse().find(s => s.isHitZero || s.hitZeroAwarded);

  // Próximos equipos pendientes de competir (excluyendo el que compite actualmente)
  const upcomingSchedules = teamSchedules.filter(s => 
    !["FINISHED", "COMPETING"].includes(s.status)
  );
  const nextTeam1 = upcomingSchedules[0];
  const nextTeam2 = upcomingSchedules[1];

  // Lista enfocada para el cronograma ticker: solo los últimos 3 equipos finalizados + equipo en pista + todos los próximos
  const recentFinishedForTicker = finishedSchedules.slice(-3);
  const tickerSchedules = [
    ...recentFinishedForTicker,
    ...(currentPerformance ? [currentPerformance] : []),
    ...upcomingSchedules
  ];

  // Cálculo de retraso del cronograma
  const nextScheduledTeam = upcomingSchedules[0];
  let delayMinutes = 0;
  if (nextScheduledTeam && nextScheduledTeam.scheduledPerformance) {
    const scheduledTime = new Date(nextScheduledTeam.scheduledPerformance).getTime();
    const nowTime = new Date().getTime();
    if (nowTime > scheduledTime) {
      delayMinutes = Math.floor((nowTime - scheduledTime) / 60000);
    }
  }

  // Alternancia periódica para mostrar el Horario Completo en pantalla cada X segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setShowScheduleTicker(prev => !prev);
    }, tickerIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [tickerIntervalSeconds]);

  const formatTime = (d: string | Date | null | undefined) => {
    if (!d) return "--:--";
    return new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  };

  // Auto-scroll del cronograma completo en pantallas fijas
  const tableContainerRef = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showScheduleTicker) return;

    let scrollInterval: NodeJS.Timeout;
    const container = document.getElementById("tv-schedule-table-container");
    if (container) {
      container.scrollTop = 0;
      scrollInterval = setInterval(() => {
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 5) {
          container.scrollTop = 0; // Reiniciar arriba suavemente al llegar al final
        } else {
          container.scrollTop += 2; // Desplazamiento progresivo fluido
        }
      }, 50);
    }

    return () => clearInterval(scrollInterval);
  }, [showScheduleTicker]);

  return (
    <div className="space-y-6">
      <SocketSync eventId={eventId} />

      {/* Indicador de alternancia visual superior y Botón de Pantalla Completa (oculto en pantalla completa) */}
      {!isFullscreen && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-black/40 border border-white/10 px-4 py-3 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="font-extrabold text-white uppercase tracking-wider">Modo Transmisión TV / En Vivo</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-gray-400">
              <span>Vista activa:</span>
              <span className="bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded font-bold uppercase text-[10px]">
                {showScheduleTicker ? "📋 Tabla de Horarios (Auto-Scroll)" : "Escenario En Vivo"}
              </span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary-light hover:to-purple-500 text-white font-extrabold px-3.5 py-1.5 rounded-xl border border-primary/40 shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>⛶</span>
              <span>Pantalla Completa TV</span>
            </button>
          </div>
        </div>
      )}

      {/* VISTA A: PANEL EN VIVO PRINCIPAL (Equipo Actual + Reciente + Próximos 2 + Retraso) */}
      {!showScheduleTicker ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* Ficha Principal Gran Formato: EQUIPO COMPITIENDO AHORA */}
          <div className="glass-panel p-6 sm:p-8 border-2 border-red-500/80 bg-gradient-to-br from-red-950/40 via-slate-900/90 to-slate-950/90 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-red-600 text-white text-[11px] font-black px-5 py-1.5 rounded-bl-2xl uppercase tracking-widest flex items-center gap-2 shadow-lg animate-pulse">
              <span className="w-2 h-2 bg-white rounded-full animate-ping" />
              <span>Compitiendo Ahora en Pista</span>
            </div>

            {currentPerformance ? (
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <span className="text-xl font-mono font-black text-red-400 bg-red-500/20 border border-red-500/30 px-3 py-1 rounded-xl">
                    #{currentPerformance.orderIndex}
                  </span>
                  {currentPerformance.scheduledPerformance && (
                    <span className="text-sm font-mono font-bold text-gray-300 bg-white/10 px-3 py-1 rounded-xl">
                      ⏰ Hora Programa: {formatTime(currentPerformance.scheduledPerformance)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center text-center space-y-3 py-2">
                  {currentPerformance.team?.institution.logoUrl ? (
                    <img
                      src={currentPerformance.team.institution.logoUrl}
                      alt={currentPerformance.team.institution.name}
                      className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl object-cover border-2 border-white/20 shadow-2xl shrink-0 bg-black/40"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-primary to-purple-600 border-2 border-white/20 shadow-2xl flex items-center justify-center font-black text-white text-3xl sm:text-5xl shrink-0">
                      {currentPerformance.team?.name?.charAt(0) || "🏆"}
                    </div>
                  )}
                  <div>
                    <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight">
                      {currentPerformance.team?.name}
                    </h2>
                    <p className="text-xl sm:text-3xl font-bold text-primary mt-1">
                      {currentPerformance.team?.institution.name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-white/10 text-sm">
                  <div className="bg-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">División</span>
                    <span className="text-white font-black text-sm sm:text-base">{currentPerformance.team?.division || "N/D"}</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Categoría</span>
                    <span className="text-white font-black text-sm sm:text-base">{currentPerformance.team?.category || "N/D"}</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Nivel</span>
                    <span className="text-white font-black text-sm sm:text-base">{currentPerformance.team?.level || "N/D"}</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Ciudad</span>
                    <span className="text-white font-black text-sm sm:text-base">{currentPerformance.team?.institution.city || "N/D"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-4">
                <div className="inline-block bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                  ⏳ EN ESPERA DEL SIGUIENTE EQUIPO
                </div>
                <h3 className="text-4xl sm:text-5xl font-black text-amber-400 uppercase tracking-tight drop-shadow-md">
                  JUECES EVALUANDO
                </h3>
                {nextTeam1 && (
                  <div className="pt-2">
                    <p className="text-xl sm:text-2xl text-emerald-400 font-bold max-w-2xl mx-auto">
                      Próximo equipo: <span className="text-white font-extrabold bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-500/30 inline-block mt-1">{nextTeam1.team?.name}</span>
                    </p>
                    <p className="text-sm sm:text-base text-gray-300 font-medium mt-1">
                      {nextTeam1.team?.institution.name}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grilla Inferior: Recién Compitió + Próximos 2 Equipos + Alerta de Retraso */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Tarjeta 1: Recién Compitió (Pasado) */}
            <div className="glass-panel p-5 border border-white/10 bg-slate-900/60 rounded-2xl space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">⏮️ Recién Compitió</span>
                  <span className="text-[10px] bg-white/10 text-gray-300 font-semibold px-2 py-0.5 rounded">Finalizado</span>
                </div>

                {lastFinishedPerformance ? (
                  <div className="flex items-center gap-3 space-y-0">
                    {lastFinishedPerformance.team?.institution.logoUrl ? (
                      <img
                        src={lastFinishedPerformance.team.institution.logoUrl}
                        alt={lastFinishedPerformance.team.institution.name}
                        className="w-10 h-10 rounded-xl object-cover border border-white/20 shrink-0 bg-black/40"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 border border-white/20 flex items-center justify-center font-black text-white text-sm shrink-0">
                        {lastFinishedPerformance.team?.name?.charAt(0) || "🏆"}
                      </div>
                    )}
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/20 px-1.5 py-0.5 rounded">
                          #{lastFinishedPerformance.orderIndex}
                        </span>
                        <h4 className="font-bold text-white text-sm leading-tight truncate">
                          {lastFinishedPerformance.team?.name}
                        </h4>
                      </div>
                      <p className="text-xs text-primary font-semibold truncate">
                        {lastFinishedPerformance.team?.institution.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        Presentación: {formatTime(lastFinishedPerformance.scheduledPerformance)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic py-4">Sin rutinas previas en esta jornada.</p>
                )}
              </div>
            </div>

            {/* Tarjeta 2: Próximo Equipo 1 */}
            <div className="glass-panel p-5 border border-emerald-500/30 bg-emerald-950/20 rounded-2xl space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">⏭️ Siguiente Turno (#1)</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 rounded">En Espera</span>
                </div>

                {nextTeam1 ? (
                  <div className="flex items-center gap-3 space-y-0">
                    {nextTeam1.team?.institution.logoUrl ? (
                      <img
                        src={nextTeam1.team.institution.logoUrl}
                        alt={nextTeam1.team.institution.name}
                        className="w-10 h-10 rounded-xl object-cover border border-emerald-500/30 shrink-0 bg-black/40"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 border border-emerald-400/30 flex items-center justify-center font-black text-white text-sm shrink-0">
                        {nextTeam1.team?.name?.charAt(0) || "🏆"}
                      </div>
                    )}
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-400/20 px-1.5 py-0.5 rounded">
                          #{nextTeam1.orderIndex}
                        </span>
                        <h4 className="font-bold text-white text-sm leading-tight truncate">
                          {nextTeam1.team?.name}
                        </h4>
                      </div>
                      <p className="text-xs text-emerald-300 font-semibold truncate">
                        {nextTeam1.team?.institution.name}
                      </p>
                      <p className="text-[10px] text-gray-300 font-mono">
                        Hora Salida: <strong className="text-white">{formatTime(nextTeam1.scheduledPerformance)}</strong>
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic py-4">Sin equipos pendientes en lista.</p>
                )}
              </div>
            </div>

            {/* Tarjeta 3: Anuncio Hit Zero (Si hay uno activo) o Próximo Equipo #2 */}
            {recentHitZeroTeam ? (
              <div className="glass-panel p-5 border-2 border-amber-400/80 bg-gradient-to-br from-amber-950/70 via-amber-900/50 to-slate-950/90 rounded-2xl space-y-3 flex flex-col justify-between shadow-xl shadow-amber-500/10 relative overflow-hidden">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="text-sm">🎯</span> ÚLTIMO HIT ZERO LOGRADO
                  </span>
                  <span className="text-[10px] bg-amber-400 text-black font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    ¡Rutina Limpia!
                  </span>
                </div>

                <div className="flex items-center gap-3.5 pt-0.5">
                  {recentHitZeroTeam.team?.institution.logoUrl ? (
                    <img
                      src={recentHitZeroTeam.team.institution.logoUrl}
                      alt={recentHitZeroTeam.team.institution.name}
                      className="w-11 h-11 rounded-xl object-cover border-2 border-amber-400/60 shrink-0 bg-black/40 shadow-md"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-600 border-2 border-amber-300 flex items-center justify-center font-black text-black text-xl shrink-0 shadow-md">
                      🎯
                    </div>
                  )}
                  <div className="space-y-0.5 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-black text-amber-950 bg-amber-400 px-1.5 py-0.5 rounded">
                        #{recentHitZeroTeam.orderIndex}
                      </span>
                      <h4 className="font-black text-white text-base leading-tight truncate">
                        {recentHitZeroTeam.team?.name}
                      </h4>
                    </div>
                    <p className="text-xs text-amber-300 font-bold truncate">
                      {recentHitZeroTeam.team?.institution.name}
                    </p>
                    <p className="text-[10px] text-amber-200/80 font-medium truncate">
                      {recentHitZeroTeam.team?.category || ""} {recentHitZeroTeam.team?.level ? `• ${recentHitZeroTeam.team.level}` : ""}
                    </p>
                  </div>
                </div>

                <div className="bg-amber-400/20 border border-amber-400/30 rounded-xl py-1.5 px-2 text-center text-[10px] font-black text-amber-300 uppercase tracking-widest flex items-center justify-center gap-1">
                  <span>✨</span> HIT ZERO CONFIRMADO <span>✨</span>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-5 border border-purple-500/30 bg-purple-950/20 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">⏭️ Siguiente Turno (#2)</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold px-2 py-0.5 rounded">Preparando</span>
                  </div>

                  {nextTeam2 ? (
                    <div className="flex items-center gap-3 space-y-0">
                      {nextTeam2.team?.institution.logoUrl ? (
                        <img
                          src={nextTeam2.team.institution.logoUrl}
                          alt={nextTeam2.team.institution.name}
                          className="w-10 h-10 rounded-xl object-cover border border-purple-500/30 shrink-0 bg-black/40"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-700 border border-purple-400/30 flex items-center justify-center font-black text-white text-sm shrink-0">
                          {nextTeam2.team?.name?.charAt(0) || "🏆"}
                        </div>
                      )}
                      <div className="space-y-0.5 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-purple-300 bg-purple-400/20 px-1.5 py-0.5 rounded">
                            #{nextTeam2.orderIndex}
                          </span>
                          <h4 className="font-bold text-white text-sm leading-tight truncate">
                            {nextTeam2.team?.name}
                          </h4>
                        </div>
                        <p className="text-xs text-purple-300 font-semibold truncate">
                          {nextTeam2.team?.institution.name}
                        </p>
                        <p className="text-[10px] text-gray-300 font-mono">
                          Hora Salida: <strong className="text-white">{formatTime(nextTeam2.scheduledPerformance)}</strong>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic py-4">Sin más turnos en cola.</p>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Alerta Discreta de Retraso si aplica (más pequeño en la parte inferior) */}
          {delayMinutes > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-red-300">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span className="font-bold">Aviso del Cronograma:</span>
                <span>Variación aproximada de <strong className="text-yellow-300 font-black">+{delayMinutes} min</strong> de retraso respecto a la hora estimada inicial.</span>
              </div>
              <span className="text-[10px] text-red-400 font-mono font-bold shrink-0">Ajuste Automático</span>
            </div>
          )}

        </div>
      ) : (
        /* VISTA B: TABLA / HORARIO GENERAL TICKER (Auto-Scroll Automático y Suave) */
        <div className="glass-panel p-6 border border-white/10 rounded-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="font-black text-white text-lg uppercase tracking-wide flex items-center gap-2">
              <span>📋 Cronograma de Próximas Salidas</span>
              <span className="text-xs text-gray-400 font-normal">({upcomingSchedules.length} Pendientes)</span>
            </h3>
            <span className="text-xs text-primary font-mono font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              <span>Desplazamiento Automático Continuo ⬇️</span>
            </span>
          </div>

          <div 
            id="tv-schedule-table-container"
            className="max-h-[60vh] overflow-y-auto pr-1 scroll-smooth"
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#0f172a] z-10 shadow-md">
                <tr className="border-b border-white/10 text-gray-400 text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-2">Equipo</th>
                  <th className="py-2.5 px-2">Institución</th>
                  <th className="py-2.5 px-2 text-center">Registro</th>
                  <th className="py-2.5 px-2 text-center">Calentamiento</th>
                  <th className="py-2.5 px-2 text-center">Springfloor</th>
                  <th className="py-2.5 px-2 text-center">Presentación</th>
                  <th className="py-2.5 px-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tickerSchedules.map((s) => (
                  <tr key={s.id} className={`hover:bg-white/5 transition-colors ${s.status === "COMPETING" ? "bg-red-500/20 font-bold" : ""}`}>
                    <td className="py-3 px-2 font-mono font-bold text-amber-400 text-sm">#{s.orderIndex}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {s.team?.institution.logoUrl ? (
                          <img
                            src={s.team.institution.logoUrl}
                            alt={s.team.institution.name}
                            className="w-7 h-7 rounded-lg object-cover border border-white/20 shrink-0 bg-black/40"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary to-purple-600 border border-white/20 flex items-center justify-center font-black text-white text-xs shrink-0">
                            {s.team?.name?.charAt(0) || "🏆"}
                          </div>
                        )}
                        <span className="font-bold text-white text-sm">{s.team?.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-300">{s.team?.institution.name}</td>
                    <td className="py-3 px-2 text-center font-mono text-gray-400">{formatTime(s.scheduledRegistration)}</td>
                    <td className="py-3 px-2 text-center font-mono text-gray-400">{formatTime(s.scheduledWarmup1)}</td>
                    <td className="py-3 px-2 text-center font-mono text-gray-400">{formatTime(s.scheduledSpringfloor)}</td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-white text-sm">{formatTime(s.scheduledPerformance)}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${
                        s.status === "COMPETING"
                          ? "bg-red-500 text-white animate-pulse"
                          : s.status === "FINISHED"
                            ? "bg-white/10 text-gray-400"
                            : "bg-emerald-500/20 text-emerald-300"
                      }`}>
                        {s.status === "COMPETING" ? "🔴 COMPITIENDO" : s.status === "FINISHED" ? "FINALIZADO" : "PENDIENTE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
