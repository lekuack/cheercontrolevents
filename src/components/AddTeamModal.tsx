"use client";

import { useState } from "react";
import { Team, Institution } from "@prisma/client";

type TeamWithInstitution = Team & { institution: Institution };

interface AddTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableTeams: TeamWithInstitution[];
  sessions: any[]; // Recibe las sesiones para validar categorías cruzadas
  currentSessionId: string; // ID de la jornada que se está configurando actualmente
  onAddTeams: (teamIds: string[]) => Promise<void>;
}

export default function AddTeamModal({ isOpen, onClose, availableTeams, sessions, currentSessionId, onAddTeams }: AddTeamModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  if (!isOpen) return null;

  const filteredTeams = availableTeams.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.institution.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDuplicateSession = (t: TeamWithInstitution) => {
    return sessions.find(s => 
      s.id !== currentSessionId && // Excluir la jornada actual
      s.schedules.some((sch: any) => 
        sch.team && 
        sch.team.category === t.category && 
        sch.team.division === t.division
      )
    );
  };

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleToggleAll = () => {
    if (selectedIds.length === filteredTeams.length) {
      setSelectedIds([]);
    } else {
      // Mantener orden: los ya seleccionados primero, luego los nuevos
      const filteredIds = filteredTeams.map(t => t.id);
      const newIds = filteredIds.filter(id => !selectedIds.includes(id));
      setSelectedIds([...selectedIds, ...newIds]);
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;

    // Buscar si hay equipos seleccionados con duplicados en otras jornadas
    const selectedTeams = selectedIds
      .map(id => availableTeams.find(t => t.id === id))
      .filter((t): t is TeamWithInstitution => t !== undefined);
      
    const teamsWithDuplicates = selectedTeams.filter(t => getDuplicateSession(t) !== undefined);

    if (teamsWithDuplicates.length > 0) {
      const details = teamsWithDuplicates.map(t => {
        const dupSession = getDuplicateSession(t);
        return `- ${t.level} ${t.category} ${t.division} ya está asignado en "${dupSession?.name}"`;
      }).join("\n");

      const confirmAdd = confirm(
        `⚠️ ADVERTENCIA: Las siguientes clasificaciones ya están programadas en otras jornadas:\n\n${details}\n\n¿Deseas agregarlos de todas formas?`
      );
      if (!confirmAdd) return;
    }

    setIsSubmitting(true);
    await onAddTeams(selectedIds);
    setIsSubmitting(false);
    setSelectedIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold text-white">Añadir Equipos a la Jornada</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
        </div>

        <div className="p-4 border-b border-white/10 bg-black/20">
          <input
            type="text"
            placeholder="Buscar por equipo o institución..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredTeams.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No hay equipos disponibles.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#0f172a] z-10">
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="p-3 w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.length === filteredTeams.length && filteredTeams.length > 0}
                      onChange={handleToggleAll}
                      className="rounded bg-white/10 border-white/20 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="p-3">Institución</th>
                  <th className="p-3">Equipo</th>
                  <th className="p-3">Categoría / Nivel</th>
                  <th className="p-3">Alertas / Orden</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((t) => {
                  const dupSession = getDuplicateSession(t);
                  const selectedIndex = selectedIds.indexOf(t.id);
                  const isSelected = selectedIndex !== -1;

                  return (
                    <tr 
                      key={t.id} 
                      onClick={() => handleToggle(t.id)}
                      className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/10" : ""
                      }`}
                    >
                      <td className="p-3">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
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
                      <td className="p-3 flex items-center gap-2">
                        {isSelected && (
                          <span className="bg-primary/20 text-primary-light border border-primary/30 text-[10px] font-bold px-2 py-0.5 rounded">
                            N° {selectedIndex + 1}
                          </span>
                        )}
                        {dupSession && (
                          <span className="bg-warning/10 text-warning text-[10px] px-2 py-1 rounded border border-warning/20 font-semibold">
                            ⚠️ {t.category} {t.division} en {dupSession.name}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition">
            Cancelar
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={selectedIds.length === 0 || isSubmitting}
            className="btn-primary text-sm px-6 py-2 rounded-lg flex items-center gap-2"
          >
            {isSubmitting ? "Añadiendo..." : `Añadir ${selectedIds.length} equipos`}
          </button>
        </div>
      </div>
    </div>
  );
}
