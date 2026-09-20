import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import TvPairClient from "./TvPairClient";

export default async function AdminTvPairPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  const activeProducerId = cookieStore.get("activeProducerId")?.value;

  let user = null;
  if (userId) {
    user = await prisma.user.findUnique({ where: { id: userId } });
  }

  let producerId = activeProducerId || user?.producerId || null;

  let events = [];
  if (user?.role === "SUPER_ADMIN" && !activeProducerId) {
    events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        sessions: { select: { id: true } }
      }
    });
  } else if (producerId) {
    events = await prisma.event.findMany({
      where: { producerId },
      orderBy: { createdAt: "desc" },
      include: {
        sessions: { select: { id: true } }
      }
    });
  } else {
    events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        sessions: { select: { id: true } }
      }
    });
  }

  const formattedEvents = events.map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    logoUrl: e.logoUrl,
    sessionsCount: e.sessions?.length || 0,
  }));

  return <TvPairClient events={formattedEvents} />;
}
