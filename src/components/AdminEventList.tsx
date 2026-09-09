"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { updateEvent, deleteEvent, generateTestData } from "@/app/admin/actions";

interface AdminEventListProps {
  events: any[];
  producerId: string;
}

export default function AdminEventList({ events, producerId }: AdminEventListProps) {
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const formData = new FormData();
    formData.append("eventId", editingId);
    formData.append("name", name);
    formData.append("date", date);
    formData.append("logoUrl", logoUrl);
    formData.append("registrationZonesCount", String(registrationZonesCount));
    formData.append("warmupZonesCount", String(warmupZonesCount));
    formData.append("springfloorZonesCount", String(springfloorZonesCount));
    formData.append("forceSameZone", String(forceSameZone));



    await updateEvent(formData);
    setEditingId(null);
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
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-warning [color-scheme:dark]"
                  />
                </div>
                <div>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="URL del Logo (Opcional)"
                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-warning"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Registros</label>
                    <input
                      type="number"
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
          <div key={event.id} className="glass-panel p-5 relative overflow-hidden group flex flex-col justify-between">
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
              <div className="flex items-center gap-4">
                {event.logoUrl ? (
                  <img src={event.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover bg-white/5" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center text-xl">🏟️</div>
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
  );
}
