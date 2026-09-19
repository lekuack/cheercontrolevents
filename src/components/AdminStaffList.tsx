"use client";

import { useState, useEffect } from "react";
import { 
  updateUser, 
  deleteUser, 
  activateUser, 
  deactivateUser, 
  resetUserPassword, 
  togglePasswordless 
} from "@/app/admin/actions";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  station: string | null;
  isSupervisor: boolean;
  phone: string | null;
  password?: string | null;
  passwordExpiresAt?: any | null;
  isActive: boolean;
  allowPasswordless: boolean;
}

interface StationOption {
  value: string;
  label: string;
}

interface AdminStaffListProps {
  staffUsers: StaffUser[];
  stations: StationOption[];
}

export default function AdminStaffList({ staffUsers, stations }: AdminStaffListProps) {
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [durationDays, setDurationDays] = useState(1);

  // Edit Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("STAFF");
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [isSupervisor, setIsSupervisor] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStartEdit = (user: StaffUser) => {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone || "");
    setRole(user.role);
    setSelectedStations(user.station ? user.station.split(",") : []);
    setIsSupervisor(user.isSupervisor);
  };

  const handleCheckboxChange = (val: string) => {
    setSelectedStations((prev) => 
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const formData = new FormData();
    formData.append("userId", editingId);
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("role", role);
    selectedStations.forEach((st) => formData.append("stations", st));
    if (isSupervisor) {
      formData.append("isSupervisor", "on");
    }

    await updateUser(formData);
    setEditingId(null);
  };

  const sendWhatsApp = (user: StaffUser) => {
    if (!user.phone) {
      alert("Por favor edite el usuario y agregue un número de teléfono primero.");
      return;
    }
    const cleanPhone = user.phone.replace(/\D/g, "");
    
    let text = `Hola ${user.name}, aquí tienes tus credenciales de acceso para Cheer Manager:\n\n`;
    text += `🔗 Enlace de acceso: ${window.location.origin}/login\n`;
    text += `📧 Usuario/Email: ${user.email}\n`;
    if (user.allowPasswordless) {
      text += `🔓 Tipo de acceso: ¡Directo sin contraseña!\n`;
    } else {
      text += `🔑 Contraseña: ${user.password}\n`;
      if (user.passwordExpiresAt) {
        text += `⏳ Vence el: ${new Date(user.passwordExpiresAt).toLocaleDateString()}\n`;
      }
    }

    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
  };

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {staffUsers.map((user) => (
          <div key={user.id} className="glass-panel p-5 animate-pulse h-[160px]"></div>
        ))}
      </div>
    );
  }

  return (
  const regularUsers = staffUsers.filter(u => !u.name.toLowerCase().includes("capacitaci") && !u.name.toLowerCase().includes("demo"));
  const demoUsers = staffUsers.filter(u => u.name.toLowerCase().includes("capacitaci") || u.name.toLowerCase().includes("demo"));

  const renderUserCard = (user: StaffUser) => {
    const isEditing = editingId === user.id;
    const userStations = user.station ? user.station.split(",") : [];

    if (isEditing) {
      return (
        <div key={user.id} className="glass-panel p-5 border-2 border-primary bg-[#1e293b]/80 col-span-1 md:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-primary uppercase">✏️ Editar Cuenta: {user.name}</h3>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Teléfono (WhatsApp)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-primary font-bold"
                  placeholder="+569..."
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rol</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="STAFF">Staff Estaciones</option>
                  <option value="JUDGE">Juez</option>
                  <option value="ANNOUNCER">Animador</option>
                </select>
              </div>
            </div>

            {role === "STAFF" && (
              <div>
                <label className="block text-xs font-semibold text-warning mb-2">Estaciones Asignadas</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-black/35 p-3 rounded-lg border border-white/5">
                  {stations.map((st) => (
                    <label key={st.value} className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedStations.includes(st.value)}
                        onChange={() => handleCheckboxChange(st.value)}
                        className="w-4 h-4 rounded bg-[#1e293b] border-white/10 text-warning focus:ring-warning"
                      />
                      <span>{st.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
              <label className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isSupervisor}
                  onChange={(e) => setIsSupervisor(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1e293b] border-white/10 text-primary focus:ring-primary"
                />
                <span className="font-semibold text-primary">👑 ¿Es Supervisor? (Solo Staff)</span>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 text-xs py-1 px-3.5 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white font-bold text-xs py-1 px-4 rounded-lg hover:bg-primary-hover transition-colors cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div key={user.id} className="glass-panel p-5 flex flex-col justify-between hover:border-primary/30 transition-colors group relative">
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">{user.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{user.email} • {user.phone || "Sin Teléfono"}</p>
            </div>
            
            {/* Botón Editar / Eliminar */}
            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleStartEdit(user)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white p-1 rounded transition-all text-[11px] cursor-pointer"
                title="Editar"
              >
                ✏️
              </button>
              <form
                action={deleteUser}
                onSubmit={(e) => {
                  if (!confirm(`⚠️ ¿Estás seguro de que deseas eliminar la cuenta de "${user.name}"?`)) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="userId" value={user.id} />
                <button
                  type="submit"
                  className="bg-red-500/10 border border-red-500/30 hover:bg-red-500 hover:text-white text-red-400 p-1 rounded transition-all text-[11px] cursor-pointer"
                  title="Eliminar"
                >
                  🗑️
                </button>
              </form>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {user.isSupervisor && (
              <span className="text-[9px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full uppercase">
                👑 Supervisor
              </span>
            )}
            <span className="text-[9px] bg-white/10 text-white font-mono px-2 py-0.5 rounded-full uppercase">
              {user.role === "STAFF" ? "Staff" : user.role === "JUDGE" ? "Juez" : "Animador"}
            </span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
              user.isActive ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-red-500/20 text-red-300 border border-red-500/30"
            }`}>
              {user.isActive ? "Activo" : "Inactivo"}
            </span>
          </div>
        </div>

        {/* Credenciales de Acceso */}
        <div className="bg-black/20 p-3 rounded-lg border border-white/5 my-4 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Credenciales</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-gray-300 hover:text-white">
              <input
                type="checkbox"
                checked={user.allowPasswordless}
                onChange={() => togglePasswordless(user.id)}
                className="w-3.5 h-3.5 rounded bg-black/40 border-white/10 text-primary"
              />
              <span>Acceso directo (sin pass)</span>
            </label>
          </div>

          {user.isActive ? (
            <div className="space-y-1">
              {!user.allowPasswordless && (
                <div className="flex justify-between items-center font-mono">
                  <span className="text-gray-500">Contraseña:</span>
                  <span className="text-white font-bold bg-white/5 px-2 py-0.5 rounded">{user.password || "Ninguna"}</span>
                </div>
              )}
              {user.passwordExpiresAt && (
                <div className="text-[10px] text-gray-500 text-right">
                  Expira: {new Date(user.passwordExpiresAt).toLocaleString()}
                </div>
              )}
              <div className="flex gap-1.5 justify-end pt-1">
                <button
                  onClick={() => sendWhatsApp(user)}
                  className="bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded"
                >
                  💬 Enviar WhatsApp
                </button>
                <button
                  onClick={() => resetUserPassword(user.id, durationDays)}
                  className="bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] px-2 py-1 rounded border border-white/10"
                >
                  🔄 Reset Pass
                </button>
                <button
                  onClick={() => deactivateUser(user.id)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded border border-red-500/20"
                >
                  ⛔ Suspender
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-gray-500">Duración:</span>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-white"
                >
                  <option value={1}>1 Día</option>
                  <option value={2}>2 Días</option>
                  <option value={3}>3 Días</option>
                  <option value={7}>1 Semana</option>
                </select>
              </div>
              <button
                onClick={() => activateUser(user.id, durationDays)}
                className="bg-green-500/20 hover:bg-green-500/35 border border-green-500/40 text-green-300 text-[10px] font-bold px-3 py-1.5 rounded"
              >
                🚀 Activar y Generar Pass
              </button>
            </div>
          )}
        </div>
        
        {user.role === "STAFF" && (
          <div className="border-t border-white/5 pt-3 space-y-1.5">
            <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Estaciones Asignadas:</span>
            <div className="flex flex-wrap gap-1">
              {userStations.length === 0 ? (
                <span className="text-xs text-gray-500 italic">Ninguna estación asignada</span>
              ) : (
                userStations.map((stationVal) => {
                  const stationObj = stations.find((st) => st.value === stationVal);
                  return (
                    <span key={stationVal} className="text-[9px] bg-primary/10 text-primary border border-primary/25 font-bold px-2 py-0.5 rounded">
                      {stationObj ? stationObj.label.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim() : stationVal}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {regularUsers.map(renderUserCard)}
      </div>
      
      {demoUsers.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
            Cuentas de Capacitación
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {demoUsers.map(renderUserCard)}
          </div>
        </div>
      )}
    </div>
  );
}
