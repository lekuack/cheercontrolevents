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
  springfloorZonesCount = 1,
  onOpenMoveDivisionModal,
  onBeforeAction
}: { 
  sessionId: string, 
  schedules: ScheduleWithRelations[],
  session?: EventSession,
  registrationZonesCount?: number,
  warmupZonesCount?: number,
  springfloorZonesCount?: number,
  onOpenMoveDivisionModal?: (groupName?: string) => void,
  onBeforeAction?: () => void
}) {
  const [items, setItems] = useState(schedules);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [hoveredScheduleId, setHoveredScheduleId] = useState<string | null>(null);

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
    onBeforeAction?.();
    const newOrderIds = items.map(i => i.id);
    await reorderSchedule(sessionId, newOrderIds);
  };

  const getConflictInfo = (item: ScheduleWithRelations) => {
    if (item.type === "BREAK" || !session) return { reason: null, relatedIds: [] as string[] };

    const sfDuration = session.springfloorDuration || 10;
    const w1Duration = session.warmup1Duration || 10;
    const regDuration = session.registrationDuration || 10;
    const relatedIds: string[] = [];
    let reason: string | null = null;

    // 1. Conflicto Interno del propio equipo: Competencia empieza antes de terminar Springfloor
    if (item.scheduledSpringfloor && item.scheduledPerformance) {
      const sfEnd = new Date(item.scheduledSpringfloor).getTime() + sfDuration * 60000;
      const perfStart = new Date(item.scheduledPerformance).getTime();
      if (perfStart < sfEnd) {
        const diffMins = Math.ceil((sfEnd - perfStart) / 60000);
        reason = `⚠️ Tope interno: Competencia empieza ${diffMins} min antes de finalizar su Springfloor`;
      }
    }

    // 2. Conflicto de colisión en la MISMA ZONA con otros equipos
    const sameZoneTeams = items.filter(other => 
      other.id !== item.id && 
      other.type === "TEAM"
    );

    // Revisar choque en Registro si están en la misma zona
    if (item.scheduledRegistration) {
      const regStart = new Date(item.scheduledRegistration).getTime();
      const regEnd = regStart + regDuration * 60000;

      const colliding = sameZoneTeams.filter(other => {
        if ((other.registrationZone || "A") !== (item.registrationZone || "A") || !other.scheduledRegistration) return false;
        const otherStart = new Date(other.scheduledRegistration).getTime();
        const otherEnd = otherStart + regDuration * 60000;
        return regStart < otherEnd && otherStart < regEnd;
      });

      if (colliding.length > 0) {
        colliding.forEach(c => {
          if (!relatedIds.includes(c.id)) relatedIds.push(c.id);
        });
        if (!reason) {
          reason = `⚠️ Choque en Registro Zona ${item.registrationZone || "A"} con ${colliding.map(c => c.team?.name).join(", ")}`;
        }
      }
    }

    // Revisar choque en Warmup1 si están en la misma zona de calentamiento
    if (item.scheduledWarmup1) {
      const w1Start = new Date(item.scheduledWarmup1).getTime();
      const w1End = w1Start + w1Duration * 60000;

      const colliding = sameZoneTeams.filter(other => {
        if ((other.warmupZone || "A") !== (item.warmupZone || "A") || !other.scheduledWarmup1) return false;
        const otherStart = new Date(other.scheduledWarmup1).getTime();
        const otherEnd = otherStart + w1Duration * 60000;
        return w1Start < otherEnd && otherStart < w1End;
      });

      if (colliding.length > 0) {
        colliding.forEach(c => {
          if (!relatedIds.includes(c.id)) relatedIds.push(c.id);
        });
        if (!reason) {
          reason = `⚠️ Choque en Calentamiento Zona ${item.warmupZone || "A"} con ${colliding.map(c => c.team?.name).join(", ")}`;
        }
      }
    }

    // Revisar choque en Springfloor si están en la misma zona de springfloor
    if (item.scheduledSpringfloor) {
      const sfStart = new Date(item.scheduledSpringfloor).getTime();
      const sfEnd = sfStart + sfDuration * 60000;

      const colliding = sameZoneTeams.filter(other => {
        if ((other.springfloorZone || "A") !== (item.springfloorZone || "A") || !other.scheduledSpringfloor) return false;
        const otherStart = new Date(other.scheduledSpringfloor).getTime();
        const otherEnd = otherStart + sfDuration * 60000;
        return sfStart < otherEnd && otherStart < sfEnd;
      });

      if (colliding.length > 0) {
        colliding.forEach(c => {
          if (!relatedIds.includes(c.id)) relatedIds.push(c.id);
        });
        if (!reason) {
          reason = `⚠️ Choque en Springfloor Zona ${item.springfloorZone || "A"} con ${colliding.map(c => c.team?.name).join(", ")}`;
        }
      }
    }

    return { reason, relatedIds };
  };

  const getClubWarningInfo = (item: ScheduleWithRelations) => {
    if (item.type === "BREAK" || !session || !item.team?.institutionId) return { reason: null, relatedIds: [] as string[] };

    const regDuration = session.registrationDuration || 10;
    const w1Duration = session.warmup1Duration || 10;
    const sfDuration = session.springfloorDuration || 10;
    const perfDuration = session.competitionDuration || 4;

    const clubTeams = items.filter(
      (other) =>
        other.id !== item.id &&
        other.type === "TEAM" &&
        other.team?.institutionId === item.team?.institutionId
    );

    if (clubTeams.length === 0) return { reason: null, relatedIds: [] as string[] };

    const warnings: string[] = [];
    const relatedIds: string[] = [];

    const overlaps = (startA?: Date | null, durationA: number = 10, startB?: Date | null, durationB: number = 10) => {
      if (!startA || !startB) return false;
      const tStartA = new Date(startA).getTime();
      const tEndA = tStartA + durationA * 60000;
      const tStartB = new Date(startB).getTime();
      const tEndB = tStartB + durationB * 60000;
      return tStartA < tEndB && tStartB < tEndA;
    };

    for (const other of clubTeams) {
      const otherTeamName = other.team?.name || "Otro equipo del club";
      let hasOverlap = false;

      // 1. Tope en Registro
      if (overlaps(item.scheduledRegistration, regDuration, other.scheduledRegistration, regDuration)) {
        warnings.push(`💡 Tope Club: ${otherTeamName} también en Registro`);
        hasOverlap = true;
      }
      // 2. Tope en Calentamiento (Warmup 1)
      else if (overlaps(item.scheduledWarmup1, w1Duration, other.scheduledWarmup1, w1Duration)) {
        warnings.push(`💡 Tope Club: ${otherTeamName} también en Calentamiento`);
        hasOverlap = true;
      }
      // 3. Tope en Springfloor
      else if (overlaps(item.scheduledSpringfloor, sfDuration, other.scheduledSpringfloor, sfDuration)) {
        warnings.push(`💡 Tope Club: ${otherTeamName} también en Springfloor`);
        hasOverlap = true;
      }
      // 4. Tope en Competencia (Performance)
      else if (overlaps(item.scheduledPerformance, perfDuration, other.scheduledPerformance, perfDuration)) {
        warnings.push(`💡 Tope Club: ${otherTeamName} compite al mismo tiempo`);
        hasOverlap = true;
      }
      // 5. Tope Registro vs otras etapas del otro equipo
      else if (overlaps(item.scheduledRegistration, regDuration, other.scheduledWarmup1, w1Duration)) {
        warnings.push(`💡 Tope Club: ${otherTeamName} en Calentamiento durante este Registro`);
        hasOverlap = true;
      }
      else if (overlaps(item.scheduledRegistration, regDuration, other.scheduledSpringfloor, sfDuration)) {
        warnings.push(`💡 Tope Club: ${otherTeamName} en Springfloor durante este Registro`);
        hasOverlap = true;
      }
      else if (overlaps(item.scheduledRegistration, regDuration, other.scheduledPerformance, perfDuration)) {
        warnings.push(`💡 Tope Club: ${otherTeamName} compite durante este Registro`);
        hasOverlap = true;
      }
      // 6. Otras etapas de este equipo vs Registro del otro equipo
      else if (overlaps(item.scheduledWarmup1, w1Duration, other.scheduledRegistration, regDuration)) {
        warnings.push(`💡 Tope Club: ${otherTeamName} en Registro durante este Calentamiento`);
        hasOverlap = true;
      }
      else if (overlaps(item.scheduledSpringfloor, sfDuration, other.scheduledRegistration, regDuration)) {
        warnings.push(`💡 Tope Club: ${otherTeamName} en Registro durante este Springfloor`);
        hasOverlap = true;
      }
      else if (overlaps(item.scheduledPerformance, perfDuration, other.scheduledRegistration, regDuration)) {
        warnings.push(`💡 Tope Club: ${otherTeamName} en Registro durante esta Competencia`);
        hasOverlap = true;
      }
      // 7. Tope Calentamiento / Springfloor vs Competencia
      else if (overlaps(item.scheduledWarmup1, w1Duration, other.scheduledPerformance, perfDuration)) {
        warnings.push(`💡 Tope Club: ${otherTeamName} compite durante este Calentamiento`);
        hasOverlap = true;
      }
      else if (overlaps(item.scheduledSpringfloor, sfDuration, other.scheduledPerformance, perfDuration)) {
        warnings.push(`💡 Tope Club: ${otherTeamName} compite durante este Springfloor`);
        hasOverlap = true;
      }

      if (hasOverlap && !relatedIds.includes(other.id)) {
        relatedIds.push(other.id);
      }
    }

    return {
      reason: warnings.length > 0 ? warnings.join(" • ") : null,
      relatedIds
    };
  };

  if (items.length === 0) {
    return <div className="text-center p-8 text-gray-500 border border-dashed border-gray-700 rounded-lg">No hay equipos o actividades asignadas a esta jornada.</div>;
  }

  const hoveredItem = items.find((i) => i.id === hoveredScheduleId);
  const hoveredConflictIds = hoveredItem ? getConflictInfo(hoveredItem).relatedIds : [];
  const hoveredWarningIds = hoveredItem ? getClubWarningInfo(hoveredItem).relatedIds : [];

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
            const conflictInfo = getConflictInfo(item);
            const clubWarningInfo = getClubWarningInfo(item);

            const isHovered = hoveredScheduleId === item.id;
            const isHoveredConflictGroup = hoveredScheduleId !== null && hoveredConflictIds.length > 0 && (isHovered || hoveredConflictIds.includes(item.id));
            const isHoveredWarningGroup = hoveredScheduleId !== null && hoveredWarningIds.length > 0 && (isHovered || hoveredWarningIds.includes(item.id));

            return (
              <tr 
                key={item.id} 
                draggable
                onDragStart={(e) => onDragStart(e, index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDragEnd={onDrop}
                onMouseEnter={() => setHoveredScheduleId(item.id)}
                onMouseLeave={() => setHoveredScheduleId(null)}
                className={`border-b border-white/5 cursor-move transition-all duration-200 ${
                  isBreak 
                    ? "bg-white/10" 
                    : item.isExhibition 
                    ? "bg-purple-900/20" 
                    : isHoveredConflictGroup
                    ? "bg-red-900/40 ring-2 ring-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)] scale-[1.01] z-30 text-white font-bold"
                    : isHoveredWarningGroup
                    ? "bg-amber-900/40 ring-2 ring-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] scale-[1.01] z-30 text-white font-bold"
                    : conflictInfo.reason 
                    ? "bg-red-950/30" 
                    : clubWarningInfo.reason 
                    ? "bg-amber-950/10 hover:bg-amber-950/20 border-l-2 border-l-amber-500/50" 
                    : "hover:bg-white/5"
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
                      {clubWarningInfo.reason && (
                        <div className="text-[10px] text-amber-300/90 font-medium flex items-center gap-1 mt-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded w-fit" title={clubWarningInfo.reason}>
                          <span className="truncate max-w-[320px]">{clubWarningInfo.reason}</span>
                        </div>
                      )}
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
                <td className={`p-3 font-bold ${conflictInfo.reason ? "bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg" : clubWarningInfo.reason ? "text-amber-300" : "text-white"}`}>
                  <div className="flex flex-col">
                    <span>{formatTime(item.scheduledPerformance)}</span>
                    {conflictInfo.reason && (
                      <span className="text-[10px] text-red-300 font-semibold mt-0.5" title={conflictInfo.reason}>
                        {conflictInfo.reason}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 flex gap-1.5 items-center">
                  <button 
                    onClick={async () => {
                      const currentPos = index + 1;
                      const input = prompt(
                        `Mover "${isBreak ? item.breakTitle || "Pausa" : item.team?.name}" de la posición ${currentPos} a la posición:`
                      );
                      if (!input) return;
                      const targetPos = parseInt(input.trim(), 10);
                      if (isNaN(targetPos) || targetPos < 1 || targetPos > items.length || targetPos === currentPos) {
                        if (!isNaN(targetPos) && (targetPos < 1 || targetPos > items.length)) {
                          alert(`Número inválido. Debe estar entre 1 y ${items.length}.`);
                        }
                        return;
                      }

                      onBeforeAction?.();
                      const targetIndex = targetPos - 1;
                      const newItems = [...items];
                      const [movedItem] = newItems.splice(index, 1);
                      newItems.splice(targetIndex, 0, movedItem);
                      setItems(newItems);
                      
                      const newOrderIds = newItems.map(i => i.id);
                      await reorderSchedule(sessionId, newOrderIds);
                    }}
                    className="text-xs px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded font-mono font-bold"
                    title="Mover a una posición específica (N° de fila)"
                  >
                    🔢 #{index + 1}
                  </button>
                  {!isBreak && onOpenMoveDivisionModal && (
                    <button 
                      onClick={() => onOpenMoveDivisionModal(item.team ? `${item.team.category || ""} • ${item.team.division}` : undefined)}
                      className="text-xs px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded"
                      title="Mover esta división completa"
                    >
                      📦
                    </button>
                  )}
                  {!isBreak && (
                    <button 
                      onClick={() => {
                        onBeforeAction?.();
                        toggleExhibition(item.id, !item.isExhibition);
                      }}
                      className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded"
                      title="Alternar Exhibición"
                    >
                      🎪
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      if (confirm("¿Remover del cronograma?")) {
                        onBeforeAction?.();
                        removeScheduleItem(item.id);
                      }
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
