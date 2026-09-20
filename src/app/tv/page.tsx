"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

export default function TvQuickPairPage() {
  const router = useRouter();
  const [pin, setPin] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");
  const [pairingUrl, setPairingUrl] = useState<string>("");
  const [status, setStatus] = useState<"connecting" | "paired" | "error">("connecting");
  const [pairedEventId, setPairedEventId] = useState<string | null>(null);

  useEffect(() => {
    // Generar un PIN aleatorio de 4 dígitos para esta pantalla
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(newPin);

    // Obtener la URL base del navegador
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const targetUrl = `${origin}/admin/tv-pair?pin=${newPin}`;
    setPairingUrl(targetUrl);

    // Generar inmediatamente la imagen del QR usando API de alta velocidad
    const encodedUrl = encodeURIComponent(targetUrl);
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}&color=0f172a&bgcolor=ffffff`);

    // Intentar también generar el Data URL local de forma dinámica
    import("qrcode")
      .then((QRCodeLib) => {
        const QRCode = QRCodeLib.default || QRCodeLib;
        if (QRCode && typeof QRCode.toDataURL === "function") {
          QRCode.toDataURL(targetUrl, {
            width: 320,
            margin: 2,
            color: {
              dark: "#0f172a",
              light: "#ffffff",
            },
          })
            .then((url: string) => setQrUrl(url))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pin) return;

    let socket: Socket | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      socket = io();
      socket.emit("join-tv-pairing", pin);

      socket.on("tv-paired", (data: { pin: string; eventId: string }) => {
        if (data.eventId) {
          setStatus("paired");
          setPairedEventId(data.eventId);
          setTimeout(() => {
            router.push(`/tv/${data.eventId}`);
          }, 1200);
        }
      });
    } catch (err) {
      console.error("Error al conectar WebSocket:", err);
    }

    // Polling de respaldo en caso de que el socket no esté disponible
    pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tv-pair?pin=${pin}`);
        if (res.ok) {
          const data = await res.json();
          if (data.eventId) {
            setStatus("paired");
            setPairedEventId(data.eventId);
            if (pollInterval) clearInterval(pollInterval);
            setTimeout(() => {
              router.push(`/tv/${data.eventId}`);
            }, 1200);
          }
        }
      } catch (e) {
        // Ignorar fallos de polling temporales
      }
    }, 2500);

    return () => {
      if (socket) socket.disconnect();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pin, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden select-none font-sans">
      {/* Background Decorativo futurista */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-[128px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center z-10 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-2xl shadow-lg shadow-purple-500/20">
            📺
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              CheerControl <span className="text-purple-400">TV</span>
            </h1>
            <p className="text-xs text-gray-400 font-medium">Sistema de Transmisión en Vivo</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
          <span className="relative flex h-3 w-3">
            {status === "paired" ? (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            ) : (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500" />
              </>
            )}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
            {status === "paired" ? "Evento Conectado" : "Esperando Conexión"}
          </span>
        </div>
      </div>

      {/* Contenido Principal / Pairing Box */}
      <div className="flex-1 flex items-center justify-center my-8 z-10">
        <div className="glass-panel w-full max-w-3xl p-8 md:p-12 border border-white/15 rounded-3xl shadow-2xl bg-slate-900/80 backdrop-blur-xl text-center space-y-8 relative overflow-hidden">

          {status === "paired" ? (
            <div className="py-12 space-y-4 animate-fade-in">
              <div className="text-6xl animate-bounce">🎉</div>
              <h2 className="text-3xl font-extrabold text-emerald-400">¡Pantalla Vinculada!</h2>
              <p className="text-gray-300 text-sm">Cargando transmisión del evento en vivo...</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest bg-purple-500/10 border border-purple-500/30 text-purple-300 inline-block">
                  Conexión Rápida de Pantalla
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-white">
                  Escanea para Transmitir
                </h2>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  Escanea el código QR desde tu teléfono o ingresa al panel de administración para seleccionar el evento.
                </p>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 pt-2">
                {/* QR Code */}
                <div className="p-4 bg-white rounded-2xl shadow-2xl shadow-purple-500/10 border border-white/20 flex flex-col items-center justify-center">
                  {qrUrl ? (
                    <img src={qrUrl} alt="Código QR de Vinculación TV" className="w-56 h-56 object-contain" />
                  ) : (
                    <div className="w-56 h-56 bg-slate-800 animate-pulse rounded-lg flex items-center justify-center text-gray-400">
                      Cargando QR...
                    </div>
                  )}
                </div>

                <div className="text-left space-y-6">
                  {/* Código PIN */}
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-gray-400 block mb-2">
                      Código PIN de la TV
                    </label>
                    <div className="flex items-center gap-2">
                      {pin ? (
                        pin.split("").map((digit, idx) => (
                          <div
                            key={idx}
                            className="w-14 h-16 rounded-xl bg-slate-950/80 border border-purple-500/40 text-3xl font-black text-purple-300 flex items-center justify-center shadow-inner"
                          >
                            {digit}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-400 text-sm animate-pulse font-mono py-4">Generando PIN...</div>
                      )}
                    </div>
                  </div>

                  {/* Instrucciones */}
                  <div className="space-y-2 text-xs text-gray-300 max-w-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold">1</span>
                      <span>Escanea el QR con tu celular</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold">2</span>
                      <span>Selecciona el evento en el Administrador</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-bold">3</span>
                      <span>¡La TV transmitirá automáticamente!</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400 border-t border-white/10 pt-4 z-10">
        <div>
          <span>Dirección manual: </span>
          <span className="font-mono text-purple-300 font-semibold">{pairingUrl || "/admin/tv-pair"}</span>
        </div>
        <div>
          <a
            href={pairingUrl || "/admin/tv-pair"}
            className="hover:text-white transition underline font-medium"
          >
            Seleccionar evento en este navegador ➔
          </a>
        </div>
      </div>
    </div>
  );
}
