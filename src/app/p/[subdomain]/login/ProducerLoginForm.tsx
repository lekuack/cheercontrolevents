"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUserByProducer } from "@/app/admin/actions";

interface Props {
  producerId: string;
  producerName: string;
  producerLogo: string | null;
  subdomain: string;
}

export default function ProducerLoginForm({ producerId, producerName, producerLogo, subdomain }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginUserByProducer(email, password, producerId);

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      const { role, userId } = res;

      if (role === "STAFF") {
        router.push(`/staff?userId=${userId}`);
      } else if (role === "JUDGE") {
        router.push(`/judge?userId=${userId}`);
      } else if (role === "ANNOUNCER") {
        router.push(`/announcer?userId=${userId}`);
      } else if (role === "PRODUCER_ADMIN") {
        router.push("/admin");
      } else {
        router.push(`/p/${subdomain}`);
      }
    } catch {
      setError("Ocurrió un error inesperado. Intenta nuevamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050b18] p-4">
      {/* Logo del Productor */}
      <div className="mb-8 text-center">
        {producerLogo ? (
          <img src={producerLogo} alt={producerName} className="w-20 h-20 rounded-2xl object-cover border border-white/10 mx-auto mb-4 shadow-xl" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-violet-700/30 border border-primary/20 flex items-center justify-center text-4xl font-black text-white mx-auto mb-4">
            {producerName.charAt(0)}
          </div>
        )}
        <h1 className="text-xl font-black text-white">{producerName}</h1>
        <p className="text-xs text-gray-500 mt-1">Acceso operativo del equipo</p>
      </div>

      {/* Card de Login */}
      <div className="w-full max-w-sm glass-panel p-7 border border-white/5 rounded-2xl space-y-5">
        <div className="text-center">
          <h2 className="text-base font-bold text-white">Identificación</h2>
          <p className="text-xs text-gray-500 mt-1">Ingresa con tus datos de acceso asignados</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5 tracking-widest">
              Correo / Usuario
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="tu@correo.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1.5 tracking-widest">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="•••••"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-primary transition-colors"
            />
            <p className="text-[10px] text-gray-600 mt-1.5 text-right italic">
              Dejar en blanco si tienes acceso directo
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-sm font-bold rounded-xl mt-1"
          >
            {loading ? "Verificando acceso..." : "Ingresar al Evento →"}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-white/5">
          <Link
            href={`/p/${subdomain}`}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            ← Volver al portal de {producerName}
          </Link>
        </div>
      </div>

      <p className="text-[10px] text-gray-700 mt-8">
        Powered by CheerControl Events
      </p>
    </div>
  );
}
