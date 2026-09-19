"use client";

import { useState } from "react";
import { loginDemoPin } from "@/app/admin/actions";

interface RoleOption {
  id: string;
  role: string;
  station?: string;
  isSupervisor?: boolean;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: "reg",
    role: "STAFF",
    station: "REGISTRATION",
    title: "Mesa de Registro",
    description: "Check-in inicial y entrega de acreditaciones de equipos",
    icon: "📋",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400"
  },
  {
    id: "warm",
    role: "STAFF",
    station: "WARMUP_1",
    title: "Zona de Calentamiento",
    description: "Control de tiempo y llamado de equipos a calentamiento",
    icon: "🔥",
    color: "from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400"
  },
  {
    id: "spring",
    role: "STAFF",
    station: "SPRINGFLOOR",
    title: "Tapete Springfloor",
    description: "Prueba de pista y adaptación previo al escenario",
    icon: "🤸",
    color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400"
  },
  {
    id: "wait",
    role: "STAFF",
    station: "WAITING",
    title: "Boca de Escenario",
    description: "Formación de equipos listos para ingresar a pista",
    icon: "🚪",
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400"
  },
  {
    id: "judge",
    role: "JUDGE",
    title: "Mesa de Jueces",
    description: "Evaluación y confirmación de disponibilidad para juzgar",
    icon: "⚖️",
    color: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400"
  },
  {
    id: "announcer",
    role: "ANNOUNCER",
    title: "Animador / Vocero",
    description: "Anuncio de rutina en vivo y lectura del cronograma",
    icon: "🎙️",
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400"
  },
  {
    id: "supervisor",
    role: "SUPERVISOR",
    isSupervisor: true,
    title: "Supervisor General",
    description: "Vista de control global de todas las estaciones",
    icon: "👑",
    color: "from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-400"
  },
  {
    id: "screen",
    role: "SCREEN",
    title: "Pantalla Pública / TV",
    description: "Vista del cronograma en vivo y resultados para el público",
    icon: "📺",
    color: "from-teal-500/20 to-teal-600/10 border-teal-500/30 text-teal-400"
  }
];

export default function DemoPinForm() {
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"PIN" | "ROLE">("PIN");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim().length !== 4) {
      setError("Por favor ingresa un PIN válido de 4 dígitos.");
      return;
    }
    setError(null);
    setStep("ROLE");
  };

  const handleSelectRole = async (opt: RoleOption) => {
    setLoading(true);
    setError(null);

    try {
      const res = await loginDemoPin(pin, opt.role, opt.station, opt.isSupervisor);
      if (res.error) {
        setError(res.error);
        setStep("PIN");
        setLoading(false);
        return;
      }

      if (res.targetUrl) {
        window.location.href = res.targetUrl;
      }
    } catch {
      setError("Ocurrió un error al ingresar al puesto de capacitación.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Indicador superior */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold border border-primary/30 mb-3">
          🧪 Entorno de Capacitación CheerControl
        </div>
        <h2 className="text-3xl font-black text-white">Prueba Interactiva en Vivo</h2>
        <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
          {step === "PIN" 
            ? "Ingresa el PIN de 4 dígitos proporcionado por la administración para acceder a la capacitación." 
            : "Selecciona el puesto operativo que deseas simular hoy."}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold text-center">
          ⚠️ {error}
        </div>
      )}

      {step === "PIN" ? (
        <form onSubmit={handleVerifyPin} className="space-y-6 max-w-sm mx-auto">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 text-center">
              PIN de Acceso (4 Dígitos)
            </label>
            <input
              type="text"
              maxLength={4}
              pattern="[0-9]*"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="0 0 0 0"
              autoFocus
              className="w-full text-center text-4xl font-mono font-black tracking-[0.4em] bg-white/5 border-2 border-white/15 focus:border-primary text-white rounded-xl py-4 transition-all focus:outline-none focus:ring-4 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={pin.length !== 4}
            className="w-full btn-primary py-3.5 text-base font-bold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Continuar a Selección de Rol →
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <span className="text-xs text-gray-400 font-mono">PIN: <strong className="text-white">{pin}</strong></span>
            <button
              onClick={() => setStep("PIN")}
              className="text-xs text-primary hover:underline font-bold"
            >
              ← Cambiar PIN
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleSelectRole(opt)}
                disabled={loading}
                className={`p-4 rounded-xl border bg-gradient-to-br ${opt.color} hover:scale-[1.02] active:scale-[0.98] transition-all text-left group flex items-start gap-3.5`}
              >
                <span className="text-3xl shrink-0 group-hover:scale-110 transition-transform">{opt.icon}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-white text-base leading-tight group-hover:text-primary transition-colors">
                    {opt.title}
                  </h3>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center py-4 text-primary text-sm font-bold animate-pulse">
              ⏳ Preparando estación de prueba y configurando sesión...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
