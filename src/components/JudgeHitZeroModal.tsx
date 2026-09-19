"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toggleHitZero } from "@/app/admin/actions";

interface ScheduleItem {
  id: string;
  orderIndex: number;
  status: string;
  isHitZero: boolean;
  hitZeroAwarded: boolean;
  team?: {
    name: string;
    division: string;
    category: string;
    institution: {
      name: string;
    };
  } | null;
}

interface JudgeHitZeroModalProps {
  eventId: string;
  schedules: ScheduleItem[];
}

export default function JudgeHitZeroModal({ schedules }: JudgeHitZeroModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Equipos presentados (compitiendo o finalizados), mostrados en orden inverso (más recientes primero)
  const presentedSchedules = schedules
    .filter(s => ["COMPETING", "FINISHED"].includes(s.status) && s.team)
    .reverse();

  const hitZeroCount = schedules.filter(s => s.isHitZero).length;

  const handleToggle = async (scheduleId: string, currentVal: boolean) => {
    setLoadingId(scheduleId);
    try {
      await toggleHitZero(scheduleId, !currentVal);
    } catch {
      alert("Error al actualizar estado Hit Zero.");
    }
    setLoadingId(null);
  };

  const modalContent = isOpen ? (
    <div 
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in overflow-hidden"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="glass-panel w-full max-w-2xl bg-[#0f172a] border border-purple-500/40 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[85vh] sm:max-h-[90vh] flex flex-col relative z-[10000] shrink-0"
      >
        
        {/* Header del Modal */}
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <div>
              <h3 className="text-xl font-black text-white">Reconocimientos Hit Zero</h3>
              <p className="text-xs text-purple-300">
                Selecciona los equipos con presentación perfecta (Cero Deducciones).
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-colors text-base cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Contenido / Lista de Equipos Presentados */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {presentedSchedules.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm italic">
              Aún no hay equipos que hayan comenzado o finalizado su rutina.
            </div>
          ) : (
            presentedSchedules.map((schedule) => {
              const isHit = schedule.isHitZero;
              const isAwarded = schedule.hitZeroAwarded;
              const isLoading = loadingId === schedule.id;

              return (
                <div
                  key={schedule.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isHit
                      ? "bg-purple-950/60 border-purple-400/60 shadow-lg"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-gray-400">#{schedule.orderIndex}</span>
                      <h4 className="font-bold text-white text-base leading-tight truncate">
                        {schedule.team?.name}
                      </h4>
                      {isHit && (
                        <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                          🎯 Hit Zero
                        </span>
                      )}
                      {isAwarded && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          🎉 Entregado en Vivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      {schedule.team?.institution.name} • {schedule.team?.division} ({schedule.team?.category})
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggle(schedule.id, isHit)}
                    disabled={isLoading}
                    className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shrink-0 ${
                      isHit
                        ? "bg-amber-500 hover:bg-amber-600 text-black border border-amber-400"
                        : "bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/30"
                    }`}
                  >
                    {isLoading 
                      ? "⏳ Guardando..." 
                      : isHit 
                        ? "✅ HIT ZERO OTORGADO (Quitar)" 
                        : "🎯 OTORGAR HIT ZERO"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-between items-center text-xs">
          <span className="text-gray-400">Total Hit Zero otorgados: <strong className="text-amber-400 font-bold">{hitZeroCount}</strong></span>
          <button
            onClick={() => setIsOpen(false)}
            className="btn-primary py-2 px-6 font-bold text-xs"
          >
            Listo
          </button>
        </div>

      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Botón en la cabecera / panel de jueces */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold px-4 py-2 rounded-xl border border-purple-400/40 shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs sm:text-sm shrink-0"
      >
        <span className="text-lg">🎯</span>
        <span>Hit Zero</span>
        {hitZeroCount > 0 && (
          <span className="bg-amber-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full ml-1">
            {hitZeroCount}
          </span>
        )}
      </button>

      {/* Modal Interactivo usando React Portal */}
      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
