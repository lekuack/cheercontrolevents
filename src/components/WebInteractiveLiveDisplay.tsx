"use client";

import { useState } from "react";
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
    id?: string;
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

interface WebInteractiveLiveDisplayProps {
  eventId: string;
  schedules: ScheduleItem[];
}

export default function WebInteractiveLiveDisplay({ eventId, schedules }: WebInteractiveLiveDisplayProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const teamSchedules = schedules.filter(s => s.type !== "BREAK" && s.team);

  // Equipo compitiendo actualmente
  const currentPerformance = teamSchedules.find(s => s.status === "COMPETING");

  // Próximos equipos pendientes de competir
  const upcomingSchedules = teamSchedules.filter(s => !["FINISHED", "COMPETING"].includes(s.status));
  const nextTeam1 = upcomingSchedules[0];

  // Filtro de equipos dentro de la modal
  const filteredTeamSchedules = teamSchedules.filter(s => {
    const q = searchQuery.toLowerCase();
    const teamName = s.team?.name.toLowerCase() || "";
    const instName = s.team?.institution.name.toLowerCase() || "";
    return teamName.includes(q) || instName.includes(q);
  });

  // Equipo seleccionado por el usuario para rastreo
  const selectedSchedule = teamSchedules.find(s => s.id === selectedTeamId || s.team?.id === selectedTeamId);

  // Estado descriptivo en español y estación en tiempo real
  const getStatusDetail = (status: string) => {
    switch (status) {
      case "PENDING":
        return { label: "En Espera de Registro", station: "Pre-Registro", step: 1, color: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
      case "IN_REGISTRATION":
      case "REGISTERED":
        return { label: "Registrado en Recinto", station: "Mesa de Registro", step: 2, color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" };
      case "ARRIVED_WARMUP":
      case "WARMING_UP":
      case "FINISHED_WARMUP":
        return { label: "En Zona de Calentamiento", station: "Calentamiento General", step: 3, color: "bg-orange-500/20 text-orange-300 border-orange-500/30" };
      case "ARRIVED_SPRINGFLOOR":
      case "WARMING_UP_SPRINGFLOOR":
      case "FINISHED_SPRINGFLOOR":
        return { label: "En Pista Springfloor", station: "Prueba de Tapete Springfloor", step: 4, color: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
      case "IN_TRANSIT":
        return { label: "En Traslado al Escenario", station: "Trayecto a Pista", step: 5, color: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
      case "ARRIVED_COMPETITION":
      case "WAITING":
        return { label: "En Boca de Escenario (Siguiente en Salir)", station: "Boca de Escenario", step: 6, color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
      case "COMPETING":
        return { label: "🔴 COMPITIENDO AHORA EN PISTA", station: "Escenario Principal", step: 7, color: "bg-red-500 text-white animate-pulse" };
      case "FINISHED":
        return { label: "🏁 Presentación Finalizada", station: "Rutina Concluida", step: 8, color: "bg-slate-800 text-gray-300 border-white/10" };
      default:
        return { label: "Programado", station: "Cronograma", step: 0, color: "bg-white/10 text-gray-300 border-white/10" };
    }
  };

  const formatTime = (d: string | Date | null | undefined) => {
    if (!d) return "--:--";
    return new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <SocketSync eventId={eventId} />

      {/* Banner Superior: Equipo Compitiendo Actualmente o Jueces Evaluando */}
      <div className="glass-panel p-6 border-2 border-red-500/80 bg-gradient-to-br from-red-950/40 via-slate-900/90 to-slate-950/90 rounded-3xl shadow-2xl relative overflow-hidden">
        {currentPerformance ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                <span className="text-xs font-black text-red-400 uppercase tracking-widest">EN PISTA AHORA MISMO</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-red-300 bg-red-500/20 px-2.5 py-1 rounded-xl">
                  #{currentPerformance.orderIndex}
                </span>
                {currentPerformance.scheduledPerformance && (
                  <span className="text-xs font-mono font-bold text-gray-300 bg-white/10 px-2.5 py-1 rounded-xl">
                    ⏰ {formatTime(currentPerformance.scheduledPerformance)}
                  </span>
                )}
                {currentPerformance.isHitZero && (
                  <span className="bg-amber-400 text-black text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider animate-bounce">
                    🎯 HIT ZERO
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              {currentPerformance.team?.institution.logoUrl ? (
                <img
                  src={currentPerformance.team.institution.logoUrl}
                  alt={currentPerformance.team.institution.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/20 shadow-xl shrink-0 bg-black/40"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 border-2 border-white/20 shadow-xl flex items-center justify-center font-black text-white text-2xl shrink-0">
                  {currentPerformance.team?.name?.charAt(0) || "🏆"}
                </div>
              )}
              <div>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  {currentPerformance.team?.name}
                </h2>
                <p className="text-base sm:text-xl font-bold text-primary mt-0.5">
                  {currentPerformance.team?.institution.name}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 text-xs text-gray-400">
                  {currentPerformance.team?.division && (
                    <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">{currentPerformance.team.division}</span>
                  )}
                  {currentPerformance.team?.category && (
                    <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">{currentPerformance.team.category}</span>
                  )}
                  {currentPerformance.team?.level && (
                    <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10">{currentPerformance.team.level}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-3">
            <div className="inline-block bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
              ⏳ EN ESPERA DEL SIGUIENTE EQUIPO
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-amber-400 uppercase tracking-tight drop-shadow-md">
              JUECES EVALUANDO
            </h3>
            {nextTeam1 && (
              <div className="pt-1">
                <p className="text-base sm:text-lg text-emerald-400 font-bold max-w-xl mx-auto">
                  Próximo equipo: <span className="text-white font-extrabold bg-emerald-950/60 px-2.5 py-0.5 rounded-xl border border-emerald-500/30 inline-block mt-0.5">{nextTeam1.team?.name}</span>
                </p>
                <p className="text-xs sm:text-sm text-gray-300 font-medium mt-0.5">
                  {nextTeam1.team?.institution.name}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RASTREADOR INTERACTIVO DE MI EQUIPO */}
      <div className="glass-panel p-6 border-2 border-primary/40 bg-slate-900/80 rounded-2xl shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>🔍 Rastreador Interactivo de Equipos</span>
              <span className="text-xs font-normal text-primary bg-primary/20 px-2.5 py-0.5 rounded-full border border-primary/30">
                Selecciona tu equipo
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Busca el nombre de tu club o colegio para conocer en tiempo real en qué zona se encuentra.
            </p>
          </div>
        </div>

        {/* Botón para abrir Modal de Selección de Equipo */}
        <div className="space-y-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-gradient-to-r from-primary/20 via-primary/30 to-purple-600/20 hover:from-primary/30 hover:to-purple-600/30 border-2 border-primary/50 text-white font-black py-4 px-6 rounded-2xl shadow-xl transition-all active:scale-98 flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl group-hover:scale-110 transition-transform">🏆</span>
              <div className="text-left">
                <span className="text-sm font-black block">
                  {selectedSchedule ? `Equipo Seleccionado: ${selectedSchedule.team?.name}` : "Seleccionar un Equipo para Monitorear"}
                </span>
                <span className="text-xs text-primary-light font-normal">
                  {selectedSchedule ? `${selectedSchedule.team?.institution.name} • Clic para cambiar` : "Haz clic aquí para abrir la lista completa de equipos"}
                </span>
              </div>
            </div>
            <span className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-xl group-hover:bg-primary-light transition-colors shrink-0">
              {selectedSchedule ? "Cambiar" : "Abrir Lista 📋"}
            </span>
          </button>
        </div>

        {/* PANEL DETALLADO DEL EQUIPO SELECCIONADO */}
        {selectedSchedule ? (() => {
          const detail = getStatusDetail(selectedSchedule.status);
          return (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/15 space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-black text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-md">
                      #{selectedSchedule.orderIndex}
                    </span>
                    <h4 className="text-2xl font-black text-white">{selectedSchedule.team?.name}</h4>
                  </div>
                  <p className="text-sm text-primary font-semibold mt-0.5">{selectedSchedule.team?.institution.name}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border tracking-wider ${detail.color}`}>
                    {detail.label}
                  </span>
                </div>
              </div>

              {/* Indicador de Reconocimiento Hit Zero */}
              {selectedSchedule.isHitZero && (
                <div className="p-3.5 rounded-xl border border-amber-400/60 bg-amber-500/15 flex items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl animate-bounce">🎯</span>
                    <div>
                      <h5 className="font-black text-amber-300 text-sm uppercase tracking-wider">
                        ¡RECONOCIMIENTO HIT ZERO OTORGADO!
                      </h5>
                      <p className="text-xs text-amber-200/90">
                        Presentación perfecta sin deducciones ni faltas en la rutina.
                      </p>
                    </div>
                  </div>
                  {selectedSchedule.hitZeroAwarded ? (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3 py-1 rounded-lg shrink-0">
                      🏆 Entregado en Escenario
                    </span>
                  ) : (
                    <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold px-3 py-1 rounded-lg shrink-0">
                      📣 Pendiente por Anunciar
                    </span>
                  )}
                </div>
              )}

              {/* Línea de Tiempos Estimada */}
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
        })() : (
          <div className="text-center py-6 text-gray-400 text-xs italic bg-white/5 rounded-xl border border-white/5">
            Presiona el botón superior para seleccionar un equipo y ver en tiempo real su estado, ubicación y reconocimientos.
          </div>
        )}
      </div>

      {/* VENTANA MODAL PARA SELECCIONAR EQUIPO */}
      {isModalOpen && (
        <div 
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel w-full max-w-xl bg-[#0f172a] border border-primary/40 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col relative"
          >
            {/* Cabecera de la Modal */}
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

            {/* Buscador dentro de la modal */}
            <input
              type="text"
              placeholder="🔍 Filtrar por nombre de equipo o institución..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full bg-black/50 text-white border border-white/15 focus:border-primary rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            {/* Lista Scrollable de Equipos */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredTeamSchedules.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-xs italic">
                  No se encontraron equipos que coincidan con la búsqueda.
                </div>
              ) : (
                filteredTeamSchedules.map((s) => {
                  const isSelected = selectedTeamId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedTeamId(s.id);
                        setIsModalOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
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

                      <div className="flex items-center gap-2 shrink-0">
                        {s.isHitZero && (
                          <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold">
                            🎯 Hit Zero
                          </span>
                        )}
                        <span className="text-xs font-bold text-primary">
                          {isSelected ? "✓ Seleccionado" : "Elegir →"}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Modal */}
            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn-primary py-2 px-5 font-bold text-xs"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
