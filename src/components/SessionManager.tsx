"use client";

import { useState } from "react";
import { EventSession, Schedule, Team, Institution } from "@prisma/client";
import { createEventSession, updateEventSession } from "@/app/admin/schedule-actions";

import ScheduleTable from "./ScheduleTable";
import AddTeamModal from "./AddTeamModal";
import SessionConfigForm from "./SessionConfigForm";
import { addTeamToSession, addTeamsToSession, addBreakToSession, autoSortSessionSchedules } from "@/app/admin/schedule-actions";

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
  const [modalSessionId, setModalSessionId] = useState<string | null>(null);

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
    await addTeamsToSession(modalSessionId, eventId, teamIds);
  };

  const handleAddBreak = async (sessionId: string) => {
    const title = prompt("Título de la pausa/actividad (ej: Almuerzo, Premiación):");
    if (!title) return;
    const duration = prompt("Duración en minutos (ej: 30):");
    if (!duration || isNaN(Number(duration))) return;

    const showTitle = confirm("¿Deseas mostrar este título al público?\n(Si cancelas, se mostrará como 'Actividad')");

    await addBreakToSession(sessionId, eventId, title, Number(duration), showTitle);
  };

  const handleAutoSort = async (sessionId: string) => {
    const confirmSort = confirm(
      "⚠️ ¿Estás seguro de que deseas reordenar automáticamente? Todos los equipos se agruparán por Categoría y División, y los horarios se recalcularán."
    );
    if (confirmSort) {
      await autoSortSessionSchedules(sessionId);
    }
  };

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
      {sessions.map(s => s.id === activeSession && (
        <div key={s.id} className="glass-panel p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Cronograma: {s.name}</h3>
            <div className="flex gap-2">
              <button onClick={() => handleAutoSort(s.id)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-3 py-1.5 rounded text-sm font-bold transition-colors">
                🔀 Agrupar Categorías
              </button>
              <button onClick={() => handleAddBreak(s.id)} className="bg-warning/20 text-warning hover:bg-warning/30 px-3 py-1.5 rounded text-sm font-bold transition-colors">
                ☕ Insertar Pausa
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
          />
        </div>
      ))}

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
    </div>
  );
}
