"use client";

import { useState, useEffect } from "react";
import { updateAdminScheduleTeam, updateScheduleStatus } from "@/app/admin/actions";

interface AdminScheduleRowProps {
  schedule: any;
  eventId: string;
  warmupZonesCount: number;
  springfloorZonesCount: number;
  forceSameZone: boolean;
}

export default function AdminScheduleRow({ 
  schedule, 
  eventId,
  warmupZonesCount,
  springfloorZonesCount,
  forceSameZone
}: AdminScheduleRowProps) {
  const [mounted, setMounted] = useState(false);
  const [coach, setCoach] = useState(schedule.team.coach || "");
  const [coachPhone, setCoachPhone] = useState(schedule.team.coachPhone || "");
  const [warmupZone, setWarmupZone] = useState(schedule.warmupZone || "A");
  const [springfloorZone, setSpringfloorZone] = useState(schedule.springfloorZone || "A");
  const [status, setStatus] = useState(schedule.status);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getZoneLetter = (index: number) => String.fromCharCode(65 + index);
  const warmupOptions = Array.from({ length: warmupZonesCount || 1 }, (_, i) => getZoneLetter(i));
  const springfloorOptions = Array.from({ length: springfloorZonesCount || 1 }, (_, i) => getZoneLetter(i));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData();
    formData.append("scheduleId", schedule.id);
    formData.append("teamId", schedule.team.id);
    formData.append("coach", coach);
    formData.append("coachPhone", coachPhone);
    formData.append("warmupZone", warmupZone);
    formData.append("springfloorZone", springfloorZone);
    formData.append("eventId", eventId);

    await updateAdminScheduleTeam(formData);
    setIsSaving(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    const formData = new FormData();
    formData.append("scheduleId", schedule.id);
    formData.append("newStatus", newStatus);
    formData.append("eventId", eventId);
    await updateScheduleStatus(formData);
  };

  // WhatsApp Messages
  const getRegistrationMarginMsg = (simulatedMinsLeft: number) => {
    if (!mounted) return "#";
    let text = "";
    if (simulatedMinsLeft > 10 && simulatedMinsLeft <= 20) {
      text = `Hola coach, en ${simulatedMinsLeft} minutos debe estar en la zona de registros con su equipo.`;
    } else if (simulatedMinsLeft > 0 && simulatedMinsLeft <= 10) {
      text = `Hola coach, le faltan solo ${simulatedMinsLeft} minutos para presentarse en la zona de registro.`;
    } else if (simulatedMinsLeft === 0) {
      text = `Hola coach, ya debe estar en la zona de registro.`;
    } else if (simulatedMinsLeft < 0) {
      const minsLate = Math.abs(simulatedMinsLeft);
      text = `Hola coach, su equipo ya se atrasó por ${minsLate} minutos, por favor acérquese a la zona de registro de inmediato.`;
    }
    const cleanPhone = coachPhone.replace(/\+/g, "");
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const getScheduleChangeMsg = () => {
    if (!mounted) return "#";
    const formattedTime = new Date(schedule.scheduledPerformance).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const text = `Hola coach, le informamos que el horario de presentación de su equipo ${schedule.team.name} ha sido modificado. Su nueva hora estimada de presentación es a las ${formattedTime}.`;
    const cleanPhone = coachPhone.replace(/\+/g, "");
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const statusLabels: Record<string, string> = {
    "PENDING": "Pendiente",
    "IN_REGISTRATION": "En Registro",
    "REGISTERED": "Registrado",
    "ARRIVED_WARMUP": "Llegó a Calentamiento",
    "WARMING_UP": "Calentando",
    "FINISHED_WARMUP": "Fin Calentamiento",
    "ARRIVED_SPRINGFLOOR": "Llegó a Springfloor",
    "WARMING_UP_SPRINGFLOOR": "Calentando Spring",
    "FINISHED_SPRINGFLOOR": "Fin Springfloor",
    "IN_TRANSIT": "En Traslado",
    "ARRIVED_COMPETITION": "Llegó a Competencia",
    "WAITING": "En Espera",
    "COMPETING": "Compitiendo",
    "FINISHED": "Finalizado"
  };

  return (
    <div className="glass-panel p-6 border-l-4 border-l-primary flex flex-col lg:flex-row justify-between gap-6 transition-all hover:bg-white/[0.03]">
      {/* Información del Equipo */}
      <div className="flex-1 space-y-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="bg-primary/20 text-primary font-bold px-2 py-0.5 rounded text-xs">
              # {schedule.orderIndex}
            </span>
            <h3 className="text-xl font-bold text-white leading-tight">
              {schedule.team.name}
            </h3>
            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300 font-semibold uppercase">
              {statusLabels[status] || status}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            {schedule.team.institution.name} • {schedule.team.division} • {schedule.team.category} ({schedule.team.level})
          </p>
        </div>

        {/* Formulario de Configuración de Zonas y Coach */}
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
          <div>
            <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Nombre Coach</label>
            <input
              type="text"
              value={coach}
              onChange={(e) => setCoach(e.target.value)}
              placeholder="Nombre Entrenador"
              className="w-full bg-black/40 text-white border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Teléfono Coach</label>
            <input
              type="text"
              value={coachPhone}
              onChange={(e) => setCoachPhone(e.target.value)}
              placeholder="Ej. +56912345678"
              className="w-full bg-black/40 text-white border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
            />
          </div>
          {warmupZonesCount > 1 && (
            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Zona Calentamiento</label>
              <select
                value={warmupZone}
                onChange={(e) => {
                  const val = e.target.value;
                  setWarmupZone(val);
                  if (forceSameZone) {
                    setSpringfloorZone(val);
                  }
                }}
                className="w-full bg-black/40 text-white border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
              >
                {warmupOptions.map(opt => (
                  <option key={opt} value={opt}>Zona {opt}</option>
                ))}
              </select>
            </div>
          )}
          {springfloorZonesCount > 1 && (
            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">
                Tapete Springfloor {forceSameZone && <span className="text-emerald-400 font-bold">(🔗 Sinc.)</span>}
              </label>
              <select
                value={springfloorZone}
                onChange={(e) => setSpringfloorZone(e.target.value)}
                disabled={forceSameZone}
                className="w-full bg-black/40 text-white border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-primary disabled:opacity-60"
              >
                {springfloorOptions.map(opt => (
                  <option key={opt} value={opt}>Zona {opt}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-1.5 px-4 rounded-lg shadow transition-all flex items-center gap-1"
            >
              {isSaving ? "Guardando..." : "💾 Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>

      {/* Controles de Status y WhatsApp */}
      <div className="flex flex-col justify-between items-stretch lg:items-end gap-4 min-w-[200px]">
        {/* Forzar cambio de estado */}
        <div>
          <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1 text-left lg:text-right">Forzar Estado (Admin)</label>
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="bg-black/30 border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-warning font-semibold w-full"
          >
            {Object.entries(statusLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Alertas WhatsApp */}
        {coachPhone ? (
          <div className="relative group w-full lg:w-auto">
            <button className="w-full lg:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer shadow transition-all">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.273-3.832l.41.244c1.554.922 3.325 1.408 5.129 1.409 5.86 0 10.63-4.773 10.635-10.636a10.51 10.51 0 0 0-3.125-7.498 10.517 10.517 0 0 0-7.493-3.122c-5.869 0-10.64 4.774-10.645 10.638-.001 1.879.491 3.713 1.424 5.33l.266.463L1.936 21.03l3.864-1.012-.47.28z"/>
              </svg>
              <span>Notificar por WhatsApp</span>
            </button>
            
            <div className="absolute right-0 bottom-full lg:bottom-auto lg:top-full mt-1 mb-1 lg:mt-1 bg-[#1e293b] border border-white/10 p-2 rounded-lg shadow-xl min-w-[280px] hidden group-hover:block hover:block z-50 space-y-1">
              <p className="text-[10px] text-gray-400 font-bold uppercase pb-1 border-b border-white/5">Mensajes Predefinidos:</p>
              
              <a
                href={getRegistrationMarginMsg(20)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-left text-[11px] text-gray-300 hover:bg-white/5 hover:text-emerald-400 p-1.5 rounded transition-all"
              >
                ⏱️ Registro en 10-20 min
              </a>
              
              <a
                href={getRegistrationMarginMsg(5)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-left text-[11px] text-gray-300 hover:bg-white/5 hover:text-emerald-400 p-1.5 rounded transition-all"
              >
                ⚠️ Faltan pocos minutos
              </a>

              <a
                href={getRegistrationMarginMsg(0)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-left text-[11px] text-gray-300 hover:bg-white/5 hover:text-emerald-400 p-1.5 rounded transition-all"
              >
                🚨 Ya debe estar en Registro
              </a>

              <a
                href={getRegistrationMarginMsg(-5)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-left text-[11px] text-gray-300 hover:bg-white/5 hover:text-emerald-400 p-1.5 rounded transition-all"
              >
                🔴 Reportar Atraso
              </a>

              <a
                href={getScheduleChangeMsg()}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-left text-[11px] text-gray-300 hover:bg-white/5 hover:text-emerald-400 p-1.5 rounded transition-all border-t border-white/5 pt-2"
              >
                📅 Notificar Cambio de Horario
              </a>
            </div>
          </div>
        ) : (
          <span className="text-[10px] text-red-400 italic">⚠️ Registra un teléfono para activar WhatsApp</span>
        )}
      </div>
    </div>
  );
}
