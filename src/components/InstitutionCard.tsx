"use client";

import { useState } from "react";
import {
  updateInstitution,
  deleteInstitution,
  createTeam,
  updateTeam,
  deleteTeam,
  moveTeamToInstitution,
} from "@/app/admin/actions";
import { CHEER_CONFIG, INSTITUTION_TYPES, InstitutionType } from "@/lib/cheerConfig";

interface Team {
  id: string;
  name: string;
  division: string;
  category: string;
  level: string;
  athletesCount: number;
  coach: string | null;
  coachPhone: string | null;
}

interface Institution {
  id: string;
  name: string;
  city: string | null;
  logoUrl: string | null;
  headCoach: string | null;
  headCoachPhone: string | null;
  type: string | null;
  teams: Team[];
}

// Context compartido para drag-and-drop entre instancias del componente
let draggedTeam: { id: string; name: string; fromInstitutionId: string; fromInstitutionName: string } | null = null;

interface Props {
  institution: Institution;
  allInstitutions: { id: string; name: string }[];
}

export default function InstitutionCard({ institution, allInstitutions }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // --- Estado edición institución ---
  const [editingInst, setEditingInst] = useState(false);
  const [instName, setInstName] = useState(institution.name);
  const [instCity, setInstCity] = useState(institution.city || "");
  const [instLogo, setInstLogo] = useState(institution.logoUrl || "");
  const [instHeadCoach, setInstHeadCoach] = useState(institution.headCoach || "");
  const [instHeadPhone, setInstHeadPhone] = useState(institution.headCoachPhone || "");
  const [instTypeState, setInstTypeState] = useState<InstitutionType>((institution.type as InstitutionType) || "All Stars");

  // --- Estado nuevo equipo ---
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newAthletes, setNewAthletes] = useState(0);
  const [newCoach, setNewCoach] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newLevel, setNewLevel] = useState("");

  // --- Estado edición equipo ---
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamCategory, setTeamCategory] = useState("");
  const [teamLevel, setTeamLevel] = useState("");
  const [teamAthletes, setTeamAthletes] = useState(0);
  const [teamCoach, setTeamCoach] = useState("");
  const [teamPhone, setTeamPhone] = useState("");

  const currentInstType = (institution.type as InstitutionType) || "All Stars";

  // Dynamic lists for New Team
  const categoriesList = Object.keys(CHEER_CONFIG[currentInstType] || CHEER_CONFIG["All Stars"]);
  const activeNewCategory = categoriesList.includes(newCategory) ? newCategory : (categoriesList[0] || "");
  const levelsList = CHEER_CONFIG[currentInstType]?.[activeNewCategory] || [];
  const activeNewLevel = levelsList.includes(newLevel) ? newLevel : (levelsList[0] || "");

  // Dynamic lists for Edit Team
  const editCategoriesList = Object.keys(CHEER_CONFIG[currentInstType] || CHEER_CONFIG["All Stars"]);
  const activeEditCategory = editCategoriesList.includes(teamCategory) ? teamCategory : (editCategoriesList[0] || "");
  const editLevelsList = CHEER_CONFIG[currentInstType]?.[activeEditCategory] || [];
  const activeEditLevel = editLevelsList.includes(teamLevel) ? teamLevel : (editLevelsList[0] || "");

  const startEditTeam = (t: Team) => {
    setEditingTeamId(t.id);
    setTeamName(t.name);
    setTeamCategory(t.category);
    // Since division/level is saved in division field, load that into teamLevel state
    setTeamLevel(t.division || t.level);
    setTeamAthletes(t.athletesCount);
    setTeamCoach(t.coach || "");
    setTeamPhone(t.coachPhone || "");
  };

  const handleSaveInst = async () => {
    const fd = new FormData();
    fd.append("id", institution.id);
    fd.append("name", instName);
    fd.append("city", instCity);
    fd.append("logoUrl", instLogo);
    fd.append("headCoach", instHeadCoach);
    fd.append("headCoachPhone", instHeadPhone);
    fd.append("type", instTypeState);
    await updateInstitution(fd);
    setEditingInst(false);
  };

  const handleDeleteInst = async () => {
    if (!confirm(`¿Eliminar el club "${institution.name}" y TODOS sus equipos? Esta acción no se puede deshacer.`)) return;
    const fd = new FormData();
    fd.append("id", institution.id);
    await deleteInstitution(fd);
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    const fd = new FormData();
    fd.append("institutionId", institution.id);
    fd.append("name", newTeamName);
    fd.append("division", activeNewLevel); // Division/Level option goes to division
    fd.append("category", activeNewCategory); // Category option goes to category
    fd.append("level", currentInstType); // Institution Type goes to level
    fd.append("athletesCount", String(newAthletes));
    fd.append("coach", newCoach);
    fd.append("coachPhone", newPhone);
    await createTeam(fd);
    setShowNewTeam(false);
    setNewTeamName(""); setNewCoach(""); setNewPhone(""); setNewAthletes(0);
    setNewCategory(""); setNewLevel("");
  };

  const handleSaveTeam = async (id: string) => {
    const fd = new FormData();
    fd.append("id", id);
    fd.append("name", teamName);
    fd.append("division", activeEditLevel); // Division/Level option goes to division
    fd.append("category", activeEditCategory); // Category option goes to category
    fd.append("level", currentInstType); // Institution Type goes to level
    fd.append("athletesCount", String(teamAthletes));
    fd.append("coach", teamCoach);
    fd.append("coachPhone", teamPhone);
    await updateTeam(fd);
    setEditingTeamId(null);
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el equipo "${name}"?`)) return;
    const fd = new FormData();
    fd.append("id", id);
    await deleteTeam(fd);
  };

  // --- Drag & Drop ---
  const handleDragStart = (team: Team) => {
    draggedTeam = {
      id: team.id,
      name: team.name,
      fromInstitutionId: institution.id,
      fromInstitutionName: institution.name,
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!draggedTeam || draggedTeam.fromInstitutionId === institution.id) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!draggedTeam || draggedTeam.fromInstitutionId === institution.id) return;

    const { id, name, fromInstitutionName } = draggedTeam;
    draggedTeam = null;

    if (!confirm(
      `¿Mover el equipo "${name}" de "${fromInstitutionName}" a "${institution.name}"?\n\nEsta acción cambiará la institución del equipo permanentemente.`
    )) return;

    const fd = new FormData();
    fd.append("teamId", id);
    fd.append("targetInstitutionId", institution.id);
    await moveTeamToInstitution(fd);
    setExpanded(true);
  };

  const effectiveHeadPhone = institution.headCoachPhone;

  return (
    <div
      className={`glass-panel overflow-hidden transition-all relative ${isDragOver ? "ring-2 ring-primary ring-offset-1 ring-offset-transparent scale-[1.01]" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary/10 rounded-xl flex items-center justify-center z-10 pointer-events-none">
          <span className="text-primary font-extrabold text-sm bg-black/70 px-4 py-2 rounded-full">
            📥 Soltar aquí para mover equipo
          </span>
        </div>
      )}

      {/* Cabecera del Club */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 transition-colors relative"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary/10 border border-primary/20 shrink-0 flex items-center justify-center">
          {institution.logoUrl ? (
            <img src={institution.logoUrl} alt={institution.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">🏅</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold text-white text-base truncate flex items-center gap-2">
            <span>{institution.name}</span>
            <span className="text-[10px] bg-white/10 text-gray-300 font-bold px-2 py-0.5 rounded-full shrink-0">
              {currentInstType}
            </span>
          </div>
          <div className="text-xs text-gray-400 flex flex-wrap items-center gap-2 mt-1">
            {institution.city && <span>📍 {institution.city}</span>}
            <span className="text-primary font-semibold">{institution.teams.length} equipo{institution.teams.length !== 1 ? "s" : ""}</span>
            {institution.headCoach && (
              <span className="text-yellow-400">👑 {institution.headCoach}</span>
            )}
            {effectiveHeadPhone && (
              <span className="text-emerald-400 text-[10px]">📞 {effectiveHeadPhone}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setEditingInst(!editingInst)}
            className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 py-1.5 rounded-lg transition-colors"
          >✏️</button>
          <button
            onClick={handleDeleteInst}
            className="text-xs bg-red-900/20 hover:bg-red-900/40 text-red-400 px-2.5 py-1.5 rounded-lg transition-colors"
          >🗑️</button>
          <span className="text-gray-500 text-sm">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Formulario edición institución */}
      {editingInst && (
        <div className="border-t border-white/10 bg-black/30 p-4 space-y-3">
          <div className="text-[10px] text-warning font-extrabold uppercase tracking-widest mb-2">✏️ Editar Club</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Nombre del Club *</label>
              <input value={instName} onChange={e => setInstName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Tipo de Club / Institución *</label>
              <select value={instTypeState} onChange={e => setInstTypeState(e.target.value as InstitutionType)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
                {INSTITUTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Ciudad</label>
              <input value={instCity} onChange={e => setInstCity(e.target.value)} placeholder="Ej. Santiago"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">URL Logo</label>
              <input value={instLogo} onChange={e => setInstLogo(e.target.value)} placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[10px] text-yellow-400 block mb-1">👑 Head Coach / Encargado</label>
              <input value={instHeadCoach} onChange={e => setInstHeadCoach(e.target.value)} placeholder="Nombre del encargado"
                className="w-full bg-white/5 border border-yellow-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500" />
            </div>
            <div>
              <label className="text-[10px] text-yellow-400 block mb-1">📞 Teléfono Encargado <span className="text-gray-500">(fallback)</span></label>
              <input value={instHeadPhone} onChange={e => setInstHeadPhone(e.target.value)} placeholder="+56912345678"
                className="w-full bg-white/5 border border-yellow-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveInst} className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold py-2 rounded-lg active:scale-95 transition-all">💾 Guardar</button>
            <button onClick={() => setEditingInst(false)} className="bg-white/5 hover:bg-white/10 text-gray-300 text-xs px-4 py-2 rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de equipos */}
      {expanded && (
        <div className="border-t border-white/10">
          {institution.headCoach && (
            <div className="px-4 py-2 bg-yellow-900/10 border-b border-yellow-900/20 text-[10px] text-yellow-400 flex items-center gap-2">
              <span>👑 {institution.headCoach}</span>
              {institution.headCoachPhone && <span className="text-emerald-400 font-mono">📞 {institution.headCoachPhone}</span>}
              <span className="text-gray-600 ml-1">— Encargado de la institución</span>
            </div>
          )}

          {institution.teams.length === 0 && !showNewTeam && (
            <div className="text-center text-gray-500 text-sm py-6">Sin equipos registrados.</div>
          )}

          {institution.teams.map(team => {
            // Teléfono efectivo: primero del equipo, luego del headcoach de la institución
            const effectivePhone = team.coachPhone || institution.headCoachPhone;
            const phoneIsInherited = !team.coachPhone && !!institution.headCoachPhone;

            return (
              <div
                key={team.id}
                className="border-b border-white/5 last:border-0"
              >
                {editingTeamId === team.id ? (
                  <div className="bg-black/30 p-4 space-y-3">
                    <div className="text-[10px] text-warning font-extrabold uppercase tracking-widest">✏️ Editando: {team.name}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="col-span-2 sm:col-span-3">
                        <label className="text-[10px] text-gray-400 block mb-1">Nombre del Equipo *</label>
                        <input value={teamName} onChange={e => setTeamName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Categoría *</label>
                        <select value={activeEditCategory} onChange={e => {
                          setTeamCategory(e.target.value);
                          setTeamLevel("");
                        }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-primary">
                          {editCategoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">División / Nivel *</label>
                        <select value={activeEditLevel} onChange={e => setTeamLevel(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-primary">
                          {editLevelsList.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">N° Atletas</label>
                        <input type="number" min={0} value={teamAthletes} onChange={e => setTeamAthletes(parseInt(e.target.value) || 0)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Coach</label>
                        <input value={teamCoach} onChange={e => setTeamCoach(e.target.value)} placeholder="Nombre del entrenador"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 block mb-1">Teléfono Coach</label>
                        <input value={teamPhone} onChange={e => setTeamPhone(e.target.value)} placeholder="+56912345678"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveTeam(team.id)} className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold py-2 rounded-lg active:scale-95 transition-all">💾 Guardar</button>
                      <button onClick={() => setEditingTeamId(null)} className="bg-white/5 hover:bg-white/10 text-gray-300 text-xs px-4 py-2 rounded-lg">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div
                    draggable
                    onDragStart={() => handleDragStart(team)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group cursor-grab active:cursor-grabbing"
                  >
                    {/* Drag handle */}
                    <span className="text-gray-600 group-hover:text-gray-400 transition-colors text-sm select-none shrink-0" title="Arrastrar para cambiar de club">
                      ⠿
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm truncate">{team.name}</div>

                      <div className="flex flex-wrap gap-2 mt-1.5 mb-1">
                        {team.division && (
                          <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-900 px-2 py-0.5 rounded-full font-bold">
                            {team.division}
                          </span>
                        )}
                        {team.category && (
                          <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-900 px-2 py-0.5 rounded-full font-bold">
                            {team.category}
                          </span>
                        )}
                        {team.level && (
                          <span className="text-[10px] bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-900 px-2 py-0.5 rounded-full font-bold">
                            {team.level}
                          </span>
                        )}
                        {team.athletesCount > 0 && (
                          <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-full font-bold">
                            👥 {team.athletesCount}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                        {team.coach ? (
                          <span>👨‍🏫 {team.coach}</span>
                        ) : (
                          institution.headCoach && <span className="text-yellow-600/80">👑 {institution.headCoach}</span>
                        )}
                        {effectivePhone && (
                          <span className={`${phoneIsInherited ? "text-yellow-600" : "text-emerald-500"} font-mono`}>
                            📞 {effectivePhone}
                            {phoneIsInherited && <span className="ml-1 text-[9px] text-yellow-700">(club)</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => startEditTeam(team)} className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-2 py-1 rounded-lg">✏️</button>
                      <button onClick={() => handleDeleteTeam(team.id, team.name)} className="text-xs bg-red-900/20 hover:bg-red-900/40 text-red-400 px-2 py-1 rounded-lg">🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Formulario nuevo equipo */}
          {showNewTeam ? (
            <div className="bg-primary/5 border-t border-primary/20 p-4 space-y-3">
              <div className="text-[10px] text-primary font-extrabold uppercase tracking-widest">➕ Nuevo Equipo</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="col-span-2 sm:col-span-3">
                  <label className="text-[10px] text-gray-400 block mb-1">Nombre del Equipo *</label>
                  <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Ej. Panthers Cheer"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Categoría *</label>
                  <select value={activeNewCategory} onChange={e => {
                    setNewCategory(e.target.value);
                    setNewLevel("");
                  }}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-primary">
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">División / Nivel *</label>
                  <select value={activeNewLevel} onChange={e => setNewLevel(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-primary">
                    {levelsList.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">N° Atletas</label>
                  <input type="number" min={0} value={newAthletes} onChange={e => setNewAthletes(parseInt(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Coach</label>
                  <input value={newCoach} onChange={e => setNewCoach(e.target.value)} placeholder="Nombre entrenador"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">
                    Teléfono Coach
                    {institution.headCoachPhone && <span className="text-yellow-600 ml-1">(si vacío usa tel. del club)</span>}
                  </label>
                  <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+56912345678"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateTeam} disabled={!newTeamName.trim()} className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold py-2 rounded-lg active:scale-95 transition-all disabled:opacity-40">➕ Agregar Equipo</button>
                <button onClick={() => {
                  setShowNewTeam(false);
                  setNewTeamName("");
                  setNewCoach("");
                  setNewPhone("");
                  setNewAthletes(0);
                }} className="bg-white/5 hover:bg-white/10 text-gray-300 text-xs px-4 py-2 rounded-lg">Cancelar</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setExpanded(true); setShowNewTeam(true); }}
              className="w-full py-3 text-xs text-primary hover:text-white hover:bg-primary/10 transition-colors font-semibold flex items-center justify-center gap-2 border-t border-white/5"
            >
              ➕ Agregar Equipo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
