import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { createUser } from "../actions";
import AdminStaffList from "@/components/AdminStaffList";
import { cookies } from "next/headers";
import ProducerScopeSelector from "@/components/ProducerScopeSelector";

export default async function AdminStaffPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  const activeProducerId = cookieStore.get("activeProducerId")?.value;

  let user = null;
  if (userId) {
    user = await prisma.user.findUnique({ where: { id: userId } });
  }

  const producers = await prisma.producer.findMany({ orderBy: { name: "asc" } });

  let producer = null;
  if (user?.role === "SUPER_ADMIN" && activeProducerId) {
    producer = await prisma.producer.findUnique({
      where: { id: activeProducerId }
    });
  }

  if (!producer && user?.producerId) {
    producer = await prisma.producer.findUnique({
      where: { id: user.producerId }
    });
  }

  if (!producer) {
    producer = await prisma.producer.findFirst();
  }

  if (!producer) {
    return (
      <div className="p-8 text-center text-gray-400">
        No tienes un productor asignado. Regístralo en Super Admin primero.
      </div>
    );
  }

  const staffUsers = await prisma.user.findMany({
    where: {
      producerId: producer.id,
      role: { in: ["STAFF", "JUDGE", "ANNOUNCER"] }
    },
    orderBy: { createdAt: "desc" }
  });

  const events = await prisma.event.findMany({
    where: { producerId: producer.id }
  });

  const maxWarmupZones = events.reduce((max, ev) => Math.max(max, ev.warmupZonesCount), 1);
  const maxSpringfloorZones = events.reduce((max, ev) => Math.max(max, ev.springfloorZonesCount), 1);

  const getZoneLetter = (index: number) => String.fromCharCode(65 + index);
  
  const stations = [
    { value: "RUNNER", label: "🏃 Buscador (Pre-Registro)" },
    { value: "REGISTRATION", label: "📥 Mesa de Registro" }
  ];

  for (let i = 0; i < maxWarmupZones; i++) {
    const letter = getZoneLetter(i);
    stations.push({ value: `WARMUP_1_${letter}`, label: `🔥 Calentamiento - Zona ${letter}` });
  }

  for (let i = 0; i < maxSpringfloorZones; i++) {
    const letter = getZoneLetter(i);
    stations.push({ value: `SPRINGFLOOR_${letter}`, label: `🤸 Springfloor - Zona ${letter}` });
  }

  stations.push(
    { value: "TRANSIT", label: "🔀 Trayecto / Traslado (Calentamiento a Pista)" },
    { value: "COMPETING", label: "🏟️ Pista de Competencia" }
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold">Cuentas Operativas</h1>
          <p className="text-gray-400 mt-2">Gestiona el personal, jueces y animadores, define sus accesos, contraseñas y envíos de credenciales.</p>
        </div>
        {user?.role === "SUPER_ADMIN" && producers.length > 0 && (
          <ProducerScopeSelector producers={producers} activeProducerId={producer.id} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de creación */}
        <div className="glass-panel p-6 col-span-1 h-fit">
          <h2 className="text-xl font-semibold mb-4">Crear Cuenta Operativa</h2>
          <form action={createUser} className="space-y-4">
            <input type="hidden" name="producerId" value={producer.id} />
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nombre Completo</label>
              <input 
                name="name" 
                type="text" 
                required 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                placeholder="Ej. Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Correo Electrónico</label>
              <input 
                name="email" 
                type="email" 
                required 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                placeholder="ejemplo@evento.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">WhatsApp (Celular)</label>
              <input 
                name="phone" 
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors text-sm"
                placeholder="Ej. +56912345678"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Rol de Acceso</label>
              <select 
                name="role" 
                required 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors text-sm"
              >
                <option value="STAFF" className="bg-slate-900">Staff de Estaciones</option>
                <option value="JUDGE" className="bg-slate-900">Juez de Mesa</option>
                <option value="ANNOUNCER" className="bg-slate-900">Animador/Locutor de Escenario</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Estaciones Asignadas (Solo aplica a Staff)</label>
              <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-white/10 max-h-[160px] overflow-y-auto">
                {stations.map(st => (
                  <label key={st.value} className="flex items-center gap-3 text-sm text-gray-300 hover:text-white cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      name="stations" 
                      value={st.value} 
                      className="w-4 h-4 rounded bg-[#1e293b] border-white/10 text-warning focus:ring-warning"
                    />
                    <span>{st.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-3 text-sm text-gray-300 hover:text-white cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  name="isSupervisor" 
                  className="w-4 h-4 rounded bg-[#1e293b] border-white/10 text-primary focus:ring-primary"
                />
                <span className="font-semibold text-primary">👑 ¿Es Staff Principal? (Supervisor)</span>
              </label>
            </div>
            <button type="submit" className="w-full btn-primary mt-4">
              Crear Cuenta Operativa
            </button>
          </form>
        </div>

        {/* Lista de Staffs */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Personal Activo ({staffUsers.length})</h2>
          
          {staffUsers.length === 0 ? (
            <div className="glass-panel p-8 text-center text-gray-400 border-dashed">
              Aún no has creado cuentas de Staff. Crea una a la izquierda para empezar a simular.
            </div>
          ) : (
            <AdminStaffList staffUsers={staffUsers} stations={stations} />
          )}
        </div>
      </div>
    </div>
  );
}
