"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { updateScheduleStatus } from "@/app/admin/actions";

interface AnnouncerRealtimeProps {
  eventId: string;
  nextTeamName: string | null;
  nextTeamInstitution: string | null;
  nextTeamCity: string | null;
  nextTeamCoach: string | null;
  nextTeamAthletes: number | null;
  nextScheduleId: string | null;
  initialReady: boolean;
}

export default function AnnouncerRealtime({ 
  eventId, 
  nextTeamName, 
  nextTeamInstitution, 
  nextTeamCity,
  nextTeamCoach,
  nextTeamAthletes,
  nextScheduleId,
  initialReady 
}: AnnouncerRealtimeProps) {
  const router = useRouter();
  const [isGreenLight, setIsGreenLight] = useState(initialReady);

  useEffect(() => {
    setIsGreenLight(initialReady);
  }, [initialReady]);

  useEffect(() => {
    const socket = io();

    socket.emit("join-event", eventId);

    // Alerta de jueces listos (Luz Verde)
    socket.on("announcer-alert", () => {
      console.log("[WS] Received judge-ready alert! Light turns GREEN!");
      setIsGreenLight(true);
      
      // Reproducir tono de alerta premium (Browser Audio API)
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Primer bip (500Hz)
        const osc1 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        osc1.connect(gainNode);
        gainNode.connect(audioContext.destination);
        osc1.frequency.value = 523.25; // Nota C5
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc1.start();
        osc1.stop(audioContext.currentTime + 0.3);

        // Segundo bip armonioso (659.25Hz E5) después de 150ms
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          osc2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          osc2.frequency.value = 659.25;
          gainNode2.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          osc2.start();
          osc2.stop(audioContext.currentTime + 0.3);
        }, 150);
      } catch (err) {
        console.warn("Audio Context blocked or not supported", err);
      }
    });

    // Cambio de estado general
    socket.on("status-changed", () => {
      console.log("[WS] Status changed, updating announcer screen...");
      setIsGreenLight(false); // Apagar luz verde cuando un equipo se mueve de estado
      router.refresh();
    });

    return () => {
      socket.disconnect();
    };
  }, [eventId, router]);

  return (
    <div className="space-y-6">
      {/* Alerta de Luz Verde Gigante */}
      <div 
        className={`glass-panel p-8 rounded-2xl border-2 transition-all duration-500 shadow-2xl relative overflow-hidden ${
          isGreenLight 
            ? "border-emerald-500 bg-emerald-500/20 shadow-emerald-500/20" 
            : "border-white/10 bg-slate-900/40"
        }`}
      >
        {isGreenLight && (
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-500/10 pointer-events-none animate-pulse"></div>
        )}

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className={`w-6 h-6 rounded-full transition-colors duration-500 ${isGreenLight ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,1)] animate-ping" : "bg-red-600"}`}></span>
            <span className={`w-6 h-6 absolute rounded-full transition-colors duration-500 ${isGreenLight ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,1)]" : "bg-red-600"}`}></span>
            <h3 className={`text-sm font-black tracking-widest uppercase ml-4 ${isGreenLight ? "text-emerald-400" : "text-gray-400"}`}>
              {isGreenLight ? "🟢 PISTA AUTORIZADA POR JUECES" : "🔴 ESPERANDO SEÑAL DE JUECES"}
            </h3>
          </div>

          <div className="max-w-2xl mx-auto py-4">
            {nextTeamName ? (
              <div className="space-y-4">
                <p className="text-gray-400 text-sm font-semibold uppercase">Siguiente en Presentar:</p>
                <div>
                  <h2 className="text-4xl font-black text-white leading-tight">{nextTeamName}</h2>
                  <p className="text-xl text-primary font-bold">{nextTeamInstitution}</p>
                </div>
                
                {/* Datos adicionales para el Animador (Ciudad, Entrenador, Deportistas) */}
                <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4 max-w-md mx-auto text-xs text-left">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">📍 Ciudad</span>
                    <span className="text-white font-semibold">{nextTeamCity || "N/D"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">📋 Deportistas</span>
                    <span className="text-white font-semibold">{nextTeamAthletes || 0} integrantes</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">👨‍🏫 Entrenador</span>
                    <span className="text-white font-semibold truncate block" title={nextTeamCoach || ""}>{nextTeamCoach || "Sin Entrenador"}</span>
                  </div>
                </div>

                {/* Botón de control reactivo */}
                {nextScheduleId && (
                  <form action={updateScheduleStatus} className="pt-4 max-w-md mx-auto">
                    <input type="hidden" name="scheduleId" value={nextScheduleId} />
                    <input type="hidden" name="newStatus" value="COMPETING" />
                    <input type="hidden" name="eventId" value={eventId} />
                    <button 
                      type="submit" 
                      disabled={!isGreenLight}
                      className={`w-full py-4 rounded-xl font-extrabold text-lg tracking-wide uppercase transition-all duration-300 shadow-xl active:scale-98 ${
                        isGreenLight
                          ? "bg-gradient-to-r from-warning to-orange-500 hover:shadow-warning/20 hover:scale-[1.02] text-black cursor-pointer"
                          : "bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {isGreenLight ? "🎤 Presentar Siguiente Equipo" : "🎤 Presentar (Jueces evaluando...)"}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xl font-bold text-gray-300">Sin equipos en cronograma</p>
                <p className="text-xs text-gray-500">No hay más equipos programados para este evento.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
