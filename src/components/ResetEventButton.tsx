"use client";

import { useState } from "react";
import { resetEventState } from "@/app/admin/actions";

interface ResetEventButtonProps {
  eventId: string;
}

export default function ResetEventButton({ eventId }: ResetEventButtonProps) {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    const confirmReset = confirm(
      "⚠️ ¿Estás seguro de que deseas reiniciar este evento?\n\nEsto restablecerá el estado de todos los equipos a PENDIENTE y borrará sus marcas reales de llegada, calentamiento y competencia.\n\nEl cronograma, orden y asignaciones NO se borrarán."
    );
    
    if (!confirmReset) return;

    setIsResetting(true);
    try {
      await resetEventState(eventId);
      alert("✅ El evento ha sido reiniciado con éxito. Todos los estados están listos para comenzar de nuevo.");
    } catch (error) {
      alert("Hubo un error al reiniciar el evento.");
      console.error(error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <button
      onClick={handleReset}
      disabled={isResetting}
      className="bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 disabled:opacity-50 text-xs font-bold py-2.5 px-4 rounded-lg transition-all"
    >
      {isResetting ? "Reiniciando..." : "🔄 Reiniciar Evento"}
    </button>
  );
}
