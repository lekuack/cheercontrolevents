"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { calculateScheduleTimes } from "@/lib/scheduleEngine";

// ==========================================
// SESIONES (JORNADAS)
// ==========================================

export async function createEventSession(eventId: string, data: any) {
  const session = await prisma.eventSession.create({
    data: {
      eventId,
      ...data,
    },
  });
  revalidatePath(`/admin/events/${eventId}/sessions`);
  return session;
}

export async function updateEventSession(sessionId: string, data: any) {
  const session = await prisma.eventSession.update({
    where: { id: sessionId },
    data,
  });

  const event = await prisma.event.findUnique({ where: { id: session.eventId } });

  // Si cambian los tiempos base, debemos recalcular todo el cronograma
  const schedules = await prisma.schedule.findMany({
    where: { eventSessionId: sessionId },
    orderBy: { orderIndex: "asc" },
  });

  const updatedSchedules = calculateScheduleTimes(
    session, 
    schedules, 
    event?.warmupZonesCount || 1, 
    event?.springfloorZonesCount || 1,
    event?.registrationZonesCount || 1
  );

  // Guardar en lotes
  await prisma.$transaction(
    updatedSchedules.map((sched) =>
      prisma.schedule.update({
        where: { id: sched.id },
        data: {
          registrationZone: sched.registrationZone,
          warmupZone: sched.warmupZone,
          springfloorZone: sched.springfloorZone,
          scheduledRegistration: sched.scheduledRegistration,
          scheduledWarmup1: sched.scheduledWarmup1,
          scheduledSpringfloor: sched.scheduledSpringfloor,
          scheduledPerformance: sched.scheduledPerformance,
        },
      })
    )
  );

  revalidatePath(`/admin/events/${session.eventId}/sessions`);
  return session;
}

// ==========================================
// ITEMS DEL CRONOGRAMA
// ==========================================

export async function addTeamToSession(sessionId: string, eventId: string, teamId: string) {
  // Obtener el último índice
  const lastItem = await prisma.schedule.findFirst({
    where: { eventSessionId: sessionId },
    orderBy: { orderIndex: "desc" },
  });
  const newOrder = lastItem ? lastItem.orderIndex + 1 : 0;

  await prisma.schedule.create({
    data: {
      eventId,
      eventSessionId: sessionId,
      teamId,
      type: "TEAM",
      orderIndex: newOrder,
    },
  });

  // Recalcular
  await triggerRecalculate(sessionId);
}

export async function addTeamsToSession(sessionId: string, eventId: string, teamIds: string[]) {
  const lastItem = await prisma.schedule.findFirst({
    where: { eventSessionId: sessionId },
    orderBy: { orderIndex: "desc" },
  });
  let nextOrder = lastItem ? lastItem.orderIndex + 1 : 0;

  const data = teamIds.map((teamId) => ({
    eventId,
    eventSessionId: sessionId,
    teamId,
    type: "TEAM",
    orderIndex: nextOrder++,
  }));

  await prisma.schedule.createMany({ data });

  // Recalcular
  await triggerRecalculate(sessionId);
}

export async function addBreakToSession(sessionId: string, eventId: string, title: string, duration: number, showBreakTitle: boolean = true) {
  const lastItem = await prisma.schedule.findFirst({
    where: { eventSessionId: sessionId },
    orderBy: { orderIndex: "desc" },
  });
  const newOrder = lastItem ? lastItem.orderIndex + 1 : 0;

  await prisma.schedule.create({
    data: {
      eventId,
      eventSessionId: sessionId,
      type: "BREAK",
      breakTitle: title,
      showBreakTitle,
      breakDuration: duration,
      orderIndex: newOrder,
    },
  });

  // Recalcular
  await triggerRecalculate(sessionId);
}

export async function removeScheduleItem(scheduleId: string) {
  const item = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    select: { eventSessionId: true },
  });

  if (!item) return;

  await prisma.schedule.deleteMany({
    where: { id: scheduleId },
  });

  if (item.eventSessionId) {
    await triggerRecalculate(item.eventSessionId);
  }
}

export async function clearSessionSchedules(sessionId: string) {
  const session = await prisma.eventSession.findUnique({
    where: { id: sessionId },
    select: { eventId: true },
  });

  if (!session) return;

  await prisma.schedule.deleteMany({
    where: { eventSessionId: sessionId },
  });

  revalidatePath(`/admin/events/${session.eventId}/sessions`);
}

export async function toggleExhibition(scheduleId: string, isExhibition: boolean) {
  const item = await prisma.schedule.update({
    where: { id: scheduleId },
    data: { isExhibition },
  });
  revalidatePath(`/admin/events/${item.eventId}/sessions`);
}

export async function reorderSchedule(sessionId: string, scheduleIds: string[]) {
  // Bulk update no soporta actualizar con valores diferentes fácilmente en SQLite,
  // así que usamos una transacción con múltiples updates.
  await prisma.$transaction(
    scheduleIds.map((id, index) =>
      prisma.schedule.update({
        where: { id },
        data: { orderIndex: index },
      })
    )
  );

  await triggerRecalculate(sessionId);
}

export async function updateEventTeams(eventId: string, teamIds: string[]) {
  // Eliminar relaciones anteriores
  await prisma.eventTeam.deleteMany({
    where: { eventId },
  });

  // Crear las nuevas
  await prisma.eventTeam.createMany({
    data: teamIds.map((teamId) => ({
      eventId,
      teamId,
    })),
  });

  // Eliminar de los schedules cualquier equipo que ya no esté en el evento
  await prisma.schedule.deleteMany({
    where: {
      eventId,
      type: "TEAM",
      teamId: { notIn: teamIds },
    },
  });

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/sessions`);
}

export async function autoSortSessionSchedules(sessionId: string) {
  const schedules = await prisma.schedule.findMany({
    where: { eventSessionId: sessionId },
    include: { team: true },
  });

  const teams = schedules.filter(s => s.type === "TEAM");
  const breaks = schedules.filter(s => s.type === "BREAK");

  // Ordenar los equipos por categoría, división y luego tipo
  teams.sort((a, b) => {
    const catA = a.team?.category || "";
    const catB = b.team?.category || "";
    if (catA !== catB) return catA.localeCompare(catB);

    const divA = a.team?.division || "";
    const divB = b.team?.division || "";
    if (divA !== divB) return divA.localeCompare(divB);

    const levA = a.team?.level || "";
    const levB = b.team?.level || "";
    return levA.localeCompare(levB);
  });

  // Los breaks los mandamos al final
  const sorted = [...teams, ...breaks];

  await prisma.$transaction(
    sorted.map((item, index) =>
      prisma.schedule.update({
        where: { id: item.id },
        data: { orderIndex: index },
      })
    )
  );

  await triggerRecalculate(sessionId);
}

export async function moveDivisionInSession(
  sessionId: string,
  groupField: "division" | "category_division" | "full",
  groupValue: string,
  targetPosition: "START" | "END" | "BEFORE_ITEM" | "AFTER_ITEM",
  targetScheduleId?: string
) {
  const session = await prisma.eventSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  const schedules = await prisma.schedule.findMany({
    where: { eventSessionId: sessionId },
    include: { team: true },
    orderBy: { orderIndex: "asc" },
  });

  const getGroupKey = (s: (typeof schedules)[0]) => {
    if (s.type !== "TEAM" || !s.team) return null;
    if (groupField === "division") return s.team.division;
    if (groupField === "category_division") return `${s.team.category || ""} • ${s.team.division}`;
    return `${s.team.category || ""} • ${s.team.division} • ${s.team.level || ""}`;
  };

  const movingItems = schedules.filter((s) => getGroupKey(s) === groupValue);
  const otherItems = schedules.filter((s) => getGroupKey(s) !== groupValue);

  if (movingItems.length === 0) return;

  let newList: typeof schedules = [];

  if (targetPosition === "START") {
    newList = [...movingItems, ...otherItems];
  } else if (targetPosition === "END") {
    newList = [...otherItems, ...movingItems];
  } else if (targetScheduleId) {
    const targetIdx = otherItems.findIndex((s) => s.id === targetScheduleId);
    if (targetIdx === -1) {
      newList = [...otherItems, ...movingItems];
    } else {
      const insertAt = targetPosition === "BEFORE_ITEM" ? targetIdx : targetIdx + 1;
      newList = [
        ...otherItems.slice(0, insertAt),
        ...movingItems,
        ...otherItems.slice(insertAt),
      ];
    }
  } else {
    newList = [...otherItems, ...movingItems];
  }

  await prisma.$transaction(
    newList.map((item, index) =>
      prisma.schedule.update({
        where: { id: item.id },
        data: { orderIndex: index },
      })
    )
  );

  await triggerRecalculate(sessionId);
}

export type ScheduleSnapshotItem = {
  id: string;
  type: string;
  teamId: string | null;
  breakTitle: string | null;
  showBreakTitle: boolean;
  breakDuration: number | null;
  isExhibition: boolean;
  orderIndex: number;
};

export async function restoreScheduleSnapshot(
  sessionId: string,
  snapshot: ScheduleSnapshotItem[]
) {
  const session = await prisma.eventSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  const eventId = session.eventId;
  const snapshotIds = snapshot.map((s) => s.id);

  // 1. Eliminar ítems que no estén en el snapshot
  await prisma.schedule.deleteMany({
    where: {
      eventSessionId: sessionId,
      id: { notIn: snapshotIds },
    },
  });

  // 2. Crear o actualizar cada ítem del snapshot
  for (const item of snapshot) {
    const existing = await prisma.schedule.findUnique({ where: { id: item.id } });
    if (existing) {
      await prisma.schedule.update({
        where: { id: item.id },
        data: {
          type: item.type,
          teamId: item.teamId,
          breakTitle: item.breakTitle,
          showBreakTitle: item.showBreakTitle,
          breakDuration: item.breakDuration,
          isExhibition: item.isExhibition,
          orderIndex: item.orderIndex,
        },
      });
    } else {
      await prisma.schedule.create({
        data: {
          id: item.id,
          eventId,
          eventSessionId: sessionId,
          type: item.type,
          teamId: item.teamId,
          breakTitle: item.breakTitle,
          showBreakTitle: item.showBreakTitle,
          breakDuration: item.breakDuration,
          isExhibition: item.isExhibition,
          orderIndex: item.orderIndex,
        },
      });
    }
  }

  // 3. Recalcular horarios
  await triggerRecalculate(sessionId);
}

/**
 * Función interna para forzar el recálculo
 */
async function triggerRecalculate(sessionId: string) {
  const session = await prisma.eventSession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  const event = await prisma.event.findUnique({ where: { id: session.eventId } });

  const schedules = await prisma.schedule.findMany({
    where: { eventSessionId: sessionId },
    orderBy: { orderIndex: "asc" },
  });

  const updatedSchedules = calculateScheduleTimes(
    session, 
    schedules,
    event?.warmupZonesCount || 1,
    event?.springfloorZonesCount || 1,
    event?.registrationZonesCount || 1
  );

  await prisma.$transaction(
    updatedSchedules.map((sched) =>
      prisma.schedule.update({
        where: { id: sched.id },
        data: {
          registrationZone: sched.registrationZone,
          warmupZone: sched.warmupZone,
          springfloorZone: sched.springfloorZone,
          scheduledRegistration: sched.scheduledRegistration,
          scheduledWarmup1: sched.scheduledWarmup1,
          scheduledSpringfloor: sched.scheduledSpringfloor,
          scheduledPerformance: sched.scheduledPerformance,
        },
      })
    )
  );

  revalidatePath(`/admin/events/${session.eventId}/sessions`);
}
