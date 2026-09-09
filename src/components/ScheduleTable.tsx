"use client";

import { useState, useEffect } from "react";
import { Schedule, Team, Institution, EventSession } from "@prisma/client";
import { reorderSchedule, toggleExhibition, removeScheduleItem } from "@/app/admin/schedule-actions";

type ScheduleWithRelations = Schedule & {
  team?: (Team & { institution: Institution }) | null;
};

export default function ScheduleTable({ 
  sessionId, 
  schedules,
  session,
  registrationZonesCount = 1,
  warmupZonesCount = 1,
  springfloorZonesCount = 1
}: { 
  sessionId: string, 
  schedules: ScheduleWithRelations[],
  session?: EventSession,
  registrationZonesCount?: number,
  warmupZonesCount?: number,
  springfloorZonesCount?: number
}) {
  const [items, setItems] = useState(schedules);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Sincronizar estado cuando los props cambian por revalidatePath del servidor
  useEffect(() => {
    setItems(schedules);
  }, [schedules]);

  const formatTime = (d: Date | null) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIdx];
    newItems.splice(draggedIdx, 1);
    newItems.splice(index, 0, draggedItem);
    
    setDraggedIdx(index);
    setItems(newItems);
  };

  const onDrop = async () => {
    setDraggedIdx(null);
    const newOrderIds = items.map(i => i.id);
    await reorderSchedule(sessionId, newOrderIds);
  };

  const getConflictReason = (item: ScheduleWithRelations) => {
    if (item.type === "BREAK" || !session) return null;

    const sfDuration = session.springfloorDuration || 10;
    const w1Duration = session.warmup1Duration || 10;
    const regDuration = session.registrationDuration || 10;

    // 1. Conflicto Interno del propio equipo: Competencia empieza antes de terminar Springfloor
    if (item.scheduledSpringfloor && item.scheduledPerformance) {
      const sfEnd = new Date(item.scheduledSpringfloor).getTime() + sfDuration * 60000;
      const perfStart = new Date(item.scheduledPerformance).getTime();
      if (perfStart < sfEnd) {
        const diffMins = Math.ceil((sfEnd - perfStart) / 60000);
        return `⚠️ Tope interno: Competencia empieza ${diffMins} min antes de finalizar su Springfloor`;
      }
    }

    // 2. Conflicto de colisión en la MISMA ZONA con otros equipos
    const sameZoneTeams = items.filter(other => 
      other.id !== item.id && 
      other.type === "TEAM"
    );

    // Revisar choque en Warmup1 si están en la misma zona de calentamiento
    if (item.scheduledWarmup1) {
      const w1Start = new Date(item.scheduledWarmup1).getTime();
      const w1End = w1Start + w1Duration * 60000;

      const colliding = sameZoneTeams.find(other => {
        if (other.warmupZone !== item.warmupZone || !other.scheduledWarmup1) return false;
        const otherStart = new Date(other.scheduledWarmup1).getTime();
        return otherStart >= w1Start && otherStart < w1End;
      });

      if (colliding) {
        return `⚠️ Choque en Calentamiento Zona ${item.warmupZone} con ${colliding.team?.name}`;
      }
    }

    // Revisar choque en Springfloor si están en la misma zona de springfloor
    if (item.scheduledSpringfloor) {
      const sfStart = new Date(item.scheduledSpringfloor).getTime();
      const sfEnd = sfStart + sfDuration * 60000;

      const colliding = sameZoneTeams.find(other => {
        if (other.springfloorZone !== item.springfloorZone || !other.scheduledSpringfloor) return false;
        const otherStart = new Date(other.scheduledSpringfloor).getTime();
        return otherStart >= sfStart && otherStart < sfEnd;
      });

      if (colliding) {
        return `⚠️ Choque en Springfloor Zona ${item.springfloorZone} con ${colliding.team?.name}`;
      }
    }

    return null;
  };

  if (items.length === 0) {
    return <div className="text-center p-8 text-gray-500 border border-dashed border-gray-700 rounded-lg">No hay equipos o actividades asignadas a esta jornada.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-gray-400">
            <th className="p-3 w-10">#</th>
            <th className="p-3">Participante / Actividad</th>
            <th className="p-3">Categoría / División</th>
            <th className="p-3">Registro</th>
            <th className="p-3">Warmup</th>
            <th className="p-3">Springfloor</th>
            <th className="p-3 font-bold text-white">Competencia</th>
            <th className="p-3 w-20">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const isBreak = item.type === "BREAK";
            const conflictReason = getConflictReason(item);

            return (
              <tr 
                key={item.id} 
                draggable
                onDragStart={(e) => onDragStart(e, index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDragEnd={onDrop}
                className={`border-b border-white/5 cursor-move transition-colors ${
                  isBreak ? "bg-white/10" : item.isExhibition ? "bg-purple-900/20" : conflictReason ? "bg-red-950/30" : "hover:bg-white/5"
                } ${draggedIdx === index ? "opacity-50" : "opacity-100"}`}
              >
                <td className="p-3 font-bold text-gray-500">{index + 1}</td>
                <td className="p-3">
                  {isBreak ? (
                    <div className="font-bold text-warning flex items-center gap-2">
                      ☕ {item.breakTitle} ({item.breakDuration} min)
                      {item.showBreakTitle === false && <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded ml-2 font-normal">Título Oculto al Público</span>}
                    </div>
                  ) : (
                    <div>
                      <div className="font-bold flex items-center gap-1.5 flex-wrap">
                        <span>{item.team?.name}</span>
                        {item.isExhibition && (
                          <span className="text-[10px] text-purple-300 bg-purple-500/30 border border-purple-500/40 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                            (Exhibición)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{item.team?.institution?.name} • {item.team?.institution?.city || 'Sin ciudad'}</div>
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {!isBreak && (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white text-xs font-semibold">
                          {item.team?.category}
                        </span>
                        <span className="bg-white/10 text-gray-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                          {item.team?.division}
                        </span>
                      </div>
                      <span className="text-gray-500 text-[9px] uppercase tracking-wider font-semibold">
                        {item.team?.level}
                      </span>
                    </div>
                  )}
                </td>
                <td className="p-3 text-gray-400">
                  {!isBreak && (
                    <div className="flex items-center gap-1.5">
                      <span>{formatTime(item.scheduledRegistration)}</span>
                      {registrationZonesCount > 1 && item.registrationZone && (
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] px-1 py-0.2 rounded font-bold">
                          {item.registrationZone}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 text-gray-400">
                  {!isBreak && (
                    <div className="flex items-center gap-1.5">
                      <span>{formatTime(item.scheduledWarmup1)}</span>
                      {warmupZonesCount > 1 && item.warmupZone && (
                        <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] px-1 py-0.2 rounded font-bold">
                          {item.warmupZone}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 text-gray-400">
                  {!isBreak && (
                    <div className="flex items-center gap-1.5">
                      <span>{formatTime(item.scheduledSpringfloor)}</span>
                      {springfloorZonesCount > 1 && item.springfloorZone && (
                        <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[9px] px-1 py-0.2 rounded font-bold">
                          {item.springfloorZone}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className={`p-3 font-bold ${conflictReason ? "bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg" : "text-white"}`}>
                  <div className="flex flex-col">
                    <span>{formatTime(item.scheduledPerformance)}</span>
                    {conflictReason && (
                      <span className="text-[10px] text-red-300 font-semibold mt-0.5" title={conflictReason}>
                        {conflictReason}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 flex gap-2">
                  {!isBreak && (
                    <button 
                      onClick={() => toggleExhibition(item.id, !item.isExhibition)}
                      className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded"
                      title="Alternar Exhibición"
                    >
                      🎪
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (confirm("¿Remover del cronograma?")) removeScheduleItem(item.id);
                    }}
                    className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded"
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
