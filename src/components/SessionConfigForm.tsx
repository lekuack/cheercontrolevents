"use client";

import { useState } from "react";
import { EventSession } from "@prisma/client";
import { updateEventSession } from "@/app/admin/schedule-actions";

interface SessionConfigFormProps {
  session: EventSession;
  warmupZonesCount?: number;
  springfloorZonesCount?: number;
  registrationZonesCount?: number;
}

export default function SessionConfigForm({ session, warmupZonesCount = 1, springfloorZonesCount = 1, registrationZonesCount = 1 }: SessionConfigFormProps) {
  const [name, setName] = useState(session.name);
  const [registrationDuration, setRegistrationDuration] = useState(session.registrationDuration);
  const [warmup1Duration, setWarmup1Duration] = useState(session.warmup1Duration);
  const [springfloorDuration, setSpringfloorDuration] = useState(session.springfloorDuration);
  const [competitionDuration, setCompetitionDuration] = useState(session.competitionDuration);
  const [staffCallTimeOffset, setStaffCallTimeOffset] = useState(session.staffCallTimeOffset);

  // Time States
  const formatToTimeInput = (d: Date | null) => {
    if (!d) return "09:00";
    const date = new Date(d);
    const hrs = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    return `${hrs}:${mins}`;
  };

  const zoneLetters = ["A", "B", "C", "D", "E"];

  let initialCustomTimes: { registration?: Record<string, string>; warmup1?: Record<string, string>; springfloor?: Record<string, string> } = {};
  if (session.zoneStartTimesJson) {
    try { initialCustomTimes = JSON.parse(session.zoneStartTimesJson); } catch (e) {}
  }

  const [competitionStartTime, setCompetitionStartTime] = useState(formatToTimeInput(session.competitionStartTime));

  const [registrationZoneTimes, setRegistrationZoneTimes] = useState<Record<string, string>>(() => {
    const res = { ...initialCustomTimes.registration };
    const baseStr = formatToTimeInput(session.registrationStartTime);
    for (let i = 0; i < (registrationZonesCount || 1); i++) {
      const letter = zoneLetters[i];
      if (!res[letter]) res[letter] = baseStr;
    }
    return res;
  });

  const [warmupZoneTimes, setWarmupZoneTimes] = useState<Record<string, string>>(() => {
    const res = { ...initialCustomTimes.warmup1 };
    const baseStr = formatToTimeInput(session.warmup1StartTime);
    for (let i = 0; i < (warmupZonesCount || 1); i++) {
      const letter = zoneLetters[i];
      if (!res[letter]) res[letter] = baseStr;
    }
    return res;
  });

  const [springfloorZoneTimes, setSpringfloorZoneTimes] = useState<Record<string, string>>(() => {
    const res = { ...initialCustomTimes.springfloor };
    const baseStr = formatToTimeInput(session.springfloorStartTime);
    for (let i = 0; i < (springfloorZonesCount || 1); i++) {
      const letter = zoneLetters[i];
      if (!res[letter]) res[letter] = baseStr;
    }
    return res;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const parseTime = (timeStr: string): Date => {
    const [hrs, mins] = timeStr.split(":").map(Number);
    const d = new Date(session.date || new Date());
    d.setHours(hrs, mins, 0, 0);
    return d;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const regDate = parseTime(registrationZoneTimes["A"] || "09:00");
    const w1Date = parseTime(warmupZoneTimes["A"] || "09:00");
    const sfDate = parseTime(springfloorZoneTimes["A"] || "09:00");
    const compDate = parseTime(competitionStartTime);

    const zoneStartTimesJson = JSON.stringify({
      registration: registrationZoneTimes,
      warmup1: warmupZoneTimes,
      springfloor: springfloorZoneTimes
    });

    try {
      await updateEventSession(session.id, {
        name,
        registrationDuration: Number(registrationDuration),
        warmup1Duration: Number(warmup1Duration),
        springfloorDuration: Number(springfloorDuration),
        competitionDuration: Number(competitionDuration),
        staffCallTimeOffset: Number(staffCallTimeOffset),
        registrationStartTime: regDate,
        warmup1StartTime: w1Date,
        springfloorStartTime: sfDate,
        competitionStartTime: compDate,
        zoneStartTimesJson
      });
      alert("Configuración de horas por zona guardada correctamente.");
      setIsOpen(false);
    } catch (e) {
      alert("Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border border-white/10 rounded-xl bg-white/5 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex justify-between items-center text-white font-bold hover:bg-white/5 transition"
      >
        <span>⚙️ Configuración de Horas y Tiempos de Zonas</span>
        <span>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <form onSubmit={handleSave} className="p-6 border-t border-white/10 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nombre de la Jornada</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-[#1e293b] border border-white/10 rounded px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 pt-4">
            {/* Registro */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-primary uppercase">Registro</h4>
              {Array.from({ length: registrationZonesCount || 1 }).map((_, i) => {
                const letter = zoneLetters[i];
                return (
                  <div key={`reg-${letter}`}>
                    <label className="block text-[10px] text-gray-500">Inicio Mesa {letter}</label>
                    <input
                      type="time"
                      value={registrationZoneTimes[letter] || "09:00"}
                      onChange={e => setRegistrationZoneTimes(prev => ({ ...prev, [letter]: e.target.value }))}
                      required
                      className="w-full bg-[#1e293b] border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                );
              })}
              <div>
                <label className="block text-[10px] text-gray-500">Duración (min)</label>
                <input
                  type="number"
                  value={registrationDuration}
                  onChange={e => setRegistrationDuration(Number(e.target.value))}
                  required
                  className="w-full bg-[#1e293b] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Calentamiento 1 */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-accent uppercase">Calentamiento 1</h4>
              {Array.from({ length: warmupZonesCount || 1 }).map((_, i) => {
                const letter = zoneLetters[i];
                return (
                  <div key={`w1-${letter}`}>
                    <label className="block text-[10px] text-gray-500">Inicio Zona {letter}</label>
                    <input
                      type="time"
                      value={warmupZoneTimes[letter] || "09:00"}
                      onChange={e => setWarmupZoneTimes(prev => ({ ...prev, [letter]: e.target.value }))}
                      required
                      className="w-full bg-[#1e293b] border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                );
              })}
              <div>
                <label className="block text-[10px] text-gray-500">Duración (min)</label>
                <input
                  type="number"
                  value={warmup1Duration}
                  onChange={e => setWarmup1Duration(Number(e.target.value))}
                  required
                  className="w-full bg-[#1e293b] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Calentamiento 2 (Springfloor) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-pink-400 uppercase">Springfloor</h4>
              {Array.from({ length: springfloorZonesCount || 1 }).map((_, i) => {
                const letter = zoneLetters[i];
                return (
                  <div key={`sf-${letter}`}>
                    <label className="block text-[10px] text-gray-500">Inicio Zona {letter}</label>
                    <input
                      type="time"
                      value={springfloorZoneTimes[letter] || "09:00"}
                      onChange={e => setSpringfloorZoneTimes(prev => ({ ...prev, [letter]: e.target.value }))}
                      required
                      className="w-full bg-[#1e293b] border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                );
              })}
              <div>
                <label className="block text-[10px] text-gray-500">Duración (min)</label>
                <input
                  type="number"
                  value={springfloorDuration}
                  onChange={e => setSpringfloorDuration(Number(e.target.value))}
                  required
                  className="w-full bg-[#1e293b] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Competencia */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-warning uppercase">Competencia</h4>
              <div>
                <label className="block text-[10px] text-gray-500">Hora de Inicio</label>
                <input
                  type="time"
                  value={competitionStartTime}
                  onChange={e => setCompetitionStartTime(e.target.value)}
                  required
                  className="w-full bg-[#1e293b] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500">Duración (min)</label>
                <input
                  type="number"
                  value={competitionDuration}
                  onChange={e => setCompetitionDuration(Number(e.target.value))}
                  required
                  className="w-full bg-[#1e293b] border border-white/10 rounded px-2 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Buscar Equipos (Staff Call Offset - minutos antes)</label>
              <input
                type="number"
                value={staffCallTimeOffset}
                onChange={e => setStaffCallTimeOffset(Number(e.target.value))}
                required
                min="0"
                className="w-full bg-[#1e293b] border border-white/10 rounded px-3 py-2 text-sm text-white"
              />
              <span className="text-[10px] text-gray-500">Tiempo en minutos que el staff irá a buscar a los equipos antes de su registro.</span>
            </div>
            <div className="flex items-end justify-end">
              <button 
                type="submit" 
                disabled={isSaving}
                className="btn-primary px-6 py-2 rounded-lg text-sm font-bold w-full sm:w-auto"
              >
                {isSaving ? "Guardando..." : "Guardar Configuración"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
