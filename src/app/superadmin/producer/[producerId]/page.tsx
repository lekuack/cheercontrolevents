import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  updateProducer, 
  createProducerUser, 
  updateUserProducerAssignment 
} from "@/app/admin/actions";

interface ProducerDetailPageProps {
  params: Promise<{
    producerId: string;
  }>;
}

export default async function ProducerDetailPage({ params }: ProducerDetailPageProps) {
  const { producerId } = await params;

  const producer = await prisma.producer.findUnique({
    where: { id: producerId },
    include: {
      users: { orderBy: { name: "asc" } }
    }
  });

  if (!producer) {
    notFound();
  }

  // Obtenemos todos los productores para permitir reasignaciones
  const allProducers = await prisma.producer.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <div className="flex justify-between items-center glass-panel p-6 border-l-4 border-l-primary">
        <div>
          <div className="text-xs text-gray-400">Detalles del Tenant</div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mt-1">
            <span>Productor: {producer.name}</span>
          </h1>
        </div>
        <Link href="/superadmin" className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg text-sm text-white font-bold transition">
          Volver a Productores
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Modificar Productor */}
        <div className="glass-panel p-6 space-y-4 h-fit">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>✏️</span> Editar Productor
          </h2>
          <form action={updateProducer} className="space-y-4">
            <input type="hidden" name="id" value={producer.id} />
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nombre de Empresa</label>
              <input 
                name="name" 
                type="text" 
                required 
                defaultValue={producer.name}
                className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Subdominio</label>
              <input 
                name="subdomain" 
                type="text" 
                required 
                defaultValue={producer.subdomain || ""}
                className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Subir Nuevo Logo (Archivo)</label>
              <input 
                name="logoFile" 
                type="file" 
                accept="image/*"
                className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white"
              />
            </div>
            <div className="mt-2">
              <label className="block text-xs text-gray-400 mb-1">O mantener/usar URL del Logo</label>
              <input 
                name="logoUrl" 
                type="url" 
                defaultValue={producer.logoUrl || ""}
                className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
            </div>
            <button type="submit" className="w-full btn-primary py-2 text-sm">
              Guardar Cambios
            </button>
          </form>
        </div>

        {/* Columna Derecha: Cuentas y Asignaciones */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Formulario: Crear cuenta para este productor */}
          <div className="glass-panel p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>👤</span> Crear Cuenta Administrativa
            </h2>
            <form action={createProducerUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="hidden" name="producerId" value={producer.id} />
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre Completo</label>
                <input 
                  name="name" 
                  type="text" 
                  required 
                  placeholder="Ej. Pedro Picapiedra"
                  className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email / Usuario</label>
                <input 
                  name="email" 
                  type="email" 
                  required 
                  placeholder="pedro@allstar.com"
                  className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Contraseña (Robusta)</label>
                <input 
                  name="password" 
                  type="password" 
                  required 
                  placeholder="••••••••"
                  className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rol de Cuenta</label>
                <select 
                  name="role" 
                  required
                  className="w-full bg-[#1e293b] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="PRODUCER_ADMIN">Productor Admin</option>
                  <option value="SUPER_ADMIN">Super Admin (Global)</option>
                </select>
              </div>
              <div className="md:col-span-2 pt-2">
                <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2 rounded-lg transition-colors">
                  Generar Cuenta y Asignar
                </button>
              </div>
            </form>
          </div>

          {/* Listado de usuarios y asignaciones */}
          <div className="glass-panel p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Usuarios Asociados ({producer.users.length})</h2>
            
            {producer.users.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No hay usuarios vinculados a este productor.</p>
            ) : (
              <div className="space-y-3">
                {producer.users.map((u) => (
                  <div key={u.id} className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                    <div>
                      <div className="font-bold text-white text-sm">{u.name}</div>
                      <div className="text-gray-400">{u.email}</div>
                      <div className="flex gap-2 mt-1">
                        <span className="bg-primary/20 text-primary border border-primary/25 px-2 py-0.5 rounded text-[10px] font-bold">
                          {u.role}
                        </span>
                        <span className={`border px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.isActive ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"
                        }`}>
                          {u.isActive ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                    </div>

                    {/* Reasignar productor */}
                    <form action={updateUserProducerAssignment} className="flex items-center gap-2 w-full md:w-auto">
                      <input type="hidden" name="userId" value={u.id} />
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">Asociar a:</span>
                      <select 
                        name="producerId"
                        defaultValue={producer.id}
                        className="bg-[#1e293b] border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
                      >
                        {allProducers.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button type="submit" className="bg-white/10 hover:bg-white/20 text-white font-bold px-2 py-1 rounded text-[10px] transition-colors">
                        Reasignar
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
