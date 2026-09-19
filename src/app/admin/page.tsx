import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createEvent } from "./actions";
import AdminEventList from "@/components/AdminEventList";
import LogoUploader from "@/components/LogoUploader";
import { cookies } from "next/headers";
import ProducerScopeSelector from "@/components/ProducerScopeSelector";

export default async function AdminPage() {
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
      where: { id: activeProducerId },
      include: { events: { orderBy: { createdAt: "desc" } } }
    });
  }

  if (!producer && user?.producerId) {
    producer = await prisma.producer.findUnique({
      where: { id: user.producerId },
      include: { events: { orderBy: { createdAt: "desc" } } }
    });
  }

  if (!producer) {
    producer = await prisma.producer.findFirst({
      include: { events: { orderBy: { createdAt: "desc" } } }
    });
  }

  if (!producer) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h1 className="text-3xl font-bold mb-4">No tienes un Productor asignado</h1>
        <p className="text-gray-400 mb-8">Debes crear un Productor en el Panel de Super Admin primero.</p>
        <Link href="/superadmin" className="btn-primary">Ir a Super Admin</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold">Mis Eventos</h1>
          <p className="text-gray-400 mt-2">Bienvenido, Productor: <span className="text-white font-semibold">{producer.name}</span></p>
        </div>
        {user?.role === "SUPER_ADMIN" && producers.length > 0 && (
          <ProducerScopeSelector producers={producers} activeProducerId={producer.id} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de creación */}
        <div className="glass-panel p-6 col-span-1 h-fit">
          <h2 className="text-xl font-semibold mb-4">Crear Nuevo Evento</h2>
          <form action={createEvent} className="space-y-4">
            <input type="hidden" name="producerId" value={producer.id} />
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nombre del Evento</label>
              <input
                name="name"
                type="text"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="Ej. Kings Cup 2026"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Fecha</label>
              <input
                name="date"
                type="date"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors [color-scheme:dark]"
              />
            </div>
            <LogoUploader
              name="logoUrl"
              label="Logo del Evento (Opcional)"
              placeholder="https://ejemplo.com/logo_evento.png"
            />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-gray-300 mb-1">Registros</label>
                <input
                  name="registrationZonesCount"
                  type="number"
                  required
                  min="1"
                  max="5"
                  defaultValue="1"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-primary transition-colors text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-300 mb-1">Calentamiento</label>
                <input
                  name="warmupZonesCount"
                  type="number"
                  required
                  min="1"
                  max="5"
                  defaultValue="1"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-primary transition-colors text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-300 mb-1">Springfloor</label>
                <input
                  name="springfloorZonesCount"
                  type="number"
                  required
                  min="1"
                  max="5"
                  defaultValue="1"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-primary transition-colors text-xs"
                />
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2.5 text-xs text-gray-300 hover:text-white cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="forceSameZone"
                  className="w-4 h-4 rounded bg-[#1e293b] border-white/10 text-primary focus:ring-primary"
                />
                <span className="font-semibold text-primary">🔗 Forzar misma zona para Calentamiento y Springfloor</span>
              </label>
            </div>
            <button type="submit" className="w-full btn-primary mt-2">
              Crear Evento
            </button>
          </form>
        </div>

        {/* Lista de Eventos */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Eventos Activos ({producer.events.length})</h2>

          {producer.events.length === 0 && (
            <div className="glass-panel p-6 text-center text-gray-400 border-dashed text-sm">
              Aún no has creado ningún evento regular.
            </div>
          )}
          <AdminEventList events={producer.events} producerId={producer.id} />
        </div>
      </div>
    </div>
  );
}
