"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function createEvent(formData: FormData) {
  const name = formData.get("name") as string;
  const date = formData.get("date") as string;
  const logoUrl = formData.get("logoUrl") as string;
  const producerId = formData.get("producerId") as string;
  const registrationZonesCount = parseInt(formData.get("registrationZonesCount") as string || "1", 10);
  const warmupZonesCount = parseInt(formData.get("warmupZonesCount") as string || "1", 10);
  const springfloorZonesCount = parseInt(formData.get("springfloorZonesCount") as string || "1", 10);
  const forceSameZone = formData.get("forceSameZone") === "on" || formData.get("forceSameZone") === "true";

  if (!name || !date || !producerId) return;

  await prisma.event.create({
    data: {
      name,
      date: new Date(date + "T12:00:00Z"),
      logoUrl: logoUrl || null,
      registrationZonesCount,
      warmupZonesCount,
      springfloorZonesCount,
      forceSameZone,
      producerId: producerId
    }
  });

  revalidatePath("/admin");
}

export async function generateTestData(formData: FormData) {
  const producerId = formData.get("producerId") as string;
  const eventId = formData.get("eventId") as string;

  if (!producerId || !eventId) return;

  // Crear Institución
  const inst = await prisma.institution.create({
    data: { name: "All Star Club Test", city: "Santiago", producerId: producerId }
  });

  const teamsData = [
    { name: "Titans Alpha", coach: "Claudio Fuentes", phone: "+56912345678", wZone: "A", sZone: "A" },
    { name: "Titans Bravo", coach: "Camila Rivas", phone: "+56987654321", wZone: "B", sZone: "B" },
    { name: "Titans Charlie", coach: "Matías Soto", phone: "+56955554444", wZone: "A", sZone: "A" },
    { name: "Titans Delta", coach: "Sofía Vergara", phone: "+56999998888", wZone: "B", sZone: "B" },
  ];

  const now = new Date();
  for (let i = 0; i < teamsData.length; i++) {
    const t = teamsData[i];
    const team = await prisma.team.create({
      data: { 
        name: t.name, 
        division: "All Girl", 
        category: "Elite", 
        level: "Nivel 4", 
        athletesCount: 15 + i * 2, 
        coach: t.coach, 
        coachPhone: t.phone, 
        institutionId: inst.id 
      }
    });

    await prisma.schedule.create({
      data: {
        eventId: eventId,
        teamId: team.id,
        orderIndex: i + 1,
        scheduledRegistration: new Date(now.getTime() + (10 + i * 15) * 60000), 
        scheduledWarmup1: new Date(now.getTime() + (30 + i * 15) * 60000),
        scheduledSpringfloor: new Date(now.getTime() + (45 + i * 15) * 60000),
        scheduledPerformance: new Date(now.getTime() + (60 + i * 15) * 60000),
        warmupZone: t.wZone,
        springfloorZone: t.sZone,
      }
    });
  }

  revalidatePath("/admin");
}

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string || "STAFF";
  const stations = formData.getAll("stations") as string[];
  const isSupervisor = formData.get("isSupervisor") === "on";
  const producerId = formData.get("producerId") as string;
  const phone = formData.get("phone") as string;

  if (!name || !email || !producerId) return;

  await prisma.user.create({
    data: {
      name,
      email,
      role,
      station: stations.length > 0 ? stations.join(",") : null,
      isSupervisor,
      producerId,
      phone: phone || null,
      isActive: false
    }
  });

  revalidatePath("/admin/staff");
}

export async function updateScheduleStatus(formData: FormData) {
  const scheduleId = formData.get("scheduleId") as string;
  const newStatus = formData.get("newStatus") as string;
  const eventId = formData.get("eventId") as string;

  if (!scheduleId || !newStatus || !eventId) return;

  const currentSchedule = await prisma.schedule.findUnique({
    where: { id: scheduleId }
  });

  if (!currentSchedule) return;

  // Si el nuevo estado es COMPETING, reseteamos judgesReady a false en la BD
  if (newStatus === "COMPETING") {
    await prisma.event.update({
      where: { id: eventId },
      data: { judgesReady: false }
    });
  }

  // Lógica de retrasos en cascada
  const now = new Date();
  let delayMinutes = 0;

  if (newStatus === "WARMING_UP" && currentSchedule.scheduledWarmup1) {
    const diffMs = now.getTime() - new Date(currentSchedule.scheduledWarmup1).getTime();
    delayMinutes = Math.floor(diffMs / 60000);
  } else if (newStatus === "WARMING_UP_SPRINGFLOOR" && currentSchedule.scheduledSpringfloor) {
    const diffMs = now.getTime() - new Date(currentSchedule.scheduledSpringfloor).getTime();
    delayMinutes = Math.floor(diffMs / 60000);
  } else if (newStatus === "COMPETING" && currentSchedule.scheduledPerformance) {
    const diffMs = now.getTime() - new Date(currentSchedule.scheduledPerformance).getTime();
    delayMinutes = Math.floor(diffMs / 60000);
  }

  // Si hay un retraso real (mayor a 1 minuto para evitar micro-diferencias)
  if (delayMinutes > 0) {
    console.log(`[CASCADA] Retraso detectado: ${delayMinutes} min para el equipo actual en estado ${newStatus}. Ajustando cronograma...`);

    // A. Desplazar los horarios restantes del equipo actual
    const currentUpdates: any = {};
    if (newStatus === "WARMING_UP") {
      if (currentSchedule.scheduledSpringfloor) {
        currentUpdates.scheduledSpringfloor = new Date(new Date(currentSchedule.scheduledSpringfloor).getTime() + delayMinutes * 60000);
      }
      if (currentSchedule.scheduledPerformance) {
        currentUpdates.scheduledPerformance = new Date(new Date(currentSchedule.scheduledPerformance).getTime() + delayMinutes * 60000);
      }
    } else if (newStatus === "WARMING_UP_SPRINGFLOOR") {
      if (currentSchedule.scheduledPerformance) {
        currentUpdates.scheduledPerformance = new Date(new Date(currentSchedule.scheduledPerformance).getTime() + delayMinutes * 60000);
      }
    }

    if (Object.keys(currentUpdates).length > 0) {
      await prisma.schedule.update({
        where: { id: scheduleId },
        data: currentUpdates
      });
    }

    // B. Desplazar los horarios de todos los equipos posteriores que no hayan finalizado
    const futureSchedules = await prisma.schedule.findMany({
      where: {
        eventId: eventId,
        orderIndex: { gt: currentSchedule.orderIndex },
        status: { not: "FINISHED" }
      }
    });

    for (const fs of futureSchedules) {
      const fsUpdates: any = {};
      if (fs.scheduledRegistration) fsUpdates.scheduledRegistration = new Date(new Date(fs.scheduledRegistration).getTime() + delayMinutes * 60000);
      if (fs.scheduledWarmup1) fsUpdates.scheduledWarmup1 = new Date(new Date(fs.scheduledWarmup1).getTime() + delayMinutes * 60000);
      if (fs.scheduledSpringfloor) fsUpdates.scheduledSpringfloor = new Date(new Date(fs.scheduledSpringfloor).getTime() + delayMinutes * 60000);
      if (fs.scheduledPerformance) fsUpdates.scheduledPerformance = new Date(new Date(fs.scheduledPerformance).getTime() + delayMinutes * 60000);

      if (Object.keys(fsUpdates).length > 0) {
        await prisma.schedule.update({
          where: { id: fs.id },
          data: fsUpdates
        });
      }
    }
    console.log(`[CASCADA] Se re-programaron ${futureSchedules.length} presentaciones futuras desplazadas por ${delayMinutes} min.`);
  }

  // Mapear los campos de marcas temporales reales correspondientes para el equipo actual
  const updateData: any = { status: newStatus };
  if (newStatus === "IN_REGISTRATION") {
    updateData.actualRegistration = now;
  } else if (newStatus === "WARMING_UP") {
    updateData.actualWarmup1 = now;
  } else if (newStatus === "WARMING_UP_SPRINGFLOOR") {
    updateData.actualSpringfloor = now;
  } else if (newStatus === "COMPETING") {
    updateData.actualPerformance = now;
  }

  await prisma.schedule.update({
    where: { id: scheduleId },
    data: updateData
  });

  // Emitir actualización por WebSocket en tiempo real
  const io = (global as any).io;
  if (io) {
    io.to(eventId).emit("status-changed", {
      eventId,
      scheduleId,
      status: newStatus
    });
    console.log(`[WS] Status-changed emitted: Event ${eventId}, Schedule ${scheduleId} -> ${newStatus}`);
  }

  revalidatePath(`/staff/${eventId}`);
  revalidatePath(`/judge/${eventId}`);
  revalidatePath(`/announcer/${eventId}`);
}

export async function setJudgesReadyStatus(eventId: string, ready: boolean) {
  const user = await getSessionUser();
  const isAllowed =
    user &&
    (user.role === "JUDGE" ||
      user.role === "SUPER_ADMIN" ||
      user.role === "PRODUCER_ADMIN" ||
      user.isSupervisor);

  if (!isAllowed) {
    throw new Error("No tienes permisos para modificar el estado de la mesa de jueces.");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { judgesReady: ready }
  });

  // Emitir evento por socket si los jueces están listos
  const io = (global as any).io;
  if (io) {
    io.to(eventId).emit("status-changed", { eventId }); // También emitir status change para actualizar vistas
    if (ready) {
      io.to(eventId).emit("announcer-alert", { eventId, timestamp: new Date().toISOString() });
      console.log(`[WS] Announcer-alert emitted for Event ${eventId}`);
    }
  }

  revalidatePath(`/judge/${eventId}`);
  revalidatePath(`/announcer/${eventId}`);
}

export async function updateCoachPhone(formData: FormData) {
  const teamId = formData.get("teamId") as string;
  const phone = formData.get("phone") as string;
  const eventId = formData.get("eventId") as string;

  if (!teamId || !phone || !eventId) return;

  await prisma.team.update({
    where: { id: teamId },
    data: { coachPhone: phone }
  });

  revalidatePath(`/staff/${eventId}`);
}

export async function updateScheduleZones(formData: FormData) {
  const scheduleId = formData.get("scheduleId") as string;
  const warmupZone = formData.get("warmupZone") as string;
  const springfloorZone = formData.get("springfloorZone") as string;
  const eventId = formData.get("eventId") as string;

  if (!scheduleId || !eventId) return;

  const data: any = {};
  if (warmupZone !== null && warmupZone !== undefined) data.warmupZone = warmupZone;
  if (springfloorZone !== null && springfloorZone !== undefined) data.springfloorZone = springfloorZone;

  await prisma.schedule.update({
    where: { id: scheduleId },
    data
  });

  // Emitir por WS para refrescar las pantallas en tiempo real
  const io = (global as any).io;
  if (io) {
    io.to(eventId).emit("status-changed", { eventId });
  }

  revalidatePath(`/staff/${eventId}`);
}

export async function updateAdminScheduleTeam(formData: FormData) {
  const scheduleId = formData.get("scheduleId") as string;
  const teamId = formData.get("teamId") as string;
  const coach = formData.get("coach") as string;
  const coachPhone = formData.get("coachPhone") as string;
  const warmupZone = formData.get("warmupZone") as string;
  const springfloorZone = formData.get("springfloorZone") as string;
  const eventId = formData.get("eventId") as string;

  if (!scheduleId || !teamId || !eventId) return;

  await prisma.team.update({
    where: { id: teamId },
    data: { coach, coachPhone }
  });

  await prisma.schedule.update({
    where: { id: scheduleId },
    data: { warmupZone, springfloorZone }
  });

  // Emitir por WS para refrescar las pantallas en tiempo real
  const io = (global as any).io;
  if (io) {
    io.to(eventId).emit("status-changed", { eventId });
  }

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/staff/${eventId}`);
}

export async function updateEvent(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  const name = formData.get("name") as string;
  const dateStr = formData.get("date") as string;
  const logoUrl = formData.get("logoUrl") as string;
  const registrationZonesCount = parseInt(formData.get("registrationZonesCount") as string || "1", 10);
  const warmupZonesCount = parseInt(formData.get("warmupZonesCount") as string || "1", 10);
  const springfloorZonesCount = parseInt(formData.get("springfloorZonesCount") as string || "1", 10);
  const forceSameZone = formData.get("forceSameZone") === "on" || formData.get("forceSameZone") === "true";



  if (!eventId || !name || !dateStr) return;

  await prisma.event.update({
    where: { id: eventId },
    data: {
      name,
      date: new Date(dateStr + "T12:00:00Z"),
      logoUrl: logoUrl || null,
      registrationZonesCount,
      warmupZonesCount,
      springfloorZonesCount,
      forceSameZone,
    }
  });

  revalidatePath("/admin");
  revalidatePath(`/p`); // Revalidar la vista de producción para que refresque la UI
}

export async function updateEventCustomization(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  if (!eventId) return;

  const pageBgColor = formData.get("pageBgColor") as string;
  const pageBgGradientFrom = formData.get("pageBgGradientFrom") as string;
  const pageBgGradientVia = formData.get("pageBgGradientVia") as string;
  const pageBgGradientTo = formData.get("pageBgGradientTo") as string;

  const posterBgColorFrom = formData.get("posterBgColorFrom") as string;
  const posterBgColorVia = formData.get("posterBgColorVia") as string;
  const posterBgColorTo = formData.get("posterBgColorTo") as string;
  const posterTextColor1 = formData.get("posterTextColor1") as string;
  const posterTextColor2 = formData.get("posterTextColor2") as string;
  const posterTextColor3 = formData.get("posterTextColor3") as string;

  const fontFamily = formData.get("fontFamily") as string;
  const titleColor = formData.get("titleColor") as string;
  const titleFontSize = formData.get("titleFontSize") as string;

  const tableHeaderBgColor = formData.get("tableHeaderBgColor") as string;
  const tableHeaderTextColor = formData.get("tableHeaderTextColor") as string;
  const tableRowBgColor = formData.get("tableRowBgColor") as string;
  const tableRowHoverBgColor = formData.get("tableRowHoverBgColor") as string;
  const tableRowTextColor = formData.get("tableRowTextColor") as string;

  await prisma.event.update({
    where: { id: eventId },
    data: {
      pageBgColor: pageBgColor || "#050b18",
      pageBgGradientFrom: pageBgGradientFrom || null,
      pageBgGradientVia: pageBgGradientVia || null,
      pageBgGradientTo: pageBgGradientTo || null,

      posterBgColorFrom: posterBgColorFrom || "#09101f",
      posterBgColorVia: posterBgColorVia || "#080d1a",
      posterBgColorTo: posterBgColorTo || "#050b18",
      posterTextColor1: posterTextColor1 || "#ffffff",
      posterTextColor2: posterTextColor2 || "#e2e8f0",
      posterTextColor3: posterTextColor3 || "#94a3b8",

      fontFamily: fontFamily || "Inter",
      titleColor: titleColor || "#ffffff",
      titleFontSize: titleFontSize || "2xl",

      tableHeaderBgColor: tableHeaderBgColor || "rgba(255, 255, 255, 0.05)",
      tableHeaderTextColor: tableHeaderTextColor || "#9ca3af",
      tableRowBgColor: tableRowBgColor || "transparent",
      tableRowHoverBgColor: tableRowHoverBgColor || "rgba(255, 255, 255, 0.03)",
      tableRowTextColor: tableRowTextColor || "#ffffff",
    }
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/events/${eventId}/customization`);
  revalidatePath(`/p`); // Revalidar la vista de producción para que refresque la UI
}

export async function deleteEvent(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  if (!eventId) return;

  // Eliminar schedules y dependencias asociadas
  await prisma.schedule.deleteMany({
    where: { eventId }
  });

  await prisma.event.delete({
    where: { id: eventId }
  });

  revalidatePath("/admin");
}

export async function resetEventState(eventId: string) {
  if (!eventId) return;

  // 1. Reiniciar todos los elementos del cronograma a PENDING y borrar marcas reales de tiempo
  await prisma.schedule.updateMany({
    where: { eventId },
    data: {
      status: "PENDING",
      actualRegistration: null,
      actualWarmup1: null,
      actualSpringfloor: null,
      actualPerformance: null,
    }
  });

  // 2. Reiniciar estados de listos y alertas del Evento
  await prisma.event.update({
    where: { id: eventId },
    data: {
      judgesReady: false,
      globalAlert: null,
      globalAlertAt: null
    }
  });

  // 3. Emitir por WS para notificar el reinicio y refrescar las pantallas del staff
  const io = (global as any).io;
  if (io) {
    io.to(eventId).emit("status-changed", { eventId });
    console.log(`[WS] Event ${eventId} was fully reset (all statuses set to PENDING).`);
  }

  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/staff/${eventId}`);
  revalidatePath(`/judge/${eventId}`);
  revalidatePath(`/announcer/${eventId}`);
}

export async function updateUser(formData: FormData) {
  const userId = formData.get("userId") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const stations = formData.getAll("stations") as string[];
  const isSupervisor = formData.get("isSupervisor") === "on";

  if (!userId || !name || !email) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      station: stations.join(","),
      isSupervisor
    }
  });

  revalidatePath("/admin/staff");
}

export async function deleteUser(formData: FormData) {
  const userId = formData.get("userId") as string;
  if (!userId) return;

  await prisma.user.delete({
    where: { id: userId }
  });

  revalidatePath("/admin/staff");
}

// === ACCIONES DE SUPERVISOR ===

export async function setGlobalAlert(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  const message = formData.get("message") as string;
  if (!eventId || !message?.trim()) return;

  await prisma.event.update({
    where: { id: eventId },
    data: {
      globalAlert: message.trim(),
      globalAlertAt: new Date()
    }
  });

  revalidatePath(`/staff/${eventId}`);
  revalidatePath(`/admin`);
}

export async function clearGlobalAlert(formData: FormData) {
  const eventId = formData.get("eventId") as string;
  if (!eventId) return;

  await prisma.event.update({
    where: { id: eventId },
    data: { globalAlert: null, globalAlertAt: null }
  });

  revalidatePath(`/staff/${eventId}`);
  revalidatePath(`/admin`);
}

export async function supervisorMoveTeam(formData: FormData) {
  const scheduleId = formData.get("scheduleId") as string;
  const newStatus = formData.get("newStatus") as string;
  const warmupZone = formData.get("warmupZone") as string | null;
  const springfloorZone = formData.get("springfloorZone") as string | null;
  const orderIndexRaw = formData.get("orderIndex") as string | null;
  const eventId = formData.get("eventId") as string;

  if (!scheduleId || !eventId) return;

  const updateData: Record<string, string | number | Date | null> = {};
  if (newStatus) updateData.status = newStatus;
  if (warmupZone) updateData.warmupZone = warmupZone;
  if (springfloorZone) updateData.springfloorZone = springfloorZone;
  if (orderIndexRaw && !isNaN(parseInt(orderIndexRaw))) {
    updateData.orderIndex = parseInt(orderIndexRaw);
  }

  // Registrar tiempo real si aplica
  const now = new Date();
  if (newStatus === "IN_REGISTRATION") updateData.actualRegistration = now;
  if (newStatus === "ARRIVED_WARMUP" || newStatus === "WARMING_UP") updateData.actualWarmup1 = now;
  if (newStatus === "ARRIVED_SPRINGFLOOR" || newStatus === "WARMING_UP_SPRINGFLOOR") updateData.actualSpringfloor = now;
  if (newStatus === "COMPETING") updateData.actualPerformance = now;

  await prisma.schedule.update({
    where: { id: scheduleId },
    data: updateData
  });

  revalidatePath(`/staff/${eventId}`);
  revalidatePath(`/admin`);
}

// === ACCIONES DE CLUBES / INSTITUCIONES ===

export async function createInstitution(formData: FormData) {
  const name = formData.get("name") as string;
  const city = formData.get("city") as string;
  const logoUrl = formData.get("logoUrl") as string;
  const headCoach = formData.get("headCoach") as string;
  const headCoachPhone = formData.get("headCoachPhone") as string;
  const type = formData.get("type") as string;
  const producerId = formData.get("producerId") as string;
  if (!name || !producerId) return;

  await prisma.institution.create({
    data: { name, city: city || null, logoUrl: logoUrl || null, headCoach: headCoach || null, headCoachPhone: headCoachPhone || null, type: type || "All Stars", producerId }
  });
  revalidatePath("/admin/institutions");
}

export async function updateInstitution(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const city = formData.get("city") as string;
  const logoUrl = formData.get("logoUrl") as string;
  const headCoach = formData.get("headCoach") as string;
  const headCoachPhone = formData.get("headCoachPhone") as string;
  const type = formData.get("type") as string;
  if (!id || !name) return;

  await prisma.institution.update({
    where: { id },
    data: { name, city: city || null, logoUrl: logoUrl || null, headCoach: headCoach || null, headCoachPhone: headCoachPhone || null, type: type || "All Stars" }
  });
  revalidatePath("/admin/institutions");
}

export async function deleteInstitution(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.team.deleteMany({ where: { institutionId: id } });
  await prisma.institution.delete({ where: { id } });
  revalidatePath("/admin/institutions");
}

// === ACCIONES DE EQUIPOS ===

export async function createTeam(formData: FormData) {
  const name = formData.get("name") as string;
  const division = formData.get("division") as string;
  const category = formData.get("category") as string;
  const level = formData.get("level") as string;
  const athletesCount = parseInt(formData.get("athletesCount") as string || "0", 10);
  const coach = formData.get("coach") as string;
  const coachPhone = formData.get("coachPhone") as string;
  const institutionId = formData.get("institutionId") as string;
  if (!name || !institutionId) return;

  await prisma.team.create({
    data: {
      name,
      division: division || "",
      category: category || "",
      level: level || "",
      athletesCount: isNaN(athletesCount) ? 0 : athletesCount,
      coach: coach || null,
      coachPhone: coachPhone || null,
      institutionId
    }
  });
  revalidatePath("/admin/institutions");
}

export async function updateTeam(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const division = formData.get("division") as string;
  const category = formData.get("category") as string;
  const level = formData.get("level") as string;
  const athletesCount = parseInt(formData.get("athletesCount") as string || "0", 10);
  const coach = formData.get("coach") as string;
  const coachPhone = formData.get("coachPhone") as string;
  if (!id || !name) return;

  await prisma.team.update({
    where: { id },
    data: {
      name,
      division: division || "",
      category: category || "",
      level: level || "",
      athletesCount: isNaN(athletesCount) ? 0 : athletesCount,
      coach: coach || null,
      coachPhone: coachPhone || null,
    }
  });
  revalidatePath("/admin/institutions");
}

export async function deleteTeam(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.team.delete({ where: { id } });
  revalidatePath("/admin/institutions");
}

export async function moveTeamToInstitution(formData: FormData) {
  const teamId = formData.get("teamId") as string;
  const targetInstitutionId = formData.get("targetInstitutionId") as string;
  if (!teamId || !targetInstitutionId) return;

  await prisma.team.update({
    where: { id: teamId },
    data: { institutionId: targetInstitutionId }
  });
  revalidatePath("/admin/institutions");
}

export async function activateUser(userId: string, durationDays: number = 1) {
  if (!userId) return;
  const password = Math.floor(10000 + Math.random() * 90000).toString();
  const passwordExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: true,
      password,
      passwordExpiresAt
    }
  });

  revalidatePath("/admin/staff");
}

export async function deactivateUser(userId: string) {
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      password: null,
      passwordExpiresAt: null
    }
  });

  revalidatePath("/admin/staff");
}

export async function resetUserPassword(userId: string, durationDays: number = 1) {
  if (!userId) return;
  const password = Math.floor(10000 + Math.random() * 90000).toString();
  const passwordExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      password,
      passwordExpiresAt
    }
  });

  revalidatePath("/admin/staff");
}

export async function togglePasswordless(userId: string) {
  if (!userId) return;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      allowPasswordless: !user.allowPasswordless
    }
  });

  revalidatePath("/admin/staff");
}

export async function loginUser(email: string, password?: string) {
  if (!email) return { error: "El correo electrónico es obligatorio." };

  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase() }
  });

  if (!user) {
    return { error: "El correo electrónico ingresado no está registrado." };
  }

  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "PRODUCER_ADMIN";

  // Admins y Superadmins: solo requieren contraseña, no dependen de isActive
  if (isAdmin) {
    if (!user.password) {
      return { error: "Esta cuenta no tiene contraseña configurada. Contacta al Super Admin." };
    }
    if (user.password !== password?.trim()) {
      return { error: "Contraseña incorrecta." };
    }
    const cookieStore = await cookies();
    cookieStore.set("userId", user.id, { 
      maxAge: 60 * 60 * 24 * 30, 
      path: "/", 
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    if (user.producerId) {
      cookieStore.set("activeProducerId", user.producerId, { 
        maxAge: 60 * 60 * 24 * 30, 
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });
    }
    return { success: true, userId: user.id, role: user.role };
  }

  // Cuentas operativas (Staff, Juez, Animador)
  if (!user.isActive && !user.allowPasswordless) {
    return { error: "Esta cuenta está inactiva. Solicita activación al productor." };
  }

  // Acceso Directo (Passwordless)
  if (user.allowPasswordless) {
    const cookieStore = await cookies();
    cookieStore.set("userId", user.id, { maxAge: 60 * 60 * 24 * 7, path: "/", httpOnly: true });
    if (user.producerId) {
      cookieStore.set("activeProducerId", user.producerId, { maxAge: 60 * 60 * 24 * 7, path: "/" });
    }
    return { success: true, userId: user.id, role: user.role };
  }

  // Acceso con contraseña temporal
  if (!user.password) {
    return { error: "Esta cuenta no está activa o requiere que el productor genere una contraseña." };
  }

  if (user.password !== password?.trim()) {
    return { error: "Contraseña incorrecta." };
  }

  if (user.passwordExpiresAt && new Date() > new Date(user.passwordExpiresAt)) {
    return { error: "Tu contraseña temporal ha expirado. Solicita un reinicio de contraseña al productor." };
  }

  const cookieStore = await cookies();
  cookieStore.set("userId", user.id, { maxAge: 60 * 60 * 24 * 7, path: "/", httpOnly: true });
  if (user.producerId) {
    cookieStore.set("activeProducerId", user.producerId, { maxAge: 60 * 60 * 24 * 7, path: "/" });
  }

  return {
    success: true,
    userId: user.id,
    role: user.role
  };
}

export async function setProducerScope(producerId: string) {
  const cookieStore = await cookies();
  cookieStore.set("activeProducerId", producerId, { maxAge: 60 * 60 * 24 * 7, path: "/" });
  revalidatePath("/admin");
  revalidatePath("/admin/staff");
  revalidatePath("/admin/institutions");
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user;
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("userId");
  cookieStore.delete("activeProducerId");
}

export async function loginUserByProducer(email: string, password: string | undefined, producerId: string) {
  if (!email) return { error: "El correo electrónico es obligatorio." };

  // Buscar usuario SOLO en esta producción (permite mismo email en distintas producciones)
  const user = await prisma.user.findFirst({
    where: {
      email: email.trim().toLowerCase(),
      producerId
    }
  });

  if (!user) {
    return { error: "No se encontró una cuenta con ese correo en esta producción." };
  }

  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "PRODUCER_ADMIN";

  // Admins y Superadmins: solo requieren contraseña, no dependen de isActive
  if (isAdmin) {
    if (!user.password) {
      return { error: "Esta cuenta no tiene contraseña configurada. Contacta al Super Admin." };
    }
    if (user.password !== password?.trim()) {
      return { error: "Contraseña incorrecta." };
    }
    const cookieStore = await cookies();
    cookieStore.set("userId", user.id, { maxAge: 60 * 60 * 24 * 30, path: "/", httpOnly: true });
    cookieStore.set("activeProducerId", producerId, { maxAge: 60 * 60 * 24 * 30, path: "/" });
    return { success: true, userId: user.id, role: user.role };
  }

  // Cuentas operativas: requieren isActive
  if (!user.isActive && !user.allowPasswordless) {
    return { error: "Tu cuenta está inactiva. Solicita activación al productor." };
  }

  // Acceso directo (passwordless)
  if (user.allowPasswordless) {
    const cookieStore = await cookies();
    cookieStore.set("userId", user.id, { maxAge: 60 * 60 * 24 * 7, path: "/", httpOnly: true });
    cookieStore.set("activeProducerId", producerId, { maxAge: 60 * 60 * 24 * 7, path: "/" });
    return { success: true, userId: user.id, role: user.role };
  }

  // Con contraseña
  if (!user.password) {
    return { error: "Esta cuenta requiere que el productor genere una contraseña." };
  }

  if (user.password !== password?.trim()) {
    return { error: "Contraseña incorrecta." };
  }

  if (user.passwordExpiresAt && new Date() > new Date(user.passwordExpiresAt)) {
    return { error: "Tu contraseña ha expirado. Solicita un reinicio al productor." };
  }

  const cookieStore = await cookies();
  cookieStore.set("userId", user.id, { maxAge: 60 * 60 * 24 * 7, path: "/", httpOnly: true });
  cookieStore.set("activeProducerId", producerId, { maxAge: 60 * 60 * 24 * 7, path: "/" });
  return { success: true, userId: user.id, role: user.role };
}

export async function createTestSuperAdmin() {
  const existing = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" }
  });

  if (existing) {
    return { 
      success: true, 
      email: existing.email, 
      password: existing.password || "admin" 
    };
  }

  // Asegurar que exista al menos un productor
  let producer = await prisma.producer.findFirst();
  if (!producer) {
    producer = await prisma.producer.create({
      data: { name: "Productor Base", subdomain: "base" }
    });
  }

  const superAdmin = await prisma.user.create({
    data: {
      name: "Super Admin de Prueba",
      email: "superadmin@admin.com",
      role: "SUPER_ADMIN",
      password: "admin",
      isActive: true,
      allowPasswordless: false,
      producerId: producer.id
    }
  });

  return {
    success: true,
    email: superAdmin.email,
    password: superAdmin.password
  };
}

export async function updateProducer(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const subdomain = formData.get("subdomain") as string;
  const logoFile = formData.get("logoFile") as File;
  let logoUrl = formData.get("logoUrl") as string;

  if (!id || !name || !subdomain) return;

  if (logoFile && logoFile.size > 0) {
    const fs = await import("fs/promises");
    const path = await import("path");
    
    const bytes = await logoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const fileName = `${Date.now()}-${logoFile.name.replace(/\s+/g, '-')}`;
    const uploadDir = path.join(process.cwd(), "public/uploads/producers");
    
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);
    
    logoUrl = `/uploads/producers/${fileName}`;
  }

  await prisma.producer.update({
    where: { id },
    data: {
      name,
      subdomain,
      logoUrl: logoUrl || null
    }
  });

  revalidatePath("/superadmin");
  revalidatePath(`/superadmin/producer/${id}`);
}

export async function createProducerUser(formData: FormData) {
  const producerId = formData.get("producerId") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string || "PRODUCER_ADMIN";
  const password = formData.get("password") as string;

  if (!producerId || !name || !email || !password) return;

  await prisma.user.create({
    data: {
      name,
      email,
      role,
      password,
      isActive: true,
      producerId
    }
  });

  revalidatePath(`/superadmin/producer/${producerId}`);
}

export async function updateUserProducerAssignment(formData: FormData) {
  const userId = formData.get("userId") as string;
  const producerId = formData.get("producerId") as string;

  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      producerId: producerId || null
    }
  });

  revalidatePath("/superadmin");
  if (producerId) {
    revalidatePath(`/superadmin/producer/${producerId}`);
  }
}

export async function createDemoEvent(producerId: string, name?: string, customPin?: string) {
  try {
    if (!producerId) {
      return { error: "No se encontró la productora activa." };
    }

    const pin = customPin?.trim() || Math.floor(1000 + Math.random() * 9000).toString();
    const eventName = name?.trim() || "🏟️ Evento de Capacitación & Demo";

    const event = await prisma.event.create({
      data: {
        name: eventName,
        date: new Date(),
        producerId,
        isDemo: true,
        demoPin: pin,
        registrationZonesCount: 1,
        warmupZonesCount: 1,
        springfloorZonesCount: 1
      }
    });

    await resetDemoEvent(event.id);
    revalidatePath("/admin");
    return { success: true, eventId: event.id, pin };
  } catch (err: any) {
    console.error("Error creating demo event:", err);
    return { error: err?.message || "Error al crear el evento de capacitación." };
  }
}

export async function updateDemoPin(eventId: string, newPin: string) {
  if (!newPin || newPin.trim().length !== 4) {
    return { error: "El PIN debe tener exactamente 4 dígitos." };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { demoPin: newPin.trim() }
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function resetDemoEvent(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!event) return { error: "Evento no encontrado." };

  // Eliminar cronogramas y equipos previos del evento demo
  await prisma.schedule.deleteMany({
    where: { eventId }
  });

  // Institución Demo
  let institution = await prisma.institution.findFirst({
    where: { producerId: event.producerId, name: "Academia Demo All-Stars" }
  });

  if (!institution) {
    institution = await prisma.institution.create({
      data: {
        name: "Academia Demo All-Stars",
        city: "Santiago",
        producerId: event.producerId,
        type: "All Star"
      }
    });
  }

  const demoTeamsData = [
    { name: "Titans Alpha", division: "Coed", category: "Elite", level: "Nivel 4", coach: "Camila Rivas", phone: "+56912345678" },
    { name: "Golden Stars", division: "All Girl", category: "Junior", level: "Nivel 2", coach: "Matías Soto", phone: "+56987654321" },
    { name: "Thunder Voltage", division: "Coed", category: "Senior", level: "Nivel 3", coach: "Sofía Vergara", phone: "+56955554444" },
    { name: "Bravos All Stars", division: "Open", category: "International", level: "Nivel 5", coach: "Claudio Fuentes", phone: "+56999998888" },
    { name: "Vipers Cheer Club", division: "All Girl", category: "Youth", level: "Nivel 1", coach: "Daniela Morales", phone: "+56944443333" },
    { name: "Rebels Dynamite", division: "Coed", category: "Senior", level: "Nivel 4", coach: "Ignacio Pérez", phone: "+56977776666" },
    { name: "Phoenix Rising", division: "All Girl", category: "Junior", level: "Nivel 3", coach: "Valentina Gómez", phone: "+56922221111" },
    { name: "Inferno Fire", division: "Coed", category: "Open", level: "Nivel 6", coach: "Gabriel Silva", phone: "+56933332222" },
    { name: "Eagles Flight", division: "All Girl", category: "Mini", level: "Nivel 1", coach: "Carolina Torres", phone: "+56966665555" },
    { name: "Dragons Power", division: "Coed", category: "Senior", level: "Nivel 4", coach: "Felipe Araya", phone: "+56988887777" },
    { name: "Stormbreakers", division: "Open", category: "Premier", level: "Nivel 5", coach: "Andrea Godoy", phone: "+56911119999" },
    { name: "Shadow Stealth", division: "All Girl", category: "Junior", level: "Nivel 2", coach: "Rodrigo Castro", phone: "+56944445555" },
    { name: "Apex Legends", division: "Coed", category: "Senior", level: "Nivel 4", coach: "Francisca Vera", phone: "+56977778888" },
    { name: "Galaxy Quantum", division: "All Girl", category: "Youth", level: "Nivel 1", coach: "Hernán Bravo", phone: "+56922223333" },
    { name: "Tigers Rampage", division: "Coed", category: "Junior", level: "Nivel 3", coach: "Marcela Reyes", phone: "+56955556666" },
    { name: "Valkyries Shield", division: "All Girl", category: "Senior", level: "Nivel 4", coach: "Sebastián Lagos", phone: "+56988889999" }
  ];

  // La fecha/hora de inicio arranca 10 minutos en el futuro a partir de este instante
  const baseTime = new Date(Date.now() + 10 * 60 * 1000);

  for (let i = 0; i < demoTeamsData.length; i++) {
    const tData = demoTeamsData[i];

    let team = await prisma.team.findFirst({
      where: { institutionId: institution.id, name: tData.name }
    });

    if (!team) {
      team = await prisma.team.create({
        data: {
          name: tData.name,
          division: tData.division,
          category: tData.category,
          level: tData.level,
          athletesCount: 16 + (i % 6),
          coach: tData.coach,
          coachPhone: tData.phone,
          institutionId: institution.id
        }
      });
    }

    // Tiempos programados con 10 minutos de intervalo por equipo y entre estaciones
    const scheduledRegistration = new Date(baseTime.getTime() + i * 10 * 60000);
    const scheduledWarmup1 = new Date(scheduledRegistration.getTime() + 10 * 60000);
    const scheduledSpringfloor = new Date(scheduledWarmup1.getTime() + 10 * 60000);
    const scheduledPerformance = new Date(scheduledSpringfloor.getTime() + 10 * 60000);

    await prisma.schedule.create({
      data: {
        eventId,
        teamId: team.id,
        orderIndex: i + 1,
        scheduledRegistration,
        scheduledWarmup1,
        scheduledSpringfloor,
        scheduledPerformance,
        status: "PENDING",
        registrationZone: "A",
        warmupZone: "A",
        springfloorZone: "A"
      }
    });
  }

  // Reiniciar estado de mesa de jueces
  await prisma.event.update({
    where: { id: eventId },
    data: { judgesReady: false, date: baseTime }
  });

  // Notificar por WebSocket para sincronizar a todos los clientes en tiempo real
  const io = (global as any).io;
  if (io) {
    io.to(eventId).emit("status-changed", { eventId });
  }

  revalidatePath("/admin");
  revalidatePath(`/judge/${eventId}`);
  revalidatePath(`/staff/${eventId}`);
  revalidatePath(`/announcer/${eventId}`);

  return { success: true, startTime: baseTime };
}

export async function loginDemoPin(pin: string, role: string, station?: string, isSupervisor?: boolean) {
  if (!pin || pin.trim().length !== 4) {
    return { error: "Por favor ingresa un PIN válido de 4 dígitos." };
  }

  const cleanPin = pin.trim();

  // Buscar evento demo que coincida con el PIN
  const event = await prisma.event.findFirst({
    where: {
      isDemo: true,
      demoPin: cleanPin
    }
  });

  if (!event) {
    return { error: "PIN incorrecto o no se encontró ningún evento de prueba activo con ese PIN." };
  }

  // Crear o reutilizar usuario demo operativo para el rol seleccionado
  const roleName = isSupervisor ? "SUPERVISOR" : (station ? `STAFF_${station}` : role);
  const email = `demo_${roleName.toLowerCase()}_${event.producerId}@cheercontrol.test`;

  const effectiveStation = station === "WARMUP_1" ? "WARMUP_1_A,WARMUP_1" :
                           station === "SPRINGFLOOR" ? "SPRINGFLOOR_A,SPRINGFLOOR" :
                           station === "REGISTRATION" ? "REGISTRATION_A,REGISTRATION" : station;

  let user = await prisma.user.findFirst({
    where: { email }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: `Capacitación: ${roleName}`,
        email,
        role: role === "SUPERVISOR" ? "STAFF" : role,
        station: effectiveStation || null,
        isSupervisor: isSupervisor || role === "SUPERVISOR",
        producerId: event.producerId,
        isActive: true,
        allowPasswordless: true
      }
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: role === "SUPERVISOR" ? "STAFF" : role,
        station: effectiveStation || null,
        isSupervisor: isSupervisor || role === "SUPERVISOR",
        isActive: true,
        allowPasswordless: true
      }
    });
  }

  // Guardar cookies de sesión
  const cookieStore = await cookies();
  cookieStore.set("userId", user.id, { maxAge: 60 * 60 * 24 * 7, path: "/", httpOnly: true });
  cookieStore.set("activeProducerId", event.producerId, { maxAge: 60 * 60 * 24 * 7, path: "/" });

  let targetUrl = `/staff/${event.id}?userId=${user.id}`;
  if (role === "SCREEN") {
    targetUrl = `/tv/${event.id}`;
  } else if (role === "PUBLIC_WEB") {
    const producer = await prisma.producer.findUnique({ where: { id: event.producerId } });
    const subdomain = producer?.subdomain || "demo";
    targetUrl = `/p/${subdomain}/${event.id}`;
  } else if (role === "JUDGE") {
    targetUrl = `/judge/${event.id}?userId=${user.id}`;
  } else if (role === "ANNOUNCER") {
    targetUrl = `/announcer/${event.id}?userId=${user.id}`;
  } else if (effectiveStation) {
    targetUrl = `/staff/${event.id}?userId=${user.id}&station=${effectiveStation.split(",")[0]}`;
  }

  return { success: true, targetUrl, eventId: event.id, eventName: event.name };
}

export async function toggleHitZero(scheduleId: string, isHitZero: boolean) {
  const schedule = await prisma.schedule.update({
    where: { id: scheduleId },
    data: {
      isHitZero,
      hitZeroAwarded: isHitZero ? false : false
    }
  });

  const io = (global as any).io;
  if (io) {
    io.to(schedule.eventId).emit("status-changed", { eventId: schedule.eventId });
    io.to(schedule.eventId).emit("hit-zero-updated", { scheduleId, isHitZero });
  }

  revalidatePath(`/judge/${schedule.eventId}`);
  revalidatePath(`/staff/${schedule.eventId}`);
  revalidatePath(`/announcer/${schedule.eventId}`);
  return { success: true, isHitZero };
}

export async function toggleHitZeroAwarded(scheduleId: string, awarded: boolean) {
  const schedule = await prisma.schedule.update({
    where: { id: scheduleId },
    data: {
      hitZeroAwarded: awarded,
      hitZeroAwardedAt: awarded ? new Date() : null
    }
  });

  const io = (global as any).io;
  if (io) {
    io.to(schedule.eventId).emit("status-changed", { eventId: schedule.eventId });
    io.to(schedule.eventId).emit("hit-zero-updated", { scheduleId, hitZeroAwarded: awarded });
  }

  revalidatePath(`/judge/${schedule.eventId}`);
  revalidatePath(`/staff/${schedule.eventId}`);
  revalidatePath(`/announcer/${schedule.eventId}`);
  return { success: true, hitZeroAwarded: awarded };
}
