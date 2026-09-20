"use client";

import { useState } from "react";
import { loginDemoPin } from "@/app/admin/actions";

interface DemoStationSwitcherProps {
  eventId: string;
  demoPin: string;
  activeRole?: string;
  activeStation?: string;
}

export default function DemoStationSwitcher({
  eventId,
  demoPin,
  activeRole,
  activeStation
}: DemoStationSwitcherProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const stations = [
    { id: "reg", role: "STAFF", station: "REGISTRATION", label: "📋 Registro" },
    { id: "warm", role: "STAFF", station: "WARMUP_1", label: "🔥 Calentamiento" },
    { id: "spring", role: "STAFF", station: "SPRINGFLOOR", label: "🤸 Springfloor" },
    { id: "wait", role: "STAFF", station: "WAITING", label: "🚪 Boca Escenario" },
    { id: "judge", role: "JUDGE", label: "⚖️ Jueces" },
    { id: "announcer", role: "ANNOUNCER", label: "🎙️ Animador" },
    { id: "supervisor", role: "SUPERVISOR", isSupervisor: true, label: "👑 Supervisor" },
    { id: "screen", role: "SCREEN", label: "📺 Pantalla TV" },
    { id: "web", role: "PUBLIC_WEB", label: "🔴 En Vivo Web" }
  ];

  const handleSwitch = async (st: typeof stations[0]) => {
    setLoading(st.id);
    try {
      const res = await loginDemoPin(demoPin, st.role, st.station, st.isSupervisor);
      if (res.targetUrl) {
        window.location.href = res.targetUrl;
      }
    } catch {
      alert("Error al cambiar de puesto de capacitación.");
    }
    setLoading(null);
  };

  if (collapsed) {
    return (
      <div className="fixed top-2 right-2 z-[100]">
        <button
          onClick={() => setCollapsed(false)}
          className="bg-purple-900/80 hover:bg-purple-800 text-purple-200 hover:text-white px-3 py-1 rounded-full text-xs font-bold border border-purple-500/40 backdrop-blur-md shadow-lg transition-all"
        >
          🧪 Mostrar Selector de Puesto
        </button>
      </div>
    );
  }

  return (
    <div className="bg-purple-950/95 border-b border-purple-500/30 backdrop-blur-md px-4 py-2 sticky top-0 z-[100] flex items-center justify-between gap-3 text-xs overflow-x-auto shadow-xl">
      <div className="flex items-center gap-2 shrink-0">
        <span className="bg-purple-500 text-white font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wider animate-pulse">
          🧪 Capacitación
        </span>
        <span className="text-purple-200 font-semibold hidden sm:inline">Cambiar de Puesto:</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto py-0.5">
        {stations.map(st => {
          const isActive = (st.station && activeStation?.includes(st.station)) || (st.role === activeRole && !st.station);
          return (
            <button
              key={st.id}
              onClick={() => handleSwitch(st)}
              disabled={loading !== null}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                isActive
                  ? "bg-purple-500 text-white shadow-lg scale-105 border border-purple-300"
                  : "bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white border border-purple-500/20"
              }`}
            >
              {loading === st.id ? "⏳..." : st.label}
            </button>
          );
        })}
        <button
          onClick={() => setCollapsed(true)}
          className="ml-2 px-2 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/20 text-purple-300 hover:text-white border border-purple-500/30 transition-all cursor-pointer whitespace-nowrap"
          title="Ocultar barra de puesto"
        >
          ✕ Ocultar
        </button>
      </div>
    </div>
  );
}
