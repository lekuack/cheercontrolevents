"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleProducerStatus(formData: FormData) {
  const producerId = formData.get("producerId") as string;
  if (!producerId) return;

  const producer = await prisma.producer.findUnique({ where: { id: producerId } });
  if (!producer) return;

  await prisma.producer.update({
    where: { id: producerId },
    data: { isActive: !producer.isActive }
  });

  revalidatePath("/superadmin");
}

export async function deleteProducer(formData: FormData) {
  const producerId = formData.get("producerId") as string;
  if (!producerId) return;

  // Delete everything related to the producer
  await prisma.user.deleteMany({ where: { producerId } });
  
  const events = await prisma.event.findMany({ where: { producerId }, select: { id: true } });
  const eventIds = events.map(e => e.id);
  
  await prisma.schedule.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.event.deleteMany({ where: { producerId } });
  
  const institutions = await prisma.institution.findMany({ where: { producerId }, select: { id: true } });
  const instIds = institutions.map(i => i.id);
  await prisma.team.deleteMany({ where: { institutionId: { in: instIds } } });
  await prisma.institution.deleteMany({ where: { producerId } });

  await prisma.producer.delete({ where: { id: producerId } });

  revalidatePath("/superadmin");
}
