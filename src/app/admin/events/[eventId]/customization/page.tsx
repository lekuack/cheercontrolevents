import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import CustomizationClient from "./CustomizationClient";

interface CustomizationPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export default async function CustomizationPage({ params }: CustomizationPageProps) {
  const { eventId } = await params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 border-l-4 border-l-pink-500">
        <div>
          <div className="text-xs text-gray-400">Personalización de Evento</div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
            <span>{event.name}</span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/events/${eventId}`}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-all"
          >
            ← Volver al Evento
          </Link>
          <a
            href={`/p`}
            target="_blank"
            className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-all"
          >
            👁️ Ver Página Pública
          </a>
        </div>
      </div>

      {/* Client Component para el Formulario y Live Preview */}
      <CustomizationClient event={event} />
    </div>
  );
}
