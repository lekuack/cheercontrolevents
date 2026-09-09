import { EventSession, Schedule } from "@prisma/client";

/**
 * Recalcula y actualiza los tiempos programados de un array de Schedule items
 * en base a la configuración de su EventSession.
 * 
 * Los items deben venir ordenados por `orderIndex`.
 */
export function calculateScheduleTimes(
  session: EventSession,
  items: Schedule[],
  warmupZonesCount: number = 1,
  springfloorZonesCount: number = 1,
  registrationZonesCount: number = 1
): Schedule[] {
  let teamSlot = 0;
  let accumulatedBreakTime = 0;
  const zoneLetters = ["A", "B", "C", "D", "E"];

  // Parsear horas de inicio personalizadas por zona
  let customZoneTimes: { registration?: Record<string, string>; warmup1?: Record<string, string>; springfloor?: Record<string, string> } = {};
  if (session.zoneStartTimesJson) {
    try {
      customZoneTimes = JSON.parse(session.zoneStartTimesJson);
    } catch (e) {}
  }

  // Contadores de slot individuales por cada zona
  const registrationSlots: Record<string, number> = {};
  const warmupSlots: Record<string, number> = {};
  const springfloorSlots: Record<string, number> = {};

  const parseCustomTime = (timeStr?: string): Date | null => {
    if (!timeStr) return null;
    const [hrs, mins] = timeStr.split(":").map(Number);
    const d = new Date(session.date || new Date());
    d.setHours(hrs, mins, 0, 0);
    return d;
  };

  return items.map((item) => {
    if (item.type === "BREAK") {
      // Un Break ocurre a la hora de la competencia y retrasa a los equipos siguientes
      const scheduledPerformance = session.competitionStartTime
        ? addMinutes(session.competitionStartTime, teamSlot * session.competitionDuration + accumulatedBreakTime)
        : null;

      accumulatedBreakTime += item.breakDuration || 0;

      return {
        ...item,
        scheduledRegistration: null,
        scheduledWarmup1: null,
        scheduledSpringfloor: null,
        scheduledPerformance,
      };
    } else {
      // Es un TEAM
      const registrationZone = zoneLetters[teamSlot % (registrationZonesCount || 1)] || "A";
      const warmupZone = zoneLetters[teamSlot % (warmupZonesCount || 1)] || "A";
      const springfloorZone = zoneLetters[teamSlot % (springfloorZonesCount || 1)] || "A";

      // Obtener el slot de la zona correspondiente
      const regSlot = registrationSlots[registrationZone] || 0;
      registrationSlots[registrationZone] = regSlot + 1;

      const wSlot = warmupSlots[warmupZone] || 0;
      warmupSlots[warmupZone] = wSlot + 1;

      const sfSlot = springfloorSlots[springfloorZone] || 0;
      springfloorSlots[springfloorZone] = sfSlot + 1;

      // Hora base para cada zona
      const customRegBase = parseCustomTime(customZoneTimes.registration?.[registrationZone]);
      const regBaseDate = customRegBase || session.registrationStartTime;

      const customW1Base = parseCustomTime(customZoneTimes.warmup1?.[warmupZone]);
      const w1BaseDate = customW1Base || session.warmup1StartTime;

      const customSfBase = parseCustomTime(customZoneTimes.springfloor?.[springfloorZone]);
      const sfBaseDate = customSfBase || session.springfloorStartTime;

      const scheduledRegistration = regBaseDate
        ? addMinutes(regBaseDate, regSlot * session.registrationDuration)
        : null;
        
      const scheduledWarmup1 = w1BaseDate
        ? addMinutes(w1BaseDate, wSlot * session.warmup1Duration)
        : null;

      const scheduledSpringfloor = sfBaseDate
        ? addMinutes(sfBaseDate, sfSlot * session.springfloorDuration)
        : null;

      // La presentación se ve afectada por los breaks anteriores
      const scheduledPerformance = session.competitionStartTime
        ? addMinutes(session.competitionStartTime, teamSlot * session.competitionDuration + accumulatedBreakTime)
        : null;

      teamSlot++;

      return {
        ...item,
        registrationZone,
        warmupZone,
        springfloorZone,
        scheduledRegistration,
        scheduledWarmup1,
        scheduledSpringfloor,
        scheduledPerformance,
      };
    }
  });
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}
