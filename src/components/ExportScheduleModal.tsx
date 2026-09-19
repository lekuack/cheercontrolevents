"use client";

import { useState } from "react";
import { Schedule, Team, Institution, EventSession } from "@prisma/client";
import { exportToExcel, exportToPdf } from "@/lib/exportSchedule";

type ScheduleWithRelations = Schedule & {
  team?: (Team & { institution: Institution }) | null;
};

interface ExportScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: ScheduleWithRelations[];
  session: EventSession;
  eventName?: string;
  allSessions?: EventSession[];
  registrationZonesCount?: number;
  warmupZonesCount?: number;
  springfloorZonesCount?: number;
}

export default function ExportScheduleModal({
  isOpen,
  onClose,
  schedules,
  session,
  eventName = "Cronograma",
  allSessions = [],
  registrationZonesCount = 1,
  warmupZonesCount = 1,
  springfloorZonesCount = 1,
}: ExportScheduleModalProps) {
  const [format, setFormat] = useState<"excel" | "pdf">("excel");
  const [includeWarnings, setIncludeWarnings] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    setLoading(true);
    try {
      const options = {
        format,
        includeWarnings,
        eventName,
        sessionName: session.name,
        registrationZonesCount,
        warmupZonesCount,
        springfloorZonesCount,
      };

      if (format === "excel") {
        exportToExcel(schedules, options, session);
      } else {
        exportToPdf(schedules, options, session);
      }
      onClose();
    } catch {
      alert("Ocurrió un error al generar la exportación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-md p-6 space-y-6 border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📥</span>
            <div>
              <h3 className="text-lg font-bold text-white">Exportar Cronograma</h3>
              <p className="text-xs text-gray-400">Jornada: {session.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl font-bold px-2"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          {/* Formato de Exportación */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 mb-2">
              1. Formato de Archivo
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat("excel")}
                className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                  format === "excel"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                <span className="text-lg">📊</span> Excel (.xlsx)
              </button>

              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                  format === "pdf"
                    ? "bg-red-500/20 border-red-500 text-red-300 shadow-lg"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                <span className="text-lg">📄</span> Documento PDF
              </button>
            </div>
          </div>

          {/* Opción de Incluir Advertencias / Topes */}
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 mb-2">
              2. Incluir Advertencias y Topes
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIncludeWarnings(true)}
                className={`py-3 px-3 rounded-xl text-xs font-bold transition-all border text-left flex flex-col gap-1 ${
                  includeWarnings
                    ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold">
                  <span>⚠️</span> Con Topes
                </span>
                <span className="text-[10px] text-gray-400 font-normal">
                  Agrega columna de observaciones y alertas
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIncludeWarnings(false)}
                className={`py-3 px-3 rounded-xl text-xs font-bold transition-all border text-left flex flex-col gap-1 ${
                  !includeWarnings
                    ? "bg-blue-500/20 border-blue-500 text-blue-300 shadow-lg"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold">
                  <span>✨</span> Sin Topes (Limpio)
                </span>
                <span className="text-[10px] text-gray-400 font-normal">
                  Cronograma limpio solo con horarios
                </span>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 py-3 rounded-xl font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              className="w-2/3 btn-primary py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
            >
              <span>📥</span> {loading ? "Generando..." : `Exportar a ${format.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
