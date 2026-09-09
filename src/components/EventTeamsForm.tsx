"use client";

import { useState } from "react";
import { Team, Institution } from "@prisma/client";
import { updateEventTeams } from "@/app/admin/schedule-actions";
import { useRouter } from "next/navigation";

type TeamWithInstitution = Team & { institution: Institution };

interface EventTeamsFormProps {
  eventId: string;
  teams: TeamWithInstitution[];
  initialSelectedIds: string[];
}

export default function EventTeamsForm({ eventId, teams, initialSelectedIds }: EventTeamsFormProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.institution.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateEventTeams(eventId, Array.from(selectedIds));
      alert("Equipos del evento actualizados correctamente.");
      router.push(`/admin/events/${eventId}`);
    } catch (e) {
      alert("Error al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <input
          type="text"
          placeholder="Buscar por equipo o institución..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-md bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors text-sm"
        />
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="btn-primary px-6 py-2 rounded-lg text-sm w-full sm:w-auto"
        >
          {isSaving ? "Guardando..." : "Guardar Equipos Seleccionados"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-gray-400">
              <th className="p-3 w-10">Asignado</th>
              <th className="p-3">Institución</th>
              <th className="p-3">Equipo</th>
              <th className="p-3">Categoría / Nivel</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeams.map((t) => (
              <tr 
                key={t.id} 
                onClick={() => handleToggle(t.id)}
                className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
              >
                <td className="p-3">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(t.id)}
                    onChange={() => {}} // Handled by tr onClick
                    className="rounded bg-white/10 border-white/20 text-primary focus:ring-primary"
                  />
                </td>
                <td className="p-3 text-gray-300 font-semibold">{t.institution.name}</td>
                <td className="p-3 text-white font-bold">{t.name}</td>
                <td className="p-3">
                  <span className="bg-white/10 text-gray-300 text-[10px] px-2 py-0.5 rounded mr-1">
                    {t.division}
                  </span>
                  <span className="text-gray-500 text-xs">{t.category}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
