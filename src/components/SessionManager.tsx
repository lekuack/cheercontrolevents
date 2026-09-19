"use client";

import { useState, useEffect } from "react";
import { EventSession, Schedule, Team, Institution } from "@prisma/client";
import { createEventSession, updateEventSession, restoreScheduleSnapshot, ScheduleSnapshotItem } from "@/app/admin/schedule-actions";

import ScheduleTable from "./ScheduleTable";
import AddTeamModal from "./AddTeamModal";
import MoveDivisionModal from "./MoveDivisionModal";
import ExportScheduleModal from "./ExportScheduleModal";
import SessionConfigForm from "./SessionConfigForm";
import { addTeamToSession, addTeamsToSession, addBreakToSession, autoSortSessionSchedules, clearSessionSchedules } from "@/app/admin/schedule-actions";

type SessionWithSchedule = EventSession & {
  schedules: (Schedule & {
    team?: (Team & { institution: Institution }) | null;
  })[];
};

export default function SessionManager({ 
  eventId, 
  sessions,
  availableTeams,
  warmupZonesCount = 1,
  springfloorZonesCount = 1,
  registrationZonesCount = 1
}: { 
  eventId: string, 
  sessions: SessionWithSchedule[],
  availableTeams: (Team & { institution: Institution })[],
  warmupZonesCount?: number,
  springfloorZonesCount?: number,
  registrationZonesCount?: number
}) {
  const [activeSession, setActiveSession] = useState(sessions[0]?.id || null);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [isMoveDivisionModalOpen, setIsMoveDivisionModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedGroupForModal, setSelectedGroupForModal] = useState<string | undefined>(undefined);
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);

  // Historial de cambios para Deshacer (Undo) / Rehacer (Redo) por sesión
  const [history, setHistory] = useState<{
    [sessionId: string]: {
      past: ScheduleSnapshotItem[][];
      future: ScheduleSnapshotItem[][];
    };
  }>({});

  const makeSnapshot = (schedulesList: (Schedule & { team?: any })[]): ScheduleSnapshotItem[] => {
    return schedulesList.map((s, idx) => ({
      id: s.id,
      type: s.type,
      teamId: s.teamId || null,
      breakTitle: s.breakTitle || null,
      showBreakTitle: s.showBreakTitle !== false,
      breakDuration: s.breakDuration || null,
      isExhibition: !!s.isExhibition,
      orderIndex: idx,
    }));
  };

  const pushHistoryState = (sessionId: string) => {
    const sessionObj = sessions.find((s) => s.id === sessionId);
    if (!sessionObj) return;

    const currentSnap = makeSnapshot(sessionObj.schedules);
    setHistory((prev) => {
      const sessHist = prev[sessionId] || { past: [], future: [] };
      return {
        ...prev,
        [sessionId]: {
          past: [...sessHist.past, currentSnap],
          future: [],
        },
      };
    });
  };

  const handleUndo = async (sessionId?: string) => {
    const targetSessionId = sessionId || activeSession;
    if (!targetSessionId) return;

    const sessionObj = sessions.find((s) => s.id === targetSessionId);
    if (!sessionObj) return;

    const sessHist = history[targetSessionId];
    if (!sessHist || sessHist.past.length === 0) return;

    const pastCopy = [...sessHist.past];
    const prevSnap = pastCopy.pop()!;
    const currentSnap = makeSnapshot(sessionObj.schedules);

    setHistory((prev) => ({
      ...prev,
      [targetSessionId]: {
        past: pastCopy,
        future: [currentSnap, ...(prev[targetSessionId]?.future || [])],
      },
    }));

    await restoreScheduleSnapshot(targetSessionId, prevSnap);
  };

  const handleRedo = async (sessionId?: string) => {
    const targetSessionId = sessionId || activeSession;
    if (!targetSessionId) return;

    const sessionObj = sessions.find((s) => s.id === targetSessionId);
    if (!sessionObj) return;

    const sessHist = history[targetSessionId];
    if (!sessHist || sessHist.future.length === 0) return;

    const futureCopy = [...sessHist.future];
    const nextSnap = futureCopy.shift()!;
    const currentSnap = makeSnapshot(sessionObj.schedules);

    setHistory((prev) => ({
      ...prev,
      [targetSessionId]: {
        past: [...(prev[targetSessionId]?.past || []), currentSnap],
        future: futureCopy,
      },
    }));

    await restoreScheduleSnapshot(targetSessionId, nextSnap);
  };

  // Atajos de teclado para Cmd+Z / Cmd+Shift+Z / Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && ["INPUT", "TEXTAREA", "SELECT"].includes(activeEl.tagName)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSession, history, sessions]);

  const handleCreate = async () => {
    const name = prompt("Nombre de la nueva jornada (ej: Sábado Mañana)");
    if (!name) return;
    
    // Default times based on today
    const baseDate = new Date();
    baseDate.setHours(9, 0, 0, 0);

    await createEventSession(eventId, {
      name,
      date: baseDate,
      registrationStartTime: baseDate,
      warmup1StartTime: new Date(baseDate.getTime() + 15 * 60000),
      springfloorStartTime: new Date(baseDate.getTime() + 30 * 60000),
      competitionStartTime: new Date(baseDate.getTime() + 45 * 60000),
      timeBetweenTeams: 5,
      registrationDuration: 15,
      warmup1Duration: 15,
      springfloorDuration: 15,
      competitionDuration: 4,
      staffCallTimeOffset: 10
    });
  };

  const handleAddTeamClick = (sessionId: string) => {
    setModalSessionId(sessionId);
    setIsAddTeamModalOpen(true);
  };

  const handleModalAddTeams = async (teamIds: string[]) => {
    if (!modalSessionId) return;
    pushHistoryState(modalSessionId);
    await addTeamsToSession(modalSessionId, eventId, teamIds);
  };

  const handleAddBreak = async (sessionId: string) => {
    const title = prompt("Título de la pausa/actividad (ej: Almuerzo, Premiación):");
    if (!title) return;
    const duration = prompt("Duración en minutos (ej: 30):");
    if (!duration || isNaN(Number(duration))) return;

    const showTitle = confirm("¿Deseas mostrar este título al público?\n(Si cancelas, se mostrará como 'Actividad')");

    pushHistoryState(sessionId);
    await addBreakToSession(sessionId, eventId, title, Number(duration), showTitle);
  };

  const handleAutoSort = async (sessionId: string) => {
    const confirmSort = confirm(
      "⚠️ ¿Estás seguro de que deseas reordenar automáticamente? Todos los equipos se agruparán por Categoría y División, y los horarios se recalcularán."
    );
    if (confirmSort) {
      pushHistoryState(sessionId);
      await autoSortSessionSchedules(sessionId);
    }
  };

  const handleClearSession = async (sessionId: string) => {
    const confirmClear = confirm(
      "🗑️ ¿Estás seguro de que deseas VACIAR esta jornada? Se eliminarán todos los equipos y pausas agregadas a este cronograma."
    );
    if (confirmClear) {
      pushHistoryState(sessionId);
      await clearSessionSchedules(sessionId);
    }
  };

  const handleOpenMoveDivisionModal = (groupName?: string) => {
    setSelectedGroupForModal(groupName);
    setIsMoveDivisionModalOpen(true);
  };

  const activeSessionObj = sessions.find(s => s.id === activeSession);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Jornadas (Sesiones)</h2>
        <button onClick={handleCreate} className="btn-primary text-sm py-2 px-4 rounded-lg">
          + Crear Jornada
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="glass-panel p-8 text-center text-gray-400">
          No hay jornadas creadas. Crea una para empezar a armar el cronograma.
        </div>
      ) : (
        <div className="flex gap-2 border-b border-white/10 pb-2">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSession(s.id)}
              className={`px-4 py-2 rounded-t-lg transition-colors ${
                activeSession === s.id ? "bg-white/10 text-white font-bold" : "text-gray-400 hover:text-white"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Render active session details */}
      {sessions.map(s => {
        const sessHist = history[s.id];
        const canUndo = sessHist && sessHist.past.length > 0;
        const canRedo = sessHist && sessHist.future.length > 0;

        return (
          <div key={s.id} className="glass-panel p-6 space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h3 className="text-lg font-bold text-white">Cronograma: {s.name}</h3>
              <div className="flex gap-2 flex-wrap">
                {/* Botones Deshacer y Rehacer */}
                <div className="flex gap-1 bg-white/5 border border-white/10 p-0.5 rounded-lg">
                  <button
                    onClick={() => handleUndo(s.id)}
                    disabled={!canUndo}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                      canUndo
                        ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30"
                        : "text-gray-600 cursor-not-allowed opacity-50"
                    }`}
                    title="Deshacer último cambio (Cmd+Z / Ctrl+Z)"
                  >
                    <span>↩️</span> Deshacer
                  </button>
                  <button
                    onClick={() => handleRedo(s.id)}
                    disabled={!canRedo}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                      canRedo
                        ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30"
                        : "text-gray-600 cursor-not-allowed opacity-50"
                    }`}
                    title="Rehacer cambio (Cmd+Shift+Z / Ctrl+Y)"
                  >
                    <span>↪️</span> Rehacer
                  </button>
                </div>

                <button 
                  onClick={() => setIsExportModalOpen(true)} 
                  className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 px-3 py-1.5 rounded text-sm font-bold transition-colors flex items-center gap-1.5"
                >
                  <span>📥</span> Exportar
                </button>
                <button 
                  onClick={() => handleOpenMoveDivisionModal()} 
                  className="bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 px-3 py-1.5 rounded text-sm font-bold transition-colors flex items-center gap-1.5"
                >
                  <span>📦</span> Mover División
                </button>
                <button onClick={() => handleAutoSort(s.id)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-3 py-1.5 rounded text-sm font-bold transition-colors">
                  🔀 Agrupar Categorías
                </button>
                <button onClick={() => handleAddBreak(s.id)} className="bg-warning/20 text-warning hover:bg-warning/30 px-3 py-1.5 rounded text-sm font-bold transition-colors">
                  ☕ Insertar Pausa
                </button>
                <button onClick={() => handleClearSession(s.id)} className="bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 px-3 py-1.5 rounded text-sm font-bold transition-colors flex items-center gap-1.5" title="Eliminar todos los equipos de esta jornada">
                  <span>🗑️</span> Vaciar Jornada
                </button>
                <button onClick={() => handleAddTeamClick(s.id)} className="bg-primary/20 text-primary-light hover:bg-primary/40 px-3 py-1.5 rounded text-sm font-bold transition-colors">
                  + Añadir Equipos
                </button>
              </div>
            </div>
            
            <SessionConfigForm 
              key={`config-${s.id}-${new Date(s.updatedAt).getTime()}`} 
              session={s} 
              warmupZonesCount={warmupZonesCount}
              springfloorZonesCount={springfloorZonesCount}
              registrationZonesCount={registrationZonesCount}
            />
            
            <ScheduleTable 
              key={`table-${s.id}-${new Date(s.updatedAt).getTime()}`} 
              sessionId={s.id} 
              schedules={s.schedules} 
              session={s} 
              registrationZonesCount={registrationZonesCount}
              warmupZonesCount={warmupZonesCount}
              springfloorZonesCount={springfloorZonesCount}
              onOpenMoveDivisionModal={handleOpenMoveDivisionModal}
              onBeforeAction={() => pushHistoryState(s.id)}
            />
          </div>
        );
      })}

      <AddTeamModal 
        isOpen={isAddTeamModalOpen}
        onClose={() => setIsAddTeamModalOpen(false)}
        availableTeams={availableTeams.filter(t => 
          !sessions.find(s => s.schedules.some(sch => sch.teamId === t.id))
        )}
        sessions={sessions}
        currentSessionId={activeSession || ''}
        onAddTeams={handleModalAddTeams}
      />

      {activeSessionObj && (
        <MoveDivisionModal
          isOpen={isMoveDivisionModalOpen}
          onClose={() => setIsMoveDivisionModalOpen(false)}
          sessionId={activeSessionObj.id}
          schedules={activeSessionObj.schedules}
          initialSelectedGroup={selectedGroupForModal}
          onBeforeAction={() => pushHistoryState(activeSessionObj.id)}
        />
      )}

      {activeSessionObj && (
        <ExportScheduleModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          schedules={activeSessionObj.schedules}
          session={activeSessionObj}
          eventName="Campeonato"
          allSessions={sessions}
          registrationZonesCount={registrationZonesCount}
          warmupZonesCount={warmupZonesCount}
          springfloorZonesCount={springfloorZonesCount}
        />
      )}
    </div>
  );
}
