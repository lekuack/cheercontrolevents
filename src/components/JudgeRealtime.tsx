"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { setJudgesReadyStatus } from "@/app/admin/actions";

interface JudgeRealtimeProps {
  eventId: string;
  currentTeamName: string | null;
  nextTeamName: string | null;
  initialReady: boolean;
}

export default function JudgeRealtime({ eventId, currentTeamName, nextTeamName, initialReady }: JudgeRealtimeProps) {
  const router = useRouter();
  const [isReadySent, setIsReadySent] = useState(initialReady);

  useEffect(() => {
    setIsReadySent(initialReady);
  }, [initialReady]);

  useEffect(() => {
    const socket = io();

    socket.emit("join-event", eventId);

    // Cuando cambie el estado en el backend, refrescamos el router
    socket.on("status-changed", () => {
      console.log("[WS] Status changed, updating judge screen...");
      router.refresh();
    });

    return () => {
      socket.disconnect();
    };
  }, [eventId, router]);

  const handleReady = async () => {
    setIsReadySent(true);
    await setJudgesReadyStatus(eventId, true);
    console.log("[Server Action] Sent judge-ready and saved to DB");
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-8 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Background glow when ready is clicked */}
      <div className={`absolute inset-0 bg-emerald-500/10 transition-opacity duration-500 pointer-events-none ${isReadySent ? 'opacity-100' : 'opacity-0'}`}></div>

      <div className="text-center relative z-10 w-full max-w-lg">
        <p className="text-xs text-primary uppercase tracking-widest font-bold mb-2">Panel de Tránsito de Pista</p>
        <h3 className="text-2xl font-black text-white mb-6">Mesa de Jueces: Calificación</h3>

        <button
          onClick={handleReady}
          disabled={isReadySent}
          className={`w-full py-6 rounded-2xl font-black text-2xl tracking-wider uppercase transition-all duration-100 shadow-2xl ${
            isReadySent
              ? "bg-slate-800 text-gray-500 border border-white/5 cursor-not-allowed shadow-none translate-y-1 border-b-2 border-slate-900"
              : "bg-gradient-to-b from-emerald-400 to-emerald-600 border-b-8 border-emerald-800 text-white cursor-pointer hover:brightness-110 active:border-b-2 active:translate-y-1.5 hover:shadow-emerald-500/40 hover:shadow-[0_0_35px_rgba(52,211,153,0.3)] animate-pulse"
          }`}
        >
          {isReadySent ? "✅ SEÑAL ENVIADA (JUECES LISTOS)" : "🟢 ¡LISTO PARA EL SIGUIENTE!"}
        </button>

        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
          {isReadySent 
            ? `Notificación enviada. Esperando a que el Animador presente a: ${nextTeamName || "siguiente equipo"}`
            : `Presiona este botón cuando termines de evaluar a "${currentTeamName || "el equipo actual"}" para autorizar la entrada del siguiente.`}
        </p>
      </div>
    </div>
  );
}
