import { prisma } from "@/lib/prisma";
import { createInstitution } from "../actions";
import InstitutionCard from "@/components/InstitutionCard";
import LogoUploader from "@/components/LogoUploader";
import { cookies } from "next/headers";
import ProducerScopeSelector from "@/components/ProducerScopeSelector";

export default async function AdminInstitutionsPage() {
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

  const institutions = await prisma.institution.findMany({
    where: { producerId: producer.id },
    include: {
      teams: { orderBy: { name: "asc" } }
    },
    orderBy: { name: "asc" }
  });

  const totalTeams = institutions.reduce((acc, inst) => acc + inst.teams.length, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-white">🏅 Clubes y Equipos</h1>
          <p className="text-gray-400 mt-1">
            {institutions.length} club{institutions.length !== 1 ? "es" : ""} · {totalTeams} equipo{totalTeams !== 1 ? "s" : ""} registrados
          </p>
        </div>
        {user?.role === "SUPER_ADMIN" && producers.length > 0 && (
          <ProducerScopeSelector producers={producers} activeProducerId={producer.id} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de creación de Club */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 sticky top-4">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>🏅</span> Nuevo Club / Institución
            </h2>
            <form action={createInstitution} className="space-y-4">
              <input type="hidden" name="producerId" value={producer.id} />
              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Nombre del Club <span className="text-red-400">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Ej. Panthers Cheer Club"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Tipo de Club / Institución</label>
                <select
                  name="type"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="All Stars">All Stars</option>
                  <option value="School">School</option>
                  <option value="University">University</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Ciudad</label>
                <input
                  name="city"
                  type="text"
                  placeholder="Ej. Santiago"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <LogoUploader
                name="logoUrl"
                label="Logo del Club / Institución"
              />
              <button
                type="submit"
                className="w-full btn-primary mt-2"
              >
                ➕ Crear Club
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Clubes */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-white">
            Clubes Registrados ({institutions.length})
          </h2>

          {institutions.length === 0 ? (
            <div className="glass-panel p-12 text-center border-dashed">
              <div className="text-5xl mb-4">🏅</div>
              <p className="text-gray-400 text-sm">
                No hay clubes registrados aún. Crea el primero a la izquierda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {institutions.map(inst => (
                <InstitutionCard 
                  key={inst.id} 
                  institution={inst} 
                  allInstitutions={institutions.map(i => ({ id: i.id, name: i.name }))} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
