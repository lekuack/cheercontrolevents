"use client";

import { useState, useEffect } from "react";
import { updateScheduleStatus, updateCoachPhone, updateScheduleZones, toggleHitZeroAwarded } from "@/app/admin/actions";
import CountdownTimer from "@/components/CountdownTimer";

interface Team {
  id: string;
  name: string;
  division: string;
  category: string;
  level: string;
  athletesCount: number;
  coach: string | null;
  coachPhone: string | null;
  institution: {
    name: string;
    city: string | null;
  };
}

interface Schedule {
  id: string;
  eventId: string;
  orderIndex: number;
  status: string;
  isExhibition: boolean;
  scheduledRegistration: string | Date | null;
  scheduledWarmup1?: string | Date | null;
  scheduledSpringfloor?: string | Date | null;
  scheduledPerformance: string | Date | null;
  warmupZone: string;
  springfloorZone: string;
  isHitZero?: boolean;
  hitZeroAwarded?: boolean;
  team?: Team | null;
  type?: string;
}

interface StaffScheduleListProps {
  schedules: Schedule[];
  currentStation: string;
  eventId: string;
  isSupervisor: boolean;
  nextExpectedTeamId: string | null;
  nextExpectedTeamName: string | null;
  warmupZonesCount: number;
  springfloorZonesCount: number;
  forceSameZone: boolean;
}

export default function StaffScheduleList({
  schedules: allSchedules,
  currentStation,
  eventId,
  isSupervisor,
  nextExpectedTeamId,
  nextExpectedTeamName,
  warmupZonesCount,
  springfloorZonesCount,
  forceSameZone
}: StaffScheduleListProps) {
  const [mounted, setMounted] = useState(false);

  // Filtrar breaks para que el staff solo procese equipos
  const schedules = allSchedules.filter((s: any) => s.type !== "BREAK" && s.team);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getZoneLetter = (index: number) => String.fromCharCode(65 + index);
  const warmupOptions = Array.from({ length: warmupZonesCount || 1 }, (_, i) => getZoneLetter(i));
  const springfloorOptions = Array.from({ length: springfloorZonesCount || 1 }, (_, i) => getZoneLetter(i));

  // Botón de avance principal por estado
  const statusTransitions: Record<string, { next: string, label: string, color: string }> = {
    "PENDING": { next: "IN_REGISTRATION", label: "Iniciar Registro", color: "from-blue-500 to-blue-600" },
    "IN_REGISTRATION": { next: "REGISTERED", label: "✅ Finalizar Registro", color: "from-amber-400 to-orange-500 text-black" },
    "REGISTERED": { next: "ARRIVED_WARMUP", label: "Registrar Llegada a Calentamiento", color: "from-purple-500 to-purple-600" },
    "ARRIVED_WARMUP": { next: "WARMING_UP", label: "Iniciar Calentamiento", color: "from-fuchsia-500 to-pink-600" },
    "WARMING_UP": { next: "FINISHED_WARMUP", label: "✅ Finalizar Calentamiento", color: "from-amber-400 to-orange-500 text-black" },
    "FINISHED_WARMUP": { next: "ARRIVED_SPRINGFLOOR", label: "Registrar Llegada a Springfloor", color: "from-teal-500 to-cyan-600" },
    "ARRIVED_SPRINGFLOOR": { next: "WARMING_UP_SPRINGFLOOR", label: "Iniciar Calentamiento Springfloor", color: "from-violet-500 to-violet-700" },
    "WARMING_UP_SPRINGFLOOR": { next: "FINISHED_SPRINGFLOOR", label: "✅ Finalizar Calentamiento Springfloor", color: "from-amber-400 to-orange-500 text-black" },
    "FINISHED_SPRINGFLOOR": { next: "IN_TRANSIT", label: "Iniciar Traslado a Competencia", color: "from-teal-500 to-teal-600" },
    "IN_TRANSIT": { next: "ARRIVED_COMPETITION", label: "Registrar Llegada a Competencia", color: "from-emerald-500 to-emerald-600" },
    "ARRIVED_COMPETITION": { next: "WAITING", label: "Mover a Espera (Boca Escenario)", color: "from-cyan-500 to-cyan-600" },
    "WAITING": { next: "COMPETING", label: "Presentar y Entrar a Competir", color: "from-green-500 to-emerald-600" },
    "COMPETING": { next: "FINISHED", label: "🏁 Presentación Finalizada", color: "from-purple-600 to-indigo-600 font-extrabold text-white shadow-xl hover:bg-purple-700" },
  };

  const allStatuses = [
    { value: "PENDING", label: "Pendiente" },
    { value: "IN_REGISTRATION", label: "En Registro" },
    { value: "REGISTERED", label: "Registrado" },
    { value: "ARRIVED_WARMUP", label: "Llegada Calentamiento" },
    { value: "WARMING_UP", label: "Calentando" },
    { value: "FINISHED_WARMUP", label: "Calentamiento Finalizado" },
    { value: "ARRIVED_SPRINGFLOOR", label: "Llegada Springfloor" },
    { value: "WARMING_UP_SPRINGFLOOR", label: "Calentando Springfloor" },
    { value: "FINISHED_SPRINGFLOOR", label: "Springfloor Finalizado" },
    { value: "IN_TRANSIT", label: "En Traslado" },
    { value: "ARRIVED_COMPETITION", label: "Llegada Competencia" },
    { value: "WAITING", label: "En Espera / Boca Escenario" },
    { value: "COMPETING", label: "Compitiendo" },
    { value: "FINISHED", label: "Finalizado" }
  ];

  // Generador de mensaje de WhatsApp dinámico para el Registro
  const getRegistrationMarginMsg = (schedule: Schedule, simulatedMinsLeft: number) => {
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

    const phone = schedule.team?.coachPhone ? schedule.team.coachPhone.replace(/\+/g, "") : "";
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  // Generador de mensaje de WhatsApp para Notificación de Cambio de Horarios
  const getScheduleChangeMsg = (schedule: Schedule) => {
    if (!mounted) return "#";
    const formattedTime = schedule.scheduledPerformance ? new Date(schedule.scheduledPerformance).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
    const text = `Hola coach, le informamos que el horario de presentación de su equipo ${schedule.team?.name || ""} ha sido modificado. Su nueva hora estimada de presentación es a las ${formattedTime}.`;
    
    const phone = schedule.team?.coachPhone ? schedule.team.coachPhone.replace(/\+/g, "") : "";
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-4">
      {schedules.map((schedule) => {
        const transition = statusTransitions[schedule.status];
        
        // Validar si el equipo se está procesando fuera del orden correlativo
        const isOutOfOrder = nextExpectedTeamId && schedule.id !== nextExpectedTeamId;
        const confirmMsg = `⚠️ ALERTA DE ORDEN DE SALIDA:\n\nEstás procesando a "${schedule.team?.name || ""}" fuera de orden.\n\nEl siguiente equipo programado según el orden correlativo de salida es "${nextExpectedTeamName}".\n\n¿Estás seguro de que deseas continuar con el cambio de estado de "${schedule.team?.name || ""}"?`;

        return (
          <div 
            key={schedule.id} 
            className={`glass-panel p-4 border-l-4 transition-all ${
              isOutOfOrder 
                ? "border-l-warning bg-warning/5"
                : currentStation === "RUNNER"
                  ? "border-l-warning"
                  : 'border-l-primary bg-primary/5'
            }`}
          >
            {/* Info básica del equipo */}
            <div className="flex justify-between items-start mb-3">
              <div className="min-w-0">
                <h3 className="font-bold text-white text-lg leading-tight flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-black text-amber-300 bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 rounded-md shrink-0">
                    #{schedule.orderIndex}
                  </span>
                  <span className="truncate">{schedule.team?.name}</span>
                  {schedule.isExhibition && (
                    <span className="text-[10px] text-purple-300 bg-purple-500/30 border border-purple-500/40 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider shrink-0">
                      (Exhibición)
                    </span>
                  )}
                  {isOutOfOrder && (
                    <span className="text-[9px] bg-warning/20 text-warning px-1.5 py-0.5 rounded font-extrabold shrink-0">FUERA DE ORDEN</span>
                  )}
                </h3>
                <p className="text-xs text-gray-400 truncate">{schedule.team?.institution?.name} • {schedule.team?.division} {schedule.team?.category}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {warmupZonesCount > 1 && (
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                      🔥 Calentamiento: Zona {schedule.warmupZone}
                    </span>
                  )}
                  {springfloorZonesCount > 1 && (
                    <span className="text-[9px] bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-full font-bold">
                      🤸 Springfloor: Zona {schedule.springfloorZone}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-gray-400 block">Horario Registro</span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-xs font-mono text-warning font-bold">
                  {mounted && schedule.scheduledRegistration ? new Date(schedule.scheduledRegistration).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                </span>
              </div>
            </div>

            {/* Información del Coach / Entrenador y WhatsApp */}
            <div className="my-3 pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-gray-400 space-y-1">
                <span className="font-semibold text-white block">👨‍🏫 Coach: {schedule.team?.coach || "Sin asignar"}</span>
                {schedule.team?.coachPhone ? (
                  <span className="text-emerald-400 text-[10px] block">📞 {schedule.team.coachPhone}</span>
                ) : (
                  <span className="text-red-400 text-[10px] block">⚠️ Sin teléfono registrado</span>
                )}
                
                {/* Selector de Reasignación de Zonas en tiempo real para Staff (solo si hay más de 1 zona) */}
                {(warmupZonesCount > 1 || springfloorZonesCount > 1) && (
                  <div className="flex gap-2 pt-1">
                    {warmupZonesCount > 1 && (
                      <div>
                        <span className="text-[8px] text-gray-500 block uppercase font-bold">Calentamiento</span>
                        <select 
                          value={schedule.warmupZone} 
                          onChange={async (e) => {
                            const val = e.target.value;
                            const formData = new FormData();
                            formData.append("scheduleId", schedule.id);
                            formData.append("warmupZone", val);
                            if (forceSameZone) {
                              formData.append("springfloorZone", val);
                            }
                            formData.append("eventId", eventId);
                            await updateScheduleZones(formData);
                          }}
                          className="bg-black/40 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none focus:border-primary"
                        >
                          {warmupOptions.map(opt => (
                            <option key={opt} value={opt}>Zona {opt}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {springfloorZonesCount > 1 && (
                      <div>
                        <span className="text-[8px] text-gray-500 block uppercase font-bold">
                          Springfloor {forceSameZone && <span className="text-emerald-400 font-bold">(🔗)</span>}
                        </span>
                        <select 
                          value={schedule.springfloorZone} 
                          onChange={async (e) => {
                            const formData = new FormData();
                            formData.append("scheduleId", schedule.id);
                            formData.append("springfloorZone", e.target.value);
                            formData.append("eventId", eventId);
                            await updateScheduleZones(formData);
                          }}
                          disabled={forceSameZone}
                          className="bg-black/40 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none focus:border-primary disabled:opacity-50"
                        >
                          {springfloorOptions.map(opt => (
                            <option key={opt} value={opt}>Zona {opt}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botón/Formulario WhatsApp */}
              <div className="flex gap-2">
                {schedule.team?.coachPhone ? (
                  <div className="relative group shrink-0">
                    <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-3 rounded-full text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.273-3.832l.41.244c1.554.922 3.325 1.408 5.129 1.409 5.86 0 10.63-4.773 10.635-10.636a10.51 10.51 0 0 0-3.125-7.498 10.517 10.517 0 0 0-7.493-3.122c-5.869 0-10.64 4.774-10.645 10.638-.001 1.879.491 3.713 1.424 5.33l.266.463L1.936 21.03l3.864-1.012-.47.28z"/>
                      </svg>
                      <span>Mensajes WhatsApp</span>
                    </button>
                    {/* Menú de Mensajes Predefinidos al hacer hover */}
                    <div className="absolute right-0 bottom-full mb-1 bg-[#1e293b] border border-white/10 p-2 rounded-lg shadow-xl min-w-[280px] hidden group-hover:block hover:block z-50 space-y-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase pb-1 border-b border-white/5">Mensajes Predefinidos:</p>
                      
                      {/* Mensaje 1: En x minutos */}
                      <a
                        href={getRegistrationMarginMsg(schedule, 20)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-left text-[11px] text-gray-300 hover:bg-white/5 hover:text-emerald-400 p-1.5 rounded transition-all"
                      >
                        ⏱️ Notificar: Registrar en 10-20 min
                      </a>
                      
                      {/* Mensaje 2: Le quedan pocos min */}
                      <a
                        href={getRegistrationMarginMsg(schedule, 5)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-left text-[11px] text-gray-300 hover:bg-white/5 hover:text-emerald-400 p-1.5 rounded transition-all"
                      >
                        ⚠️ Notificar: Le quedan pocos minutos
                      </a>

                      {/* Mensaje 3: Ya debe estar en registro */}
                      <a
                        href={getRegistrationMarginMsg(schedule, 0)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-left text-[11px] text-gray-300 hover:bg-white/5 hover:text-emerald-400 p-1.5 rounded transition-all"
                      >
                        🚨 Notificar: Ya debe estar en Registro
                      </a>

                      {/* Mensaje 4: Atrasado */}
                      <a
                        href={getRegistrationMarginMsg(schedule, -5)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-left text-[11px] text-gray-300 hover:bg-white/5 hover:text-emerald-400 p-1.5 rounded transition-all"
                      >
                        🔴 Notificar: Atrasado por X min
                      </a>

                      {/* Mensaje 5: Notificar cambio de horario */}
                      <a
                        href={getScheduleChangeMsg(schedule)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-left text-[11px] text-gray-300 hover:bg-white/5 hover:text-emerald-400 p-1.5 rounded transition-all border-t border-white/5 pt-2"
                      >
                        📅 Notificar Cambio de Horario
                      </a>
                    </div>
                  </div>
                ) : (
                  <form action={updateCoachPhone} className="flex gap-1">
                    <input type="hidden" name="teamId" value={schedule.team?.id || ""} />
                    <input type="hidden" name="eventId" value={eventId} />
                    <input 
                      type="text" 
                      name="phone"
                      placeholder="Tel: +56912345678" 
                      required
                      className="bg-black/40 text-white border border-white/10 rounded px-2 py-1 text-[11px] w-[140px] focus:outline-none focus:border-emerald-500" 
                    />
                    <button type="submit" className="bg-white/5 border border-white/10 hover:bg-emerald-600 hover:text-white text-gray-300 text-[10px] py-1 px-2.5 rounded transition-all cursor-pointer">
                      💾 Guardar
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Sección específica de RUNNER */}
            {currentStation === "RUNNER" && (
              <div className="my-3 bg-black/40 p-3 rounded-lg border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Tiempo de margen:</span>
                  <CountdownTimer targetDate={schedule.scheduledRegistration ? new Date(schedule.scheduledRegistration).toISOString() : new Date().toISOString()} />
                </div>
              </div>
            )}

            {/* Banner de Hit Zero en Boca de Escenario / Lista del Staff */}
            {schedule.isHitZero && (
              <div className={`my-3 p-3 rounded-xl border flex items-center justify-between gap-3 ${
                schedule.hitZeroAwarded
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-400/20 border-amber-400/50 text-amber-200 animate-pulse shadow-lg"
              }`}>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-xl shrink-0">🎯</span>
                  <div>
                    <span className="font-extrabold uppercase block">
                      {schedule.hitZeroAwarded ? "✅ Reconocimiento Hit Zero Entregado" : "¡RECONOCIMIENTO HIT ZERO ASIGNADO!"}
                    </span>
                    <span className="text-[11px] opacity-80">
                      {schedule.hitZeroAwarded ? "Premio otorgado en vivo" : "Notificar al equipo para alistarse a recibir su reconocimiento."}
                    </span>
                  </div>
                </div>
                {!schedule.hitZeroAwarded && (
                  <form action={async (formData: FormData) => {
                    const id = formData.get("scheduleId") as string;
                    await toggleHitZeroAwarded(id, true);
                  }}>
                    <input type="hidden" name="scheduleId" value={schedule.id} />
                    <button type="submit" className="bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-[10px] px-3 py-1.5 rounded-lg shadow cursor-pointer shrink-0">
                      Marcar Listo
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Acciones */}
            <div className="mt-4 flex flex-col gap-3">
              {/* Botón de Transición Principal */}
              {transition && (
                <form 
                  action={updateScheduleStatus}
                  onSubmit={(e) => {
                    if (isOutOfOrder) {
                      if (!confirm(confirmMsg)) {
                        e.preventDefault();
                      }
                    }
                  }}
                >
                  <input type="hidden" name="scheduleId" value={schedule.id} />
                  <input type="hidden" name="newStatus" value={transition.next} />
                  <input type="hidden" name="eventId" value={eventId} />
                  <button 
                    type="submit" 
                    className={`w-full py-3 rounded-lg font-bold text-white shadow-lg bg-gradient-to-r ${
                      currentStation === "RUNNER" ? "from-warning to-orange-500 text-black font-extrabold" : transition.color
                    } transition-transform active:scale-95 cursor-pointer`}
                  >
                    {currentStation === "RUNNER" ? "📥 Registrar Llegada Directa" : transition.label}
                  </button>
                </form>
              )}

              {/* Acciones Especiales / Corrección Manual (Solo Supervisor) */}
              {isSupervisor && (
                <div className="border-t border-white/5 pt-3 mt-1">
                  <details className="group">
                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-white select-none list-none flex items-center justify-between">
                      <span>⚙️ Corrección Manual (Incidencias)</span>
                      <span className="transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    
                    <div className="mt-3 bg-black/20 p-3 rounded-lg border border-white/5 space-y-2">
                      <p className="text-[10px] text-gray-400 leading-tight">
                        Fuerza el cambio de estado de este equipo si saltan de turno, se lesionan o regresan.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {allStatuses.map(statusObj => {
                          if (statusObj.value === schedule.status) return null;
                          return (
                            <form key={statusObj.value} action={updateScheduleStatus}>
                              <input type="hidden" name="scheduleId" value={schedule.id} />
                              <input type="hidden" name="newStatus" value={statusObj.value} />
                              <input type="hidden" name="eventId" value={eventId} />
                              <button
                                type="submit"
                                className="w-full text-left text-[11px] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-warning/50 text-gray-300 py-1.5 px-2 rounded truncate transition-all"
                              >
                                → {statusObj.label}
                              </button>
                            </form>
                          );
                        })}
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
