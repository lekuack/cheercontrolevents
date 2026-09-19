"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, createTestSuperAdmin } from "@/app/admin/actions";
import Link from "next/link";

export default function LoginForm() {
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
      const res = await loginUser(email, password);

      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      const role = res.role;
      const userId = res.userId;

      let targetUrl = "/";
      if (role === "SUPER_ADMIN" || role === "PRODUCER_ADMIN") {
        targetUrl = "/admin";
      } else if (role === "STAFF") {
        targetUrl = `/staff?userId=${userId}`;
      } else if (role === "JUDGE") {
        targetUrl = `/judge?userId=${userId}`;
      } else if (role === "ANNOUNCER") {
        targetUrl = `/announcer?userId=${userId}`;
      }

      window.location.href = targetUrl;
    } catch {
      setError("Ocurrió un error inesperado al intentar iniciar sesión.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial-gradient p-4">
      <div className="w-full max-w-md glass-panel p-8 border-t-4 border-t-primary space-y-6">
        <div className="text-center">
          <span className="text-3xl">🏟️</span>
          <h2 className="text-2xl font-black text-white mt-2">Acceso CheerControl</h2>
          <p className="text-xs text-gray-400 mt-1">Ingresa tus credenciales operativas asignadas por el productor.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/35 p-3.5 rounded-lg text-xs text-red-400 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-300 font-bold uppercase mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ejemplo@evento.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs text-gray-300 font-bold uppercase">
                Contraseña
              </label>
              <span className="text-[10px] text-gray-500 italic">
                Omitir si tienes Acceso Directo
              </span>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors text-sm font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-2.5 text-sm font-bold mt-2"
          >
            {loading ? "Verificando..." : "Ingresar al Panel"}
          </button>
        </form>

        <div className="flex flex-col gap-2 border-t border-white/5 pt-4 text-center">

          <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors mt-1">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
