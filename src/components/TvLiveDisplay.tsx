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
  disableTicker?: boolean;
  hideFullscreenButton?: boolean;
  showSearchTracker?: boolean;
}

export default function TvLiveDisplay({
  eventId,
  schedules,
  tickerIntervalSeconds = 12,
  disableTicker = false,
  hideFullscreenButton = false,
  showSearchTracker = false
}: TvLiveDisplayProps) {
  const [showScheduleTicker, setShowScheduleTicker] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Último equipo con Hit Zero ya entregado/anunciado (para la tarjeta fija #3)
  const recentHitZeroTeam = [...teamSchedules].reverse().find(s =>
    (s.hitZeroAwarded || s.isHitZero) && s.id !== currentPerformance?.id
  );

  // Equipo con Hit Zero recién marcado por jueces PENDIENTE de ser anunciado/entregado
  const unannouncedHitZeroTeam = [...teamSchedules].reverse().find(s =>
    s.isHitZero && !s.hitZeroAwarded && s.id !== currentPerformance?.id
  );

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

  // Rotación periódica de la Tarjeta 3 (Alternar cada 6s entre "A continuación" y "Último Hit Zero")
  const [card3Tab, setCard3Tab] = useState<"next" | "hitzero">("next");

  useEffect(() => {
    if (!recentHitZeroTeam) {
      setCard3Tab("next");
      return;
    }
    const interval = setInterval(() => {
      setCard3Tab(prev => (prev === "next" ? "hitzero" : "next"));
    }, 6000);
    return () => clearInterval(interval);
  }, [recentHitZeroTeam]);

  // Animación del Sticker de Alerta de NUEVO HIT ZERO en Esquina Superior Derecha
  // Solo se muestra mientras el Hit Zero NO haya sido marcado como entregado/anunciado (unannouncedHitZeroTeam)
  const activeHitZeroSticker = unannouncedHitZeroTeam;

  // Alternancia periódica para mostrar el Horario Completo en pantalla cada X segundos
  useEffect(() => {
    if (disableTicker) return;
    const interval = setInterval(() => {
      setShowScheduleTicker(prev => !prev);
    }, tickerIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [tickerIntervalSeconds, disableTicker]);

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
          container.scrollTop += 1; // Desplazamiento progresivo más lento y fluido
        }
      }, 70);
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

            {!hideFullscreenButton && (
              <button
                onClick={toggleFullscreen}
                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary-light hover:to-purple-500 text-white font-extrabold px-3.5 py-1.5 rounded-xl border border-primary/40 shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>⛶</span>
                <span>Pantalla Completa TV</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* VISTA A: PANEL EN VIVO PRINCIPAL (Equipo Actual + Reciente + Próximos 2 + Retraso) */}
      {!showScheduleTicker ? (
        <div className="space-y-6 animate-fade-in">

          {/* Ficha Principal Gran Formato: EQUIPO COMPITIENDO AHORA */}
          <div className="glass-panel p-6 sm:p-8 2xl:p-12 3xl:p-16 border-2 border-red-500/80 bg-gradient-to-br from-red-950/40 via-slate-900/90 to-slate-950/90 rounded-3xl 2xl:rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-red-600 text-white text-[11px] 2xl:text-base 3xl:text-lg font-black px-5 2xl:px-8 py-1.5 2xl:py-2.5 rounded-bl-2xl 2xl:rounded-bl-3xl uppercase tracking-widest flex items-center gap-2 shadow-lg animate-pulse">
              <span className="w-2 h-2 2xl:w-3.5 2xl:h-3.5 bg-white rounded-full animate-ping" />
              <span>Ahora en Tapete</span>
            </div>

            {currentPerformance ? (
              <div className="space-y-4 2xl:space-y-8 pt-2">
                <div className="flex flex-wrap items-center justify-center gap-3 2xl:gap-6">
                  <span className="text-xl 2xl:text-3xl 3xl:text-4xl font-mono font-black text-red-400 bg-red-500/20 border border-red-500/30 px-3 2xl:px-6 py-1 2xl:py-2.5 rounded-xl 2xl:rounded-2xl">
                    #{currentPerformance.orderIndex}
                  </span>
                  {currentPerformance.scheduledPerformance && (
                    <span className="text-sm 2xl:text-2xl 3xl:text-3xl font-mono font-bold text-gray-300 bg-white/10 px-3 2xl:px-6 py-1 2xl:py-2.5 rounded-xl 2xl:rounded-2xl">
                      ⏰ Hora Programa: {formatTime(currentPerformance.scheduledPerformance)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center text-center sm:text-left gap-4 sm:gap-6 2xl:gap-10 py-3 2xl:py-8">
                  {currentPerformance.team?.institution.logoUrl ? (
                    <img
                      src={currentPerformance.team.institution.logoUrl}
                      alt={currentPerformance.team.institution.name}
                      className="w-24 h-24 sm:w-32 sm:h-32 2xl:w-48 2xl:h-48 3xl:w-60 3xl:h-60 rounded-3xl 2xl:rounded-[2.5rem] object-cover border-2 2xl:border-4 border-white/20 shadow-2xl shrink-0 bg-black/40"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 2xl:w-48 2xl:h-48 3xl:w-60 3xl:h-60 rounded-3xl 2xl:rounded-[2.5rem] bg-gradient-to-tr from-primary to-purple-600 border-2 2xl:border-4 border-white/20 shadow-2xl flex items-center justify-center font-black text-white text-4xl sm:text-6xl 2xl:text-7xl 3xl:text-8xl shrink-0">
                      {currentPerformance.team?.name?.charAt(0) || "🏆"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-4xl sm:text-6xl lg:text-7xl 2xl:text-8xl 3xl:text-9xl font-black text-white tracking-tight leading-none drop-shadow-md">
                      {currentPerformance.team?.name}
                    </h2>
                    <p className="text-xl sm:text-3xl 2xl:text-5xl 3xl:text-6xl font-bold text-primary mt-1.5 2xl:mt-4">
                      {currentPerformance.team?.institution.name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 2xl:gap-8 pt-4 2xl:pt-8 border-t border-white/10 text-sm 2xl:text-xl 3xl:text-2xl">
                  <div className="bg-white/5 p-3 2xl:p-6 rounded-xl 2xl:rounded-2xl">
                    <span className="text-[10px] 2xl:text-sm text-gray-400 block uppercase font-bold">División</span>
                    <span className="text-white font-black text-sm sm:text-base 2xl:text-2xl 3xl:text-3xl">{currentPerformance.team?.division || "N/D"}</span>
                  </div>
                  <div className="bg-white/5 p-3 2xl:p-6 rounded-xl 2xl:rounded-2xl">
                    <span className="text-[10px] 2xl:text-base text-gray-400 block uppercase font-bold">Categoría</span>
                    <span className="text-white font-black text-sm sm:text-base 2xl:text-2xl 3xl:text-3xl">{currentPerformance.team?.category || "N/D"}</span>
                  </div>
                  <div className="bg-white/5 p-3 2xl:p-6 rounded-xl 2xl:rounded-2xl">
                    <span className="text-[10px] 2xl:text-base text-gray-400 block uppercase font-bold">Nivel</span>
                    <span className="text-white font-black text-sm sm:text-base 2xl:text-2xl 3xl:text-3xl">{currentPerformance.team?.level || "N/D"}</span>
                  </div>
                  <div className="bg-white/5 p-3 2xl:p-6 rounded-xl 2xl:rounded-2xl">
                    <span className="text-[10px] 2xl:text-base text-gray-400 block uppercase font-bold">Ciudad</span>
                    <span className="text-white font-black text-sm sm:text-base 2xl:text-2xl 3xl:text-3xl">{currentPerformance.team?.institution.city || "N/D"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 2xl:py-24 text-center space-y-4 2xl:space-y-8">
                <div className="inline-block bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs sm:text-sm 2xl:text-2xl 3xl:text-3xl font-extrabold px-4 2xl:px-8 py-1.5 2xl:py-3 rounded-full uppercase tracking-widest shadow-md">
                  ⏳ EN ESPERA DEL SIGUIENTE EQUIPO
                </div>
                <h3 className="text-4xl sm:text-5xl 2xl:text-7xl 3xl:text-8xl font-black text-amber-400 uppercase tracking-tight drop-shadow-md">
                  JUECES EVALUANDO
                </h3>
                {nextTeam1 && (
                  <div className="pt-2 2xl:pt-6">
                    <p className="text-xl sm:text-2xl 2xl:text-4xl 3xl:text-5xl text-emerald-400 font-bold max-w-2xl 2xl:max-w-4xl mx-auto">
                      Próximo equipo: <span className="text-white font-extrabold bg-emerald-950/60 px-3 2xl:px-6 py-1 2xl:py-3 rounded-xl 2xl:rounded-2xl border border-emerald-500/30 inline-block mt-1 2xl:mt-3">{nextTeam1.team?.name}</span>
                    </p>
                    <p className="text-sm sm:text-base 2xl:text-2xl 3xl:text-3xl text-gray-300 font-medium mt-1 2xl:mt-4">
                      {nextTeam1.team?.institution.name}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grilla Inferior: Recién Compitió + Próximos 2 Equipos + Alerta de Retraso */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 2xl:gap-10">

            {/* Tarjeta 1: Recién Compitió (Pasado) */}
            <div className="glass-panel p-5 2xl:p-8 border border-white/10 bg-slate-900/60 rounded-2xl 2xl:rounded-3xl space-y-3 2xl:space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2 2xl:mb-4">
                  <span className="text-xs 2xl:text-lg 3xl:text-xl font-bold text-gray-400 uppercase tracking-wider">ANTERIORMENTE</span>
                  <span className="text-[10px] 2xl:text-sm bg-white/10 text-gray-300 font-semibold px-2 2xl:px-3.5 py-0.5 2xl:py-1 rounded 2xl:rounded-lg">Finalizado</span>
                </div>

                {lastFinishedPerformance ? (
                  <div className="flex items-center gap-3 2xl:gap-5 space-y-0">
                    {lastFinishedPerformance.team?.institution.logoUrl ? (
                      <img
                        src={lastFinishedPerformance.team.institution.logoUrl}
                        alt={lastFinishedPerformance.team.institution.name}
                        className="w-10 h-10 2xl:w-20 2xl:h-20 rounded-xl 2xl:rounded-2xl object-cover border border-white/20 shrink-0 bg-black/40"
                      />
                    ) : (
                      <div className="w-10 h-10 2xl:w-20 2xl:h-20 rounded-xl 2xl:rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 border border-white/20 flex items-center justify-center font-black text-white text-sm 2xl:text-2xl shrink-0">
                        {lastFinishedPerformance.team?.name?.charAt(0) || "🏆"}
                      </div>
                    )}
                    <div className="space-y-0.5 2xl:space-y-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 2xl:gap-3">
                        <span className="text-xs 2xl:text-lg font-mono font-bold text-amber-400 bg-amber-400/20 px-1.5 2xl:px-3 py-0.5 2xl:py-1 rounded 2xl:rounded-lg">
                          #{lastFinishedPerformance.orderIndex}
                        </span>
                        <h4 className="font-bold text-white text-sm 2xl:text-2xl 3xl:text-3xl leading-tight truncate">
                          {lastFinishedPerformance.team?.name}
                        </h4>
                      </div>
                      <p className="text-xs 2xl:text-lg text-primary font-semibold truncate">
                        {lastFinishedPerformance.team?.institution.name}
                      </p>
                      <p className="text-[10px] 2xl:text-sm text-gray-400 font-mono">
                        Presentación: {formatTime(lastFinishedPerformance.scheduledPerformance)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs 2xl:text-lg text-gray-500 italic py-4">Sin rutinas previas en esta jornada.</p>
                )}
              </div>
            </div>

            {/* Tarjeta 2: Próximo Equipo 1 */}
            <div className="glass-panel p-5 2xl:p-8 border border-emerald-500/30 bg-emerald-950/20 rounded-2xl 2xl:rounded-3xl space-y-3 2xl:space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2 2xl:mb-4">
                  <span className="text-xs 2xl:text-lg 3xl:text-xl font-bold text-emerald-400 uppercase tracking-wider">PROXIMO EQUIPO</span>
                  <span className="text-[10px] 2xl:text-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 2xl:px-3.5 py-0.5 2xl:py-1 rounded 2xl:rounded-lg">En Espera</span>
                </div>

                {nextTeam1 ? (
                  <div className="flex items-center gap-3 2xl:gap-5 space-y-0">
                    {nextTeam1.team?.institution.logoUrl ? (
                      <img
                        src={nextTeam1.team.institution.logoUrl}
                        alt={nextTeam1.team.institution.name}
                        className="w-10 h-10 2xl:w-20 2xl:h-20 rounded-xl 2xl:rounded-2xl object-cover border border-emerald-500/30 shrink-0 bg-black/40"
                      />
                    ) : (
                      <div className="w-10 h-10 2xl:w-20 2xl:h-20 rounded-xl 2xl:rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 border border-emerald-400/30 flex items-center justify-center font-black text-white text-sm 2xl:text-2xl shrink-0">
                        {nextTeam1.team?.name?.charAt(0) || "🏆"}
                      </div>
                    )}
                    <div className="space-y-0.5 2xl:space-y-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 2xl:gap-3">
                        <span className="text-xs 2xl:text-lg font-mono font-bold text-emerald-300 bg-emerald-400/20 px-1.5 2xl:px-3 py-0.5 2xl:py-1 rounded 2xl:rounded-lg">
                          #{nextTeam1.orderIndex}
                        </span>
                        <h4 className="font-bold text-white text-sm 2xl:text-2xl 3xl:text-3xl leading-tight truncate">
                          {nextTeam1.team?.name}
                        </h4>
                      </div>
                      <p className="text-xs 2xl:text-lg text-emerald-300 font-semibold truncate">
                        {nextTeam1.team?.institution.name}
                      </p>
                      <p className="text-[10px] 2xl:text-sm text-gray-300 font-mono">
                        Hora Salida: <strong className="text-white">{formatTime(nextTeam1.scheduledPerformance)}</strong>
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs 2xl:text-lg text-gray-500 italic py-4">Sin equipos pendientes en lista.</p>
                )}
              </div>
            </div>

            {/* Tarjeta 3: Anuncio Hit Zero (Alternado cada 6s) o Próximo Equipo #2 */}
            {card3Tab === "hitzero" && recentHitZeroTeam ? (
              <div className="glass-panel p-5 2xl:p-8 border-2 border-amber-400/80 bg-gradient-to-br from-amber-950/70 via-amber-900/50 to-slate-950/90 rounded-2xl 2xl:rounded-3xl space-y-3 2xl:space-y-5 flex flex-col justify-between shadow-xl shadow-amber-500/10 relative overflow-hidden transition-all duration-500">
                <div className="flex justify-between items-center mb-1 2xl:mb-3">
                  <span className="text-xs 2xl:text-lg 3xl:text-xl font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="text-sm 2xl:text-xl"></span>ÚLTIMO HIT ZERO
                  </span>
                  <span className="text-[10px] 2xl:text-sm bg-amber-400 text-black font-black px-2 2xl:px-3.5 py-0.5 2xl:py-1 rounded-full uppercase tracking-wider animate-pulse">
                    ¡Felicitaciones!
                  </span>
                </div>

                <div className="flex items-center gap-3.5 2xl:gap-5 pt-0.5">
                  {recentHitZeroTeam.team?.institution.logoUrl ? (
                    <img
                      src={recentHitZeroTeam.team.institution.logoUrl}
                      alt={recentHitZeroTeam.team.institution.name}
                      className="w-11 h-11 2xl:w-20 2xl:h-20 rounded-xl 2xl:rounded-2xl object-cover border-2 border-amber-400/60 shrink-0 bg-black/40 shadow-md"
                    />
                  ) : (
                    <div className="w-11 h-11 2xl:w-20 2xl:h-20 rounded-xl 2xl:rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 border-2 border-amber-300 flex items-center justify-center font-black text-black text-xl 2xl:text-3xl shrink-0 shadow-md">
                      🎯
                    </div>
                  )}
                  <div className="space-y-0.5 2xl:space-y-1 overflow-hidden">
                    <div className="flex items-center gap-1.5 2xl:gap-3">
                      <span className="text-xs 2xl:text-lg font-mono font-black text-amber-950 bg-amber-400 px-1.5 2xl:px-3 py-0.5 2xl:py-1 rounded 2xl:rounded-lg">
                        #{recentHitZeroTeam.orderIndex}
                      </span>
                      <h4 className="font-black text-white text-base 2xl:text-2xl 3xl:text-3xl leading-tight truncate">
                        {recentHitZeroTeam.team?.name}
                      </h4>
                    </div>
                    <p className="text-xs 2xl:text-lg text-amber-300 font-bold truncate">
                      {recentHitZeroTeam.team?.institution.name}
                    </p>
                    <p className="text-[10px] 2xl:text-sm text-amber-200/80 font-medium truncate">
                      {recentHitZeroTeam.team?.category || ""} {recentHitZeroTeam.team?.level ? `• ${recentHitZeroTeam.team.level}` : ""}
                    </p>
                  </div>
                </div>

                <div className="bg-amber-400/20 border border-amber-400/30 rounded-xl 2xl:rounded-2xl py-1.5 2xl:py-3 px-2 text-center text-[10px] 2xl:text-sm font-black text-amber-300 uppercase tracking-widest flex items-center justify-center gap-1">
                  <span>✨</span> HIT ZERO CONFIRMADO <span>✨</span>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-5 2xl:p-8 border border-purple-500/30 bg-purple-950/20 rounded-2xl 2xl:rounded-3xl space-y-3 2xl:space-y-5 flex flex-col justify-between transition-all duration-500">
                <div>
                  <div className="flex justify-between items-center mb-2 2xl:mb-4">
                    <span className="text-xs 2xl:text-lg 3xl:text-xl font-bold text-purple-300 uppercase tracking-wider">DESPUES</span>
                    <span className="text-[10px] 2xl:text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold px-2 2xl:px-3.5 py-0.5 2xl:py-1 rounded 2xl:rounded-lg">Preparando</span>
                  </div>

                  {nextTeam2 ? (
                    <div className="flex items-center gap-3 2xl:gap-5 space-y-0">
                      {nextTeam2.team?.institution.logoUrl ? (
                        <img
                          src={nextTeam2.team.institution.logoUrl}
                          alt={nextTeam2.team.institution.name}
                          className="w-10 h-10 2xl:w-20 2xl:h-20 rounded-xl 2xl:rounded-2xl object-cover border border-purple-500/30 shrink-0 bg-black/40"
                        />
                      ) : (
                        <div className="w-10 h-10 2xl:w-20 2xl:h-20 rounded-xl 2xl:rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-700 border border-purple-400/30 flex items-center justify-center font-black text-white text-sm 2xl:text-2xl shrink-0">
                          {nextTeam2.team?.name?.charAt(0) || "🏆"}
                        </div>
                      )}
                      <div className="space-y-0.5 2xl:space-y-1 overflow-hidden">
                        <div className="flex items-center gap-1.5 2xl:gap-3">
                          <span className="text-xs 2xl:text-lg font-mono font-bold text-purple-300 bg-purple-400/20 px-1.5 2xl:px-3 py-0.5 2xl:py-1 rounded 2xl:rounded-lg">
                            #{nextTeam2.orderIndex}
                          </span>
                          <h4 className="font-bold text-white text-sm 2xl:text-2xl 3xl:text-3xl leading-tight truncate">
                            {nextTeam2.team?.name}
                          </h4>
                        </div>
                        <p className="text-xs 2xl:text-lg text-purple-300 font-semibold truncate">
                          {nextTeam2.team?.institution.name}
                        </p>
                        <p className="text-[10px] 2xl:text-sm text-gray-300 font-mono">
                          Hora Salida: <strong className="text-white">{formatTime(nextTeam2.scheduledPerformance)}</strong>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs 2xl:text-lg text-gray-500 italic py-4">Sin más turnos en cola.</p>
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

          {/* BUSCADOR Y MONITOREO DE EQUIPOS PARA WEB EN VIVO */}
          {showSearchTracker && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>🔍</span> Seguimiento en Tiempo Real de tu Equipo
                  </h3>
                  <p className="text-xs text-gray-400">
                    Busca tu club o colegio para conocer en qué zona se encuentra actualmente.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary-light hover:to-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-primary/40 shadow-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  {selectedTeamId ? "Cambiar Equipo 📋" : "Buscar Equipo 📋"}
                </button>
              </div>

              {/* DETALLE DEL EQUIPO SELECCIONADO */}
              {selectedTeamId && (() => {
                const selectedSchedule = teamSchedules.find(s => s.id === selectedTeamId || (s.team as any)?.id === selectedTeamId);
                if (!selectedSchedule) return null;

                const getStatusDetail = (status: string) => {
                  switch (status) {
                    case "PENDING":
                      return { label: "En Espera de Registro", station: "Pre-Registro", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
                    case "IN_REGISTRATION":
                    case "REGISTERED":
                      return { label: "Registradose", station: "Mesa de Registro", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" };
                    case "ARRIVED_WARMUP":
                    case "WARMING_UP":
                    case "FINISHED_WARMUP":
                      return { label: "En Zona de Calentamiento", station: "Calentamiento General", color: "bg-orange-500/20 text-orange-300 border-orange-500/30" };
                    case "ARRIVED_SPRINGFLOOR":
                    case "WARMING_UP_SPRINGFLOOR":
                    case "FINISHED_SPRINGFLOOR":
                      return { label: "En Springfloor", station: "Prueba Springfloor", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
                    case "IN_TRANSIT":
                      return { label: "En Traslado a Competir", station: "Trayecto a Pista", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
                    case "ARRIVED_COMPETITION":
                    case "WAITING":
                      return { label: "En tunel de Salida (Siguiente en Salir)", station: "Boca de Escenario", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
                    case "COMPETING":
                      return { label: "🔴 COMPITIENDO AHORA EN TAPETE", station: "Escenario Principal", color: "bg-red-500 text-white animate-pulse" };
                    case "FINISHED":
                      return { label: "🏁 Presentación Finalizada", station: "Rutina Concluida", color: "bg-slate-800 text-gray-300 border-white/10" };
                    default:
                      return { label: "Programado", station: "Cronograma", color: "bg-white/10 text-gray-300 border-white/10" };
                  }
                };

                const detail = getStatusDetail(selectedSchedule.status);
                return (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/15 space-y-4 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-md">
                            #{selectedSchedule.orderIndex}
                          </span>
                          <h4 className="text-xl font-black text-white">{selectedSchedule.team?.name}</h4>
                        </div>
                        <p className="text-xs text-primary font-semibold mt-0.5">{selectedSchedule.team?.institution.name}</p>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border tracking-wider ${detail.color}`}>
                        {detail.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                      <div className="bg-white/5 p-3 rounded-xl">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Ubicación Actual</span>
                        <span className="text-white font-black text-sm">{detail.station}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Hora Presentación</span>
                        <span className="text-white font-mono font-bold text-sm">{formatTime(selectedSchedule.scheduledPerformance)}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Categoría / Nivel</span>
                        <span className="text-white font-bold text-xs">{selectedSchedule.team?.division} - {selectedSchedule.team?.category}</span>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl">
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Ciudad</span>
                        <span className="text-white font-bold text-xs">{selectedSchedule.team?.institution.city || "N/D"}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* MODAL DE SELECCIÓN DE EQUIPO PARA SEGUIMIENTO */}
          {isModalOpen && (
            <div
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="glass-panel w-full max-w-xl bg-[#0f172a] border border-primary/40 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col relative"
              >
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">📋</span>
                    <div>
                      <h4 className="text-lg font-black text-white">Seleccionar Equipo</h4>
                      <p className="text-xs text-gray-400">Elige un equipo de la lista para ver su seguimiento</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-colors text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="🔍 Filtrar por nombre de equipo o institución..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-black/50 text-white border border-white/15 focus:border-primary rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {teamSchedules.filter(s => {
                    const q = searchQuery.toLowerCase();
                    const teamName = s.team?.name.toLowerCase() || "";
                    const instName = s.team?.institution.name.toLowerCase() || "";
                    return teamName.includes(q) || instName.includes(q);
                  }).map((s) => {
                    const isSelected = selectedTeamId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedTeamId(s.id);
                          setIsModalOpen(false);
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${isSelected
                          ? "bg-primary/20 border-primary text-white shadow-lg"
                          : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
                          }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded">
                              #{s.orderIndex}
                            </span>
                            <h5 className="font-bold text-white text-sm truncate">{s.team?.name}</h5>
                          </div>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{s.team?.institution.name}</p>
                        </div>
                        <span className="text-xs font-bold text-primary">
                          {isSelected ? "✓ Seleccionado" : "Elegir →"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* VISTA B: TABLA / HORARIO GENERAL TICKER (Auto-Scroll Automático y Suave) */
        <div className="glass-panel p-6 2xl:p-12 border border-white/10 rounded-2xl space-y-6 2xl:space-y-10 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 2xl:pb-8">
            <h3 className="font-black text-white text-xl 2xl:text-4xl 3xl:text-5xl uppercase tracking-wide flex items-center gap-3">
              <span>📋 Cronograma de Próximas Salidas</span>
              <span className="text-sm 2xl:text-2xl text-gray-300 font-normal">({upcomingSchedules.length} Pendientes)</span>
            </h3>
            <span className="text-sm 2xl:text-3xl text-primary font-mono font-bold flex items-center gap-3">
              <span className="w-3 h-3 2xl:w-5 2xl:h-5 bg-emerald-400 rounded-full animate-ping" />
              <span>Desplazamiento Automático Continuo ⬇️</span>
            </span>
          </div>

          <div
            id="tv-schedule-table-container"
            className="max-h-[65vh] 2xl:max-h-[75vh] overflow-y-auto pr-1 scroll-smooth"
          >
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0f172a] z-10 shadow-md">
                <tr className="border-b-2 border-white/20 text-purple-300 text-sm 2xl:text-3xl 3xl:text-4xl font-black uppercase tracking-wider">
                  <th className="py-4 px-4 2xl:py-8 2xl:px-8">#</th>
                  <th className="py-4 px-4 2xl:py-8 2xl:px-8">Equipo</th>
                  <th className="py-4 px-4 2xl:py-8 2xl:px-8">Institución</th>
                  <th className="py-4 px-4 2xl:py-8 2xl:px-8 text-center">Hora Presentación</th>
                  <th className="py-4 px-4 2xl:py-8 2xl:px-8 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15">
                {tickerSchedules.map((s) => (
                  <tr key={s.id} className={`hover:bg-white/5 transition-colors ${s.status === "COMPETING" ? "bg-red-500/20 font-bold" : ""}`}>
                    <td className="py-4 px-4 2xl:py-9 2xl:px-8 font-mono font-black text-amber-400 text-xl 2xl:text-4xl 3xl:text-5xl">#{s.orderIndex}</td>
                    <td className="py-4 px-4 2xl:py-9 2xl:px-8">
                      <div className="flex items-center gap-4 2xl:gap-8">
                        {s.team?.institution.logoUrl ? (
                          <img
                            src={s.team.institution.logoUrl}
                            alt={s.team.institution.name}
                            className="w-10 h-10 2xl:w-24 2xl:h-24 3xl:w-32 3xl:h-32 rounded-2xl object-cover border-2 border-white/40 shrink-0 bg-black/40 shadow-md"
                          />
                        ) : (
                          <div className="w-10 h-10 2xl:w-24 2xl:h-24 3xl:w-32 3xl:h-32 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 border-2 border-white/40 flex items-center justify-center font-black text-white text-base 2xl:text-4xl shrink-0 shadow-md">
                            {s.team?.name?.charAt(0) || "🏆"}
                          </div>
                        )}
                        <span className="font-black text-white text-lg 2xl:text-4xl 3xl:text-5xl leading-snug tracking-tight">{s.team?.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 2xl:py-9 2xl:px-8 text-slate-100 font-bold text-base 2xl:text-3xl 3xl:text-4xl">{s.team?.institution.name}</td>
                    <td className="py-4 px-4 2xl:py-9 2xl:px-8 text-center font-mono font-black text-cyan-300 text-lg 2xl:text-4xl 3xl:text-5xl">{formatTime(s.scheduledPerformance)}</td>
                    <td className="py-4 px-4 2xl:py-9 2xl:px-8 text-center">
                      <span className={`px-4 py-2 2xl:px-8 2xl:py-4 rounded-2xl text-xs 2xl:text-3xl font-black tracking-wide ${s.status === "COMPETING"
                        ? "bg-red-500 text-white animate-pulse shadow-xl border-2 border-red-400"
                        : s.status === "FINISHED"
                          ? "bg-white/10 text-gray-300"
                          : "bg-emerald-500/30 text-emerald-200 border-2 border-emerald-400/50"
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

      {/* Sticker Flotante de Alerta de NUEVO HIT ZERO en tiempo real */}
      {activeHitZeroSticker && (
        <div className="fixed top-16 right-4 sm:top-20 sm:right-8 z-[9999] animate-bounce transition-all duration-500 max-w-xs sm:max-w-sm pointer-events-auto">
          <div className="glass-panel p-4 sm:p-5 border-4 border-amber-300 bg-gradient-to-br from-amber-500 via-amber-600 to-amber-900 text-white rounded-3xl shadow-[0_0_60px_rgba(251,191,36,0.85)] flex items-center gap-3.5 relative overflow-hidden">
            <div className="space-y-1 min-w-0">
              <div className="inline-block bg-black text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow border border-amber-400/40 animate-pulse">
                ✨ ¡ATENCION! ✨
              </div>
              <h3 className="font-black text-white text-base sm:text-lg leading-tight drop-shadow">
                ¡Nuevo Equipo Hit Zero!
              </h3>
              <p className="text-xs font-extrabold text-amber-200">
                Atentos al anuncio a continuación...
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
