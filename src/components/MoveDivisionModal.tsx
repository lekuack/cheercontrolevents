"use client";

import { useState } from "react";
import { Schedule, Team, Institution } from "@prisma/client";
import { moveDivisionInSession } from "@/app/admin/schedule-actions";

type ScheduleWithRelations = Schedule & {
  team?: (Team & { institution: Institution }) | null;
};

interface MoveDivisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  schedules: ScheduleWithRelations[];
  initialSelectedGroup?: string;
  onBeforeAction?: () => void;
}

export default function MoveDivisionModal({
  isOpen,
  onClose,
  sessionId,
  schedules,
  initialSelectedGroup,
  onBeforeAction
}: MoveDivisionModalProps) {
  const [groupField, setGroupField] = useState<"division" | "category_division" | "full">("category_division");
  const [selectedGroup, setSelectedGroup] = useState<string>(initialSelectedGroup || "");
  const [targetPosition, setTargetPosition] = useState<"START" | "END" | "BEFORE_ITEM" | "AFTER_ITEM">("BEFORE_ITEM");
  const [targetScheduleId, setTargetScheduleId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Extraer grupos disponibles según el nivel de agrupación elegido
  const getGroupKey = (s: ScheduleWithRelations) => {
    if (s.type !== "TEAM" || !s.team) return null;
    if (groupField === "division") return s.team.division;
    if (groupField === "category_division") return `${s.team.category || ""} • ${s.team.division}`;
    return `${s.team.category || ""} • ${s.team.division} • ${s.team.level || ""}`;
  };

  const groupCounts: { [key: string]: number } = {};
  schedules.forEach((s) => {
    const key = getGroupKey(s);
    if (key) {
      groupCounts[key] = (groupCounts[key] || 0) + 1;
    }
  });

  const availableGroups = Object.keys(groupCounts).sort();

  // Si selectedGroup no está en la lista actual o está vacío, seleccionar el primero por defecto
  const activeGroup = availableGroups.includes(selectedGroup)
    ? selectedGroup
    : availableGroups[0] || "";

  // Items de destino (excluyendo los equipos pertenecientes al grupo seleccionado)
  const targetAvailableItems = schedules.filter((s) => getGroupKey(s) !== activeGroup);

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup) return;

    setLoading(true);
    try {
      onBeforeAction?.();
      await moveDivisionInSession(
        sessionId,
        groupField,
        activeGroup,
        targetPosition,
        (targetPosition === "BEFORE_ITEM" || targetPosition === "AFTER_ITEM") ? targetScheduleId || targetAvailableItems[0]?.id : undefined
      );
      onClose();
    } catch {
      alert("Ocurrió un error al mover la división.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-lg p-6 space-y-6 border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📦</span>
            <div>
              <h3 className="text-lg font-bold text-white">Mover División Completa</h3>
              <p className="text-xs text-gray-400">Reorganiza bloques enteros de equipos de forma en bloque</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl font-bold px-2"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleMove} className="space-y-5">
          {/* Criterio de Agrupación */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 mb-1.5">
              1. Criterio de Agrupación
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setGroupField("division");
                  setSelectedGroup("");
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                  groupField === "division"
                    ? "bg-primary/20 border-primary text-primary-light"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                Solo División
              </button>

              <button
                type="button"
                onClick={() => {
                  setGroupField("category_division");
                  setSelectedGroup("");
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                  groupField === "category_division"
                    ? "bg-primary/20 border-primary text-primary-light"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                Categoría + División
              </button>

              <button
                type="button"
                onClick={() => {
                  setGroupField("full");
                  setSelectedGroup("");
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                  groupField === "full"
                    ? "bg-primary/20 border-primary text-primary-light"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                + Nivel Exacto
              </button>
            </div>
          </div>

          {/* Selección del Bloque a Mover */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 mb-1.5">
              2. Seleccionar Bloque a Mover
            </label>
            {availableGroups.length === 0 ? (
              <p className="text-xs text-warning bg-warning/10 p-3 rounded-lg border border-warning/20">
                No hay equipos agrupables en esta jornada.
              </p>
            ) : (
              <select
                value={activeGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors"
              >
                {availableGroups.map((grp) => (
                  <option key={grp} value={grp} className="bg-slate-900 text-white">
                    {grp} ({groupCounts[grp]} {groupCounts[grp] === 1 ? "equipo" : "equipos"})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Destino */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 mb-1.5">
              3. Posición de Destino
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setTargetPosition("START")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                  targetPosition === "START"
                    ? "bg-primary/20 border-primary text-primary-light"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                ⏮️ Al Inicio
              </button>
              <button
                type="button"
                onClick={() => setTargetPosition("END")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                  targetPosition === "END"
                    ? "bg-primary/20 border-primary text-primary-light"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                ⏭️ Al Final
              </button>
              <button
                type="button"
                onClick={() => setTargetPosition("BEFORE_ITEM")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                  targetPosition === "BEFORE_ITEM"
                    ? "bg-primary/20 border-primary text-primary-light"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                ⬆️ Antes de...
              </button>
              <button
                type="button"
                onClick={() => setTargetPosition("AFTER_ITEM")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                  targetPosition === "AFTER_ITEM"
                    ? "bg-primary/20 border-primary text-primary-light"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                ⬇️ Después de...
              </button>
            </div>

            {(targetPosition === "BEFORE_ITEM" || targetPosition === "AFTER_ITEM") && (
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">
                  {targetPosition === "BEFORE_ITEM" ? "Insertar antes de:" : "Insertar después de:"}
                </label>
                <select
                  value={targetScheduleId || targetAvailableItems[0]?.id || ""}
                  onChange={(e) => setTargetScheduleId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-primary transition-colors"
                >
                  {targetAvailableItems.map((item, idx) => (
                    <option key={item.id} value={item.id} className="bg-slate-900 text-white">
                      #{idx + 1} - {item.type === "BREAK" ? `☕ ${item.breakTitle}` : `${item.team?.name} (${item.team?.category} • ${item.team?.division})`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 py-2.5 rounded-xl font-bold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || availableGroups.length === 0}
              className="w-2/3 btn-primary py-2.5 rounded-xl font-bold text-sm"
            >
              {loading ? "Reordenando bloque..." : `📦 Mover Bloque (${groupCounts[activeGroup] || 0} Equipos)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
