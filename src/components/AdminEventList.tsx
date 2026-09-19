"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { updateEvent, deleteEvent, generateTestData, resetDemoEvent, updateDemoPin, createDemoEvent } from "@/app/admin/actions";
import LogoUploader from "./LogoUploader";

interface AdminEventListProps {
  events: any[];
  producerId: string;
}

export default function AdminEventList({ events, producerId }: AdminEventListProps) {
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [newPinValue, setNewPinValue] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Edit Form Fields
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [registrationZonesCount, setRegistrationZonesCount] = useState(1);
  const [warmupZonesCount, setWarmupZonesCount] = useState(1);
  const [springfloorZonesCount, setSpringfloorZonesCount] = useState(1);
  const [forceSameZone, setForceSameZone] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStartEdit = (event: any) => {
    setEditingId(event.id);
    setName(event.name);
    // Convert Date to YYYY-MM-DD format for date input
    const d = new Date(event.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setDate(`${yyyy}-${mm}-${dd}`);
    setLogoUrl(event.logoUrl || "");
    setRegistrationZonesCount(event.registrationZonesCount || 1);
    setWarmupZonesCount(event.warmupZonesCount || 1);
    setSpringfloorZonesCount(event.springfloorZonesCount || 1);
    setForceSameZone(event.forceSameZone || false);
  };

  const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;

    const formData = new FormData(e.currentTarget);
    formData.append("eventId", editingId);

    await updateEvent(formData);
    setEditingId(null);
  };

  const handleResetDemo = async (eventId: string) => {
    if (!confirm("🔄 ¿Confirmas reiniciar la simulación?\n\nLos 16 equipos de prueba se reprogramarán para comenzar 10 minutos a partir de este instante, con intervalos de 10 min por estación.")) {
      return;
    }
    setLoadingAction(`reset_${eventId}`);
    try {
      await resetDemoEvent(eventId);
      alert("✅ Simulación de capacitación reiniciada y sincronizada a +10 minutos.");
    } catch {
      alert("Error al reiniciar la simulación.");
    }
    setLoadingAction(null);
  };

  const handleCreateDemo = async () => {
    setLoadingAction("create_demo");
    try {
      const res = await createDemoEvent(producerId);
      if (res?.error) {
        alert(`⚠️ Error: ${res.error}`);
      } else if (res?.success) {
        alert(`✅ Evento de Capacitación Creado!\n\nPIN de 4 dígitos: ${res.pin}\nEnlace Privado: /demo`);
      }
    } catch (err: any) {
      alert(`⚠️ Error al crear el evento de capacitación: ${err?.message || err}`);
    }
    setLoadingAction(null);
  };

  const handleSavePin = async (eventId: string) => {
    if (newPinValue.trim().length !== 4) {
      alert("El PIN debe constar exactamente de 4 dígitos.");
      return;
    }
    await updateDemoPin(eventId, newPinValue);
    setEditingPinId(null);
  };

  const handleCopyDemoLink = () => {
    const link = `${window.location.origin}/demo`;
    navigator.clipboard.writeText(link);
    alert(`📋 Enlace de capacitación copiado al portapapeles:\n${link}`);
  };

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map(event => (
          <div key={event.id} className="glass-panel p-5 animate-pulse h-[160px]"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Botón superior para crear evento demo */}
      <div className="flex justify-end">
        <button
          onClick={handleCreateDemo}
          disabled={loadingAction === "create_demo"}
          className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer"
        >
          🧪 {loadingAction === "create_demo" ? "Creando..." : "Crear Evento de Capacitación (Demo)"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((event) => {
          const isEditing = editingId === event.id;

          if (isEditing) {
            return (
              <div key={event.id} className="glass-panel p-5 border-2 border-warning/50 bg-[#1e293b]/80">
                <h3 className="text-sm font-bold text-warning uppercase mb-3">✏️ Editar Evento</h3>
                <form onSubmit={handleUpdateSubmit} className="space-y-3">
                  <div>
                    <input
                      type="text"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Nombre del Evento"
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-warning"
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      name="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-warning [color-scheme:dark]"
                    />
                  </div>
                  <LogoUploader
                    name="logoUrl"
                    defaultValue={logoUrl}
                    label="Logo del Evento"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Registros</label>
                      <input
                        type="number"
                        name="registrationZonesCount"
                        value={registrationZonesCount}
                        onChange={(e) => setRegistrationZonesCount(parseInt(e.target.value, 10))}
                        min="1"
                        max="5"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-warning"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Calentamiento</label>
                      <input
                        type="number"
                        name="warmupZonesCount"
                        value={warmupZonesCount}
                        onChange={(e) => setWarmupZonesCount(parseInt(e.target.value, 10))}
                        min="1"
                        max="5"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-warning"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-0.5">Springfloor</label>
                      <input
                        type="number"
                        name="springfloorZonesCount"
                        value={springfloorZonesCount}
                        onChange={(e) => setSpringfloorZonesCount(parseInt(e.target.value, 10))}
                        min="1"
                        max="5"
                        required
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-warning"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        name="forceSameZone"
                        checked={forceSameZone}
                        onChange={(e) => setForceSameZone(e.target.checked)}
                        className="w-4 h-4 rounded bg-[#1e293b] border-white/10 text-primary focus:ring-primary"
                      />
                      <span className="font-semibold text-primary">🔗 Forzar misma zona Calentamiento y Springfloor</span>
                    </label>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-xs py-1 px-3 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 text-white font-bold text-xs py-1 px-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              </div>
            );
          }

          return (
            <div
              key={event.id}
              className={`glass-panel p-5 flex flex-col justify-between group transition-all rounded-xl relative overflow-hidden ${
                event.isDemo ? "border-purple-500/40 bg-purple-950/10" : ""
              }`}
            >
              {event.isDemo && (
                <div className="absolute top-0 right-0 bg-purple-500/20 text-purple-300 text-[10px] font-bold px-3 py-1 rounded-bl-lg border-b border-l border-purple-500/30 uppercase tracking-widest">
                  🧪 Modo Capacitación
                </div>
              )}

              <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
                <div className="flex items-center gap-4">
                  {event.logoUrl ? (
                    <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-1">
                      <img src={event.logoUrl} alt={event.name} className="max-w-full max-h-full object-contain rounded" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center text-xl shrink-0">
                      {event.isDemo ? "🧪" : "🏟️"}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{event.name}</h3>
                    <p className="text-sm text-warning mt-0.5">
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/25 px-1.5 py-0.5 rounded">
                        📝 {event.registrationZonesCount || 1} Registros
                      </span>
                      <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/25 px-1.5 py-0.5 rounded">
                        🔥 {event.warmupZonesCount || 1} Calentamientos
                      </span>
                      <span className="text-[9px] bg-pink-500/20 text-pink-300 border border-pink-500/25 px-1.5 py-0.5 rounded">
                        🤸 {event.springfloorZonesCount || 1} Springfloors
                      </span>
                      {event.forceSameZone && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 px-1.5 py-0.5 rounded font-bold">
                          🔗 Zonas Sincronizadas
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botón Editar / Eliminar */}
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(event)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white p-1.5 rounded transition-all text-xs cursor-pointer"
                    title="Editar Evento"
                  >
                    ✏️
                  </button>
                  <form
                    action={deleteEvent}
                    onSubmit={(e) => {
                      if (!confirm("⚠️ ¿Estás seguro de que deseas eliminar este evento y todos sus cronogramas asociados?")) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="eventId" value={event.id} />
                    <button
                      type="submit"
                      className="bg-red-500/10 border border-red-500/30 hover:bg-red-500 hover:text-white text-red-400 p-1.5 rounded transition-all text-xs cursor-pointer"
                      title="Eliminar Evento"
                    >
                      🗑️
                    </button>
                  </form>
                </div>
              </div>

              {/* Panel exclusivo para eventos Demo */}
              {event.isDemo && (
                <div className="mt-2 mb-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-2 relative z-10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-300 font-semibold">🔑 PIN de Acceso (4 dígitos):</span>
                    {editingPinId === event.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          maxLength={4}
                          value={newPinValue}
                          onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, ""))}
                          className="w-16 bg-black/50 border border-purple-500/50 rounded px-1 py-0.5 text-center text-xs font-mono font-bold text-white"
                        />
                        <button
                          onClick={() => handleSavePin(event.id)}
                          className="bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-white text-sm bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                          {event.demoPin || "1234"}
                        </span>
                        <button
                          onClick={() => {
                            setEditingPinId(event.id);
                            setNewPinValue(event.demoPin || "1234");
                          }}
                          className="text-[10px] text-purple-400 hover:underline cursor-pointer"
                        >
                          ✏️ Editar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => handleResetDemo(event.id)}
                      disabled={loadingAction === `reset_${event.id}`}
                      className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 py-1.5 rounded text-xs font-bold transition-all text-center cursor-pointer"
                    >
                      🔄 {loadingAction === `reset_${event.id}` ? "Reiniciando..." : "Reiniciar Prueba Sincronizada (+10 min)"}
                    </button>

                    <button
                      onClick={handleCopyDemoLink}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 py-1.5 px-3 rounded text-xs font-medium transition-all cursor-pointer"
                    >
                      📋 Copiar Enlace (/demo)
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4 relative z-10">
                <Link
                  href={`/admin/events/${event.id}`}
                  className="flex-1 text-center bg-white/5 hover:bg-white/10 border border-white/10 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Ver Panel
                </Link>
                <Link
                  href={`/admin/events/${event.id}/customization`}
                  className="flex-1 text-center bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  🎨 Personalizar
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
