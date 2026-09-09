import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import EventTeamsForm from "@/components/EventTeamsForm";

export default async function EventTeamsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      teams: true
    }
  });

  if (!event) notFound();

  // Obtener todos los equipos de la temporada 2024 del productor
  const producerTeams = await prisma.team.findMany({
    where: {
      institution: { producerId: event.producerId },
      season: "2024"
    },
    include: { institution: true },
    orderBy: [{ institution: { name: "asc" } }, { name: "asc" }]
  });

  const selectedTeamIds = event.teams.map(t => t.teamId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center glass-panel p-6 border-l-4 border-l-primary">
        <div>
          <div className="text-xs text-gray-400">Configuración de Participantes</div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
            <span>Equipos del Evento: {event.name}</span>
          </h1>
        </div>
        <Link href={`/admin/events/${eventId}`} className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-sm text-white font-bold transition">
          Volver al Evento
        </Link>
      </div>

      <div className="glass-panel p-6">
        <EventTeamsForm 
          eventId={eventId} 
          teams={producerTeams} 
          initialSelectedIds={selectedTeamIds} 
        />
      </div>
    </div>
  );
}
