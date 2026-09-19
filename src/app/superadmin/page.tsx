import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default async function SuperAdminPage() {
  const producers = await prisma.producer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { events: true, users: true }
      }
    }
  });

  async function createProducer(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const subdomain = formData.get("subdomain") as string;
    const logoUrl = formData.get("logoUrl") as string;
    
    if (!name || !subdomain) return;

    await prisma.producer.create({
      data: { name, subdomain, logoUrl: logoUrl || null }
    });
    
    revalidatePath("/superadmin");
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Gestión de Productores</h1>
          <p className="text-gray-400 mt-2">Administra los tenants (clientes) de tu plataforma SaaS.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de creación */}
        <div className="glass-panel p-6 col-span-1 h-fit">
          <h2 className="text-xl font-semibold mb-4">Nuevo Productor</h2>
          <form action={createProducer} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Nombre de Empresa</label>
              <input 
                name="name" 
                type="text" 
                required 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="Ej. All Star Pro"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Subdominio Único</label>
              <input 
                name="subdomain" 
                type="text" 
                required 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="allstarpro"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">URL del Logo (Opcional)</label>
              <input 
                name="logoUrl" 
                type="url" 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="https://ejemplo.com/logo.png"
              />
            </div>
            <button type="submit" className="w-full btn-primary mt-4">
              Crear Productor
            </button>
          </form>
        </div>

        {/* Lista de Productores */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Productores Activos ({producers.length})</h2>
          
          {producers.length === 0 ? (
            <div className="glass-panel p-8 text-center text-gray-400 border-dashed">
              No hay productores registrados aún.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {producers.map(producer => (
                <div key={producer.id} className="glass-panel p-5 relative overflow-hidden group flex flex-col justify-between">
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex items-center gap-4 mb-4 relative z-10">
                    {producer.logoUrl ? (
                      <img src={producer.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover bg-white/5" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl">🏢</div>
                    )}
                    <div>
                      <h3 className="text-lg font-bold text-white">{producer.name}</h3>
                      <p className="text-sm text-primary">@{producer.subdomain}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-400 border-t border-white/10 pt-4 relative z-10">
                    <span>{producer._count.events} Eventos</span>
                    <span>{producer._count.users} Usuarios</span>
                  </div>
                  
                  <div className="flex gap-2 relative z-10 mt-4">
                    <Link 
                      href={`/superadmin/producer/${producer.id}`}
                      className="flex-1 text-center bg-white/5 hover:bg-white/10 border border-white/10 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Ver Detalles
                    </Link>
                    <form action={async () => {
                      "use server";
                      const { toggleProducerStatus } = await import("./actions");
                      const fd = new FormData();
                      fd.append("producerId", producer.id);
                      await toggleProducerStatus(fd);
                    }}>
                      <button 
                        type="submit" 
                        title={producer.isActive ? "Deshabilitar" : "Habilitar"}
                        className={`p-2 rounded-lg border transition-colors ${
                          producer.isActive 
                            ? "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30 text-yellow-300" 
                            : "bg-green-500/10 hover:bg-green-500/20 border-green-500/30 text-green-300"
                        }`}
                      >
                        {producer.isActive ? "⏸️" : "▶️"}
                      </button>
                    </form>
                    <form action={async () => {
                      "use server";
                      const { deleteProducer } = await import("./actions");
                      const fd = new FormData();
                      fd.append("producerId", producer.id);
                      await deleteProducer(fd);
                    }} onSubmit="return confirm('¿Seguro que deseas eliminar este productor y todos sus datos?')">
                      <button 
                        type="submit" 
                        title="Eliminar"
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 transition-colors"
                      >
                        🗑️
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
