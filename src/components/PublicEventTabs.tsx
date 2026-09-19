"use client";

import { useState } from "react";
import LineupPoster from "@/components/LineupPoster";
import PublicScheduleTable from "@/components/PublicScheduleTable";
import TvLiveDisplay from "@/components/TvLiveDisplay";
import WebInteractiveLiveDisplay from "@/components/WebInteractiveLiveDisplay";
import { Team, Institution, EventSession, Schedule, Event } from "@prisma/client";

type TeamWithInstitution = Team & { institution: Institution };

type SessionWithSchedules = EventSession & {
  schedules: (Schedule & {
    team?: (Team & { institution: Institution }) | null;
  })[];
};

interface Props {
  event: Event & {
    teams: { team: TeamWithInstitution }[];
    sessions: SessionWithSchedules[];
  };
  isToday: boolean;
}

const TABS = [
  { id: "principal", label: "🏆 Principal" },
  { id: "horario",   label: "📋 Horario" },
  { id: "envivo",    label: "🔴 En Vivo" },
];

export default function PublicEventTabs({ event, isToday }: Props) {
  const defaultTab = isToday ? "envivo" : "principal";
  const [activeTab, setActiveTab] = useState(defaultTab);

  const teams = event.teams.map(et => et.team);
  const totalTeams = teams.length;
  const sessions = event.sessions;

  const allSchedules = sessions.flatMap(s => s.schedules);

  // Primer horario de inicio de competencia en toda la jornada
  const firstCompetitionStart = sessions
    .flatMap(s => [s.competitionStartTime])
    .filter(Boolean)
    .sort()[0];

  return (
    <div className="space-y-0">
      {/* Barra de pestañas */}
      <div className="flex items-center gap-1 bg-white/3 border border-white/5 rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeTab === tab.id
                ? tab.id === "envivo"
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-white/10 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab.label}
            {tab.id === "envivo" && isToday && (
              <span className="ml-1.5 w-1.5 h-1.5 bg-red-400 rounded-full inline-block animate-pulse align-middle" />
            )}
          </button>
        ))}
      </div>

      {/* ── PESTAÑA: PRINCIPAL ── */}
      {activeTab === "principal" && (
        <div className="pt-4 space-y-8">
          {/* Lineup Poster */}
          {teams.length > 0 && (
            <LineupPoster 
              teams={teams} 
              eventName={event.name} 
              posterBgColorFrom={event.posterBgColorFrom || undefined}
              posterBgColorVia={event.posterBgColorVia || undefined}
              posterBgColorTo={event.posterBgColorTo || undefined}
              posterTextColor1={event.posterTextColor1 || undefined}
              posterTextColor2={event.posterTextColor2 || undefined}
              posterTextColor3={event.posterTextColor3 || undefined}
            />
          )}

          {/* Detalles del evento */}
          <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Detalles del Evento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-gray-600">Fecha</p>
                <p className="text-white font-semibold text-sm" suppressHydrationWarning>
                  📅 {new Date(event.date).toLocaleDateString("es-CL", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric"
                  })}
                </p>
              </div>

              {firstCompetitionStart && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-gray-600">Inicio de Competencia</p>
                  <p className="text-white font-semibold text-sm" suppressHydrationWarning>
                    ⏰ {new Date(firstCompetitionStart).toLocaleTimeString("es-CL", {
                      hour: "2-digit", minute: "2-digit"
                    })} hrs
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-gray-600">Jornadas</p>
                <p className="text-white font-semibold text-sm">
                  🗓️ {sessions.length} jornada{sessions.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-gray-600">Equipos Inscritos</p>
                <p className="text-white font-semibold text-sm">
                  🏅 {totalTeams} equipo{totalTeams !== 1 ? "s" : ""}
                </p>
              </div>

              {sessions.length > 0 && (
                <div className="sm:col-span-2 space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-gray-600">Programa de Jornadas</p>
                  <div className="space-y-1.5">
                    {sessions.map((s, i) => {
                      const teams = s.schedules.filter(sc => sc.type === "TEAM").length;
                      return (
                        <div key={s.id} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-gray-600">#{i + 1}</span>
                            <span className="text-sm font-semibold text-white">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-gray-500">
                            <span suppressHydrationWarning>
                              {new Date(s.date).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                            </span>
                            {s.competitionStartTime && (
                              <span className="font-mono text-primary" suppressHydrationWarning>
                                {new Date(s.competitionStartTime).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                            <span>{teams} eq.</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── PESTAÑA: HORARIO ── */}
      {activeTab === "horario" && (
        <div className="pt-4 space-y-8">
          {sessions.length === 0 ? (
            <div className="text-center py-16 text-gray-600 text-sm">
              El cronograma aún no está disponible.
            </div>
          ) : (() => {
            let cumulativeCount = 0;
            return sessions.map((session) => {
              const schedules = session.schedules.filter(
                s => s.type === "TEAM" || s.type === "BREAK"
              );
              const currentStartNumber = cumulativeCount + 1;
              cumulativeCount += schedules.filter(s => s.type === "TEAM").length;
              
              return (
                <div key={session.id} className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-center justify-between py-4 border-b border-white/10 mt-6 mb-4 gap-2">
                    {/* Elemento vacío para centrar con justify-between en desktop si quisieramos, pero en flex con flex-1 se centra bien */}
                    <div className="hidden sm:block flex-1"></div>
                    
                    <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-widest text-center flex-1">
                      {session.name}
                    </h3>
                    
                    <div className="text-[10px] sm:text-xs text-gray-400 font-mono text-right flex-1 flex justify-end" suppressHydrationWarning>
                      {new Date(session.date).toLocaleDateString("es-CL", {
                        day: "2-digit", month: "long"
                      })}
                      {session.competitionStartTime &&
                        ` · ${new Date(session.competitionStartTime).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`
                      }
                    </div>
                  </div>
                  <PublicScheduleTable
                    schedules={schedules as any}
                    registrationZonesCount={event.registrationZonesCount}
                    warmupZonesCount={event.warmupZonesCount}
                    springfloorZonesCount={event.springfloorZonesCount}
                    startingNumber={currentStartNumber}
                    tableHeaderBgColor={event.tableHeaderBgColor || undefined}
                    tableHeaderTextColor={event.tableHeaderTextColor || undefined}
                    tableRowBgColor={event.tableRowBgColor || undefined}
                    tableRowHoverBgColor={event.tableRowHoverBgColor || undefined}
                    tableRowTextColor={event.tableRowTextColor || undefined}
                  />
                </div>
              );
            })
          })()}
        </div>
      )}

      {/* ── PESTAÑA: EN VIVO INTERACTIVO WEB ── */}
      {activeTab === "envivo" && (
        <div className="pt-4">
          <WebInteractiveLiveDisplay
            eventId={event.id}
            schedules={allSchedules as any}
          />
        </div>
      )}
    </div>
  );
}
