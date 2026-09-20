"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Link from "next/link";

interface EventItem {
  id: string;
  name: string;
  date?: string | Date | null;
  location?: string | null;
  logoUrl?: string | null;
  sessionsCount?: number;
  schedulesCount?: number;
}

export default function TvPairClient({ events }: { events: EventItem[] }) {
  const searchParams = useSearchParams();
  const initialPin = searchParams.get("pin") || "";
  const [pin, setPin] = useState(initialPin);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialPin) {
      setPin(initialPin);
    }
  }, [initialPin]);

  const handleConnect = async (eventId: string, eventName: string) => {
    if (!pin || pin.trim().length === 0) {
      setErrorMessage("Por favor ingresa un código PIN de 4 dígitos de la pantalla TV.");
      return;
    }

    setLoadingEventId(eventId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Enviar vía API
      const res = await fetch("/api/tv-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim(), eventId }),
      });

      if (!res.ok) {
        throw new Error("No se pudo registrar la vinculación");
      }

      // 2. Enviar vía Socket.IO para tiempo real instantáneo
      try {
        const socket = io();
        socket.emit("pair-tv-event", { pin: pin.trim(), eventId });
        setTimeout(() => socket.disconnect(), 1000);
      } catch (sErr) {
        console.warn("Socket notification warning:", sErr);
      }

      setSelectedEventId(eventId);
      setSuccessMessage(`¡Pantalla TV (PIN ${pin}) vinculada con éxito a "${eventName}"!`);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Ocurrió un error al vincular la TV.");
    } finally {
      setLoadingEventId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Encabezado */}
      <div className="glass-panel p-6 border-l-4 border-l-purple-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-xs uppercase font-bold text-purple-400 tracking-wider">
            Control de Transmisión TV
          </div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 mt-1">
            <span>📺 Vincular Pantalla TV</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Selecciona el evento que deseas transmitir en vivo en la pantalla de la TV.
          </p>
        </div>

        <Link
          href="/admin"
          className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold text-gray-300 transition-colors border border-white/10"
        >
          ← Volver al Panel
        </Link>
      </div>

      {/* Input de PIN */}
      <div className="glass-panel p-6 border border-white/10 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <span>🔑</span> Código PIN de la TV
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Ingresa los 4 dígitos que se muestran en la pantalla TV (`/tv`)
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <input
              type="text"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              placeholder="EJ: 8492"
              className="w-36 px-4 py-2.5 bg-slate-950/80 border border-purple-500/40 rounded-xl text-center text-xl font-black tracking-widest text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs font-bold text-red-300 flex items-center gap-2">
            <span>⚠️</span> {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-300 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span>✅</span> {successMessage}
            </div>
            {selectedEventId && (
              <a
                href={`/tv/${selectedEventId}`}
                target="_blank"
                rel="noreferrer"
                className="underline text-emerald-200 hover:text-white"
              >
                Abrir pantalla TV en otra pestaña ➔
              </a>
            )}
          </div>
        )}
      </div>

      {/* Lista de Eventos Disponibles */}
      <div className="space-y-4">
        <h2 className="text-sm uppercase font-bold tracking-wider text-gray-400">
          Seleccionar Evento a Transmitir
        </h2>

        {events.length === 0 ? (
          <div className="glass-panel p-8 text-center text-gray-400 space-y-3 border border-white/10 rounded-2xl">
            <p className="text-sm font-semibold">No se encontraron eventos activos.</p>
            <p className="text-xs text-gray-500">Crea un evento primero en tu panel de administración.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((evt) => {
              const isSelected = selectedEventId === evt.id;
              const isLoading = loadingEventId === evt.id;

              return (
                <div
                  key={evt.id}
                  className={`glass-panel p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                      : "border-white/10 hover:border-purple-500/40"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {evt.logoUrl ? (
                      <img
                        src={evt.logoUrl}
                        alt={evt.name}
                        className="w-14 h-14 rounded-xl object-contain bg-white/5 p-1 border border-white/10"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-2xl font-black text-purple-300">
                        🏆
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-white truncate">{evt.name}</h3>
                      {evt.location && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <span>📍</span> {evt.location}
                        </p>
                      )}
                      {evt.date && (
                        <p className="text-xs text-purple-300/80 font-medium mt-0.5">
                          📅 {new Date(evt.date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="text-[11px] text-gray-400 font-medium">
                      {evt.sessionsCount ? `${evt.sessionsCount} Jornadas` : "Sin jornadas"}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleConnect(evt.id, evt.name)}
                      disabled={isLoading}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg ${
                        isSelected
                          ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                          : "btn-primary"
                      }`}
                    >
                      <span>🚀</span>
                      {isLoading
                        ? "Vinculando..."
                        : isSelected
                        ? "Transmitiendo Actualmente"
                        : "Transmitir en TV"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
