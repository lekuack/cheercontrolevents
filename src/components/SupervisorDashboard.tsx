"use client";

import { useState, useMemo } from "react";
import {
  setGlobalAlert,
  clearGlobalAlert,
  supervisorMoveTeam,
} from "@/app/admin/actions";

interface Team {
  name: string;
  institution: { name: string };
}

interface Schedule {
  id: string;
  status: string;
  warmupZone: string;
  springfloorZone: string;
  orderIndex: number;
  scheduledPerformance: Date | string;
  team: Team;
}

interface Event {
  id: string;
  name: string;
  globalAlert: string | null;
  globalAlertAt: Date | string | null;
  warmupZonesCount: number;
  springfloorZonesCount: number;
  forceSameZone: boolean;
  schedules: Schedule[];
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  PENDING:                  { label: "Pendiente",            color: "text-gray-400",   icon: "⏳" },
  IN_REGISTRATION:          { label: "En Registro",          color: "text-blue-400",   icon: "📝" },
  REGISTERED:               { label: "Registrado",           color: "text-indigo-400", icon: "✅" },
  ARRIVED_WARMUP:           { label: "Llegada Calent.",      color: "text-purple-400", icon: "🏃" },
  WARMING_UP:               { label: "Calentando",           color: "text-fuchsia-400",icon: "🔥" },
  FINISHED_WARMUP:          { label: "Calent. Final.",       color: "text-pink-400",   icon: "✔️" },
  ARRIVED_SPRINGFLOOR:      { label: "Llegada Spring.",      color: "text-teal-400",   icon: "🤸" },
  WARMING_UP_SPRINGFLOOR:   { label: "Spring. Calentando",   color: "text-cyan-400",   icon: "🤸" },
  FINISHED_SPRINGFLOOR:     { label: "Spring. Final.",       color: "text-sky-400",    icon: "✔️" },
  IN_TRANSIT:               { label: "En Traslado",          color: "text-amber-400",  icon: "🚐" },
  ARRIVED_COMPETITION:      { label: "Llegada Pista",        color: "text-orange-400", icon: "🏟️" },
  WAITING:                  { label: "Boca Escenario",       color: "text-yellow-400", icon: "🎯" },
  COMPETING:                { label: "Compitiendo",          color: "text-green-400",  icon: "🏆" },
  FINISHED:                 { label: "Finalizado",           color: "text-gray-400",   icon: "🏁" },
};

const ALL_STATUSES = Object.keys(STATUS_LABELS);

function isDelayed(s: Schedule): boolean {
  if (s.status === "FINISHED" || s.status === "COMPETING") return false;
  return new Date() > new Date(s.scheduledPerformance);
}

export default function SupervisorDashboard({ event }: { event: Event }) {
  const [alertMsg, setAlertMsg] = useState(event.globalAlert || "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editWarmupZone, setEditWarmupZone] = useState("");
  const [editSpringfloorZone, setEditSpringfloorZone] = useState("");
  const [editOrderIndex, setEditOrderIndex] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [alertSaving, setAlertSaving] = useState(false);
  const [saving, setSaving] = useState(false);

  const getZoneLetter = (i: number) => String.fromCharCode(65 + i);
  const warmupZones = Array.from({ length: event.warmupZonesCount }, (_, i) => getZoneLetter(i));
  const springfloorZones = Array.from({ length: event.springfloorZonesCount }, (_, i) => getZoneLetter(i));

  // Sortear: activos por orderIndex, finalizados al fondo
  const sortedSchedules = useMemo(() => {
    const active = event.schedules
      .filter(s => s.status !== "FINISHED")
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const finished = event.schedules
      .filter(s => s.status === "FINISHED")
      .sort((a, b) => a.orderIndex - b.orderIndex);
    return [...active, ...finished];
  }, [event.schedules]);

  const filteredSchedules = useMemo(() => sortedSchedules.filter((s) => {
    const matchSearch =
      !search ||
      s.team.name.toLowerCase().includes(search.toLowerCase()) ||
      s.team.institution.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "ALL" || s.status === filterStatus;
    return matchSearch && matchStatus;
  }), [sortedSchedules, search, filterStatus]);

  // Estadísticas rápidas
  const stats = useMemo(() => ({
    total: event.schedules.length,
    finished: event.schedules.filter(s => s.status === "FINISHED").length,
    competing: event.schedules.filter(s => s.status === "COMPETING" || s.status === "WAITING").length,
    delayed: event.schedules.filter(s => isDelayed(s)).length,
    active: event.schedules.filter(s => !["FINISHED", "PENDING"].includes(s.status)).length,
  }), [event.schedules]);

  const handleStartEdit = (s: Schedule) => {
    setEditingId(s.id);
    setEditStatus(s.status);
    setEditWarmupZone(s.warmupZone);
    setEditSpringfloorZone(s.springfloorZone);
    setEditOrderIndex(s.orderIndex);
  };

  const handleSaveMove = async (scheduleId: string) => {
    setSaving(true);
    const fd = new FormData();
    fd.append("scheduleId", scheduleId);
    fd.append("newStatus", editStatus);
    fd.append("warmupZone", editWarmupZone);
    fd.append("springfloorZone", editSpringfloorZone);
    fd.append("orderIndex", String(editOrderIndex));
    fd.append("eventId", event.id);
    await supervisorMoveTeam(fd);
    setSaving(false);
    setEditingId(null);
  };

  const handleSetAlert = async () => {
    setAlertSaving(true);
    const fd = new FormData();
    fd.append("eventId", event.id);
    fd.append("message", alertMsg);
    await setGlobalAlert(fd);
    setAlertSaving(false);
  };

  const handleClearAlert = async () => {
    const fd = new FormData();
    fd.append("eventId", event.id);
    await clearGlobalAlert(fd);
    setAlertMsg("");
  };

  const alertTime = event.globalAlertAt
    ? new Date(event.globalAlertAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
    : null;

  // Card color depending on status
  const getCardClasses = (s: Schedule) => {
    if (s.status === "FINISHED") {
      return "bg-green-950/50 border border-green-800/40";
    }
    if (isDelayed(s)) {
      return "bg-red-950/40 border border-red-800/40";
    }
    return "bg-white/5 border border-white/5";
  };

  return (
    <div className="space-y-5">
      {/* ESTADÍSTICAS RÁPIDAS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "En Actividad", value: stats.active, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
          { label: "En Pista/Espera", value: stats.competing, color: "text-green-400", bg: "bg-green-900/20 border-green-800/20" },
          { label: "⚠️ Con Retraso", value: stats.delayed, color: "text-red-400", bg: "bg-red-900/20 border-red-800/20" },
          { label: "✅ Finalizados", value: stats.finished, color: "text-gray-300", bg: "bg-white/5 border-white/5" },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} border rounded-xl p-3 text-center`}>
            <div className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* PANEL ALERTA GLOBAL */}
      <div className="glass-panel p-5 border border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📣</span>
          <h3 className="font-bold text-white text-sm">Alerta Global — Broadcast a Todo el Staff</h3>
        </div>

        {event.globalAlert && (
          <div className="bg-red-500/15 border border-red-500/50 rounded-xl p-3 mb-3 flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] text-red-400 font-extrabold uppercase tracking-widest block mb-1">
                🚨 ALERTA ACTIVA {alertTime && `· ${alertTime}`}
              </span>
              <p className="text-red-200 text-sm">{event.globalAlert}</p>
            </div>
            <button
              onClick={handleClearAlert}
              className="text-[10px] text-red-400 hover:text-white bg-red-900/40 hover:bg-red-700/50 px-2 py-1 rounded transition-colors shrink-0"
            >
              ✕ Limpiar
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={alertMsg}
            onChange={(e) => setAlertMsg(e.target.value)}
            placeholder="Ej. Retraso de 10 min — notifiquen a equipos en calentamiento"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSetAlert}
            disabled={!alertMsg.trim() || alertSaving}
            className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-40 shrink-0"
          >
            {alertSaving ? "…" : "📢 Publicar"}
          </button>
        </div>
      </div>

      {/* PANEL CONTROL DE EQUIPOS */}
      <div className="glass-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🎛️</span>
          <h3 className="font-bold text-white text-sm">Control de Equipos</h3>
          <div className="ml-auto flex items-center gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-700 inline-block"></span>Con retraso</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-800 inline-block"></span>Finalizado</span>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar equipo o institución…"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
          >
            <option value="ALL">Todos los estados</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>{STATUS_LABELS[st]?.icon} {STATUS_LABELS[st]?.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
          {filteredSchedules.length === 0 && (
            <div className="text-center text-gray-500 py-8 text-sm">No hay equipos que coincidan.</div>
          )}

          {filteredSchedules.map((s) => {
            const delayed = isDelayed(s);
            const finished = s.status === "FINISHED";
            const stInfo = STATUS_LABELS[s.status] ?? { label: s.status, color: "text-gray-400", icon: "❓" };

            return (
              <div key={s.id} className={`rounded-xl overflow-hidden transition-colors ${getCardClasses(s)}`}>
                {/* Fila principal */}
                <div className="flex items-center gap-3 p-3">
                  {/* Número de participación */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                    finished ? "bg-green-800/50 text-green-300" :
                    delayed  ? "bg-red-800/50 text-red-300" :
                               "bg-primary/20 text-primary"
                  }`}>
                    #{s.orderIndex}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm truncate flex items-center gap-1.5">
                      {s.team.name}
                      {delayed && (
                        <span className="text-[9px] bg-red-700/60 text-red-300 font-extrabold px-1.5 py-0.5 rounded-full shrink-0 animate-pulse">
                          ⏰ RETRASO
                        </span>
                      )}
                      {finished && (
                        <span className="text-[9px] bg-green-800/60 text-green-300 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                          🏁 FIN
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate">{s.team.institution.name}</div>
                  </div>

                  <div className="text-right shrink-0 space-y-0.5">
                    <span className={`text-xs font-bold ${stInfo.color} flex items-center gap-1 justify-end`}>
                      {stInfo.icon} {stInfo.label}
                    </span>
                    {(event.warmupZonesCount > 1 || event.springfloorZonesCount > 1) && (
                      <div className="text-[10px] text-gray-500">
                        {event.warmupZonesCount > 1 && `🔥${s.warmupZone}`}
                        {event.warmupZonesCount > 1 && event.springfloorZonesCount > 1 && " · "}
                        {event.springfloorZonesCount > 1 && `🤸${s.springfloorZone}`}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => editingId === s.id ? setEditingId(null) : handleStartEdit(s)}
                    className={`text-xs px-2 py-1 rounded-lg font-bold transition-all shrink-0 ${
                      editingId === s.id
                        ? "bg-white/10 text-gray-300"
                        : "bg-primary/20 text-primary hover:bg-primary/30"
                    }`}
                  >
                    {editingId === s.id ? "✕" : "✏️"}
                  </button>
                </div>

                {/* Panel de edición */}
                {editingId === s.id && (
                  <div className="border-t border-white/10 bg-black/40 p-4 space-y-3">
                    <div className="text-[10px] text-warning font-extrabold uppercase tracking-widest">
                      ⚙️ Corrección Manual — {s.team.name}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Número de participación */}
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1"># Participación</label>
                        <input
                          type="number"
                          min={1}
                          value={editOrderIndex}
                          onChange={(e) => setEditOrderIndex(parseInt(e.target.value) || 1)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-warning text-center font-bold"
                        />
                      </div>

                      {/* Estado */}
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Estado</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                        >
                          {ALL_STATUSES.map((st) => (
                            <option key={st} value={st}>{STATUS_LABELS[st]?.icon} {STATUS_LABELS[st]?.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Zona Calentamiento — solo si hay más de 1 */}
                      {event.warmupZonesCount > 1 && (
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">🔥 Zona Calent.</label>
                          <select
                            value={editWarmupZone}
                            onChange={(e) => {
                              setEditWarmupZone(e.target.value);
                              if (event.forceSameZone) setEditSpringfloorZone(e.target.value);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
                          >
                            {warmupZones.map((z) => <option key={z} value={z}>Zona {z}</option>)}
                          </select>
                        </div>
                      )}

                      {/* Zona Springfloor — solo si hay más de 1 */}
                      {event.springfloorZonesCount > 1 && (
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">
                            🤸 Spring. {event.forceSameZone && <span className="text-warning">(forzada)</span>}
                          </label>
                          <select
                            value={editSpringfloorZone}
                            onChange={(e) => setEditSpringfloorZone(e.target.value)}
                            disabled={event.forceSameZone}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary disabled:opacity-40"
                          >
                            {springfloorZones.map((z) => <option key={z} value={z}>Zona {z}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleSaveMove(s.id)}
                        disabled={saving}
                        className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-extrabold py-2 rounded-lg transition-all active:scale-95 disabled:opacity-60"
                      >
                        {saving ? "Guardando…" : "💾 Guardar Cambios"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Leyenda de colores */}
        <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-4 text-[10px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-950/50 border border-green-800/40 inline-block"></span>
            Finalizado (verde)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-950/40 border border-red-800/40 inline-block"></span>
            Con retraso (rojo) — hora programada ya pasó
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-white/5 border border-white/5 inline-block"></span>
            En curso (normal)
          </span>
        </div>
      </div>
    </div>
  );
}
