import { Team, Institution } from "@prisma/client";

type TeamWithInstitution = Team & { institution: Institution };

interface Props {
  teams: TeamWithInstitution[];
  eventName?: string;
  posterBgColorFrom?: string;
  posterBgColorVia?: string;
  posterBgColorTo?: string;
  posterTextColor1?: string;
  posterTextColor2?: string;
  posterTextColor3?: string;
}

// Tamaños más grandes y con impacto visual — rango compacto pero prominente
const SIZES = [
  "text-lg font-bold",
  "text-xl font-bold",
  "text-xl font-extrabold",
  "text-2xl font-extrabold",
  "text-2xl font-black",
  "text-3xl font-black",
  "text-3xl font-black tracking-tight",
  "text-4xl font-black tracking-tight",
];

const OPACITIES = [
  "opacity-60",
  "opacity-70",
  "opacity-75",
  "opacity-80",
  "opacity-85",
  "opacity-90",
  "opacity-95",
  "opacity-100",
];

// Hash del nombre → número determinista entre 0 y n-1
function nameHash(name: string, n: number): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = (h * 16777619) >>> 0; // FNV-1a 32-bit
  }
  return h % n;
}

// Shuffle determinista basado en hash de nombre
function deterministicShuffle<T extends { name: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const ha = nameHash(a.name + "shuffle", 99999);
    const hb = nameHash(b.name + "shuffle", 99999);
    return ha - hb;
  });
}

export default function LineupPoster({
  teams,
  eventName,
  posterBgColorFrom = "#09101f",
  posterBgColorVia = "#080d1a",
  posterBgColorTo = "#050b18",
  posterTextColor1 = "#ffffff",
  posterTextColor2 = "#e2e8f0",
  posterTextColor3 = "#94a3b8"
}: Props) {
  if (teams.length === 0) return null;

  const shuffled = deterministicShuffle(teams);

  // Arreglo de los 3 colores seleccionados para iterar aleatoriamente
  const customColors = [posterTextColor1, posterTextColor2, posterTextColor3];

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-white/5 px-6 pt-8 pb-10"
      style={{
        background: `linear-gradient(to bottom, ${posterBgColorFrom}, ${posterBgColorVia}, ${posterBgColorTo})`
      }}
    >
      {/* Glows decorativos de fondo */}
      <div className="absolute inset-0 pointer-events-none select-none">
        <div className="absolute top-4 left-1/4 w-64 h-32 bg-primary/6 blur-[70px] rounded-full" />
        <div className="absolute bottom-4 right-1/4 w-64 h-32 bg-violet-600/6 blur-[70px] rounded-full" />
      </div>

      <div className="relative z-10">
        {/* Cabecera estilo afiche */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-3 text-gray-600 text-[9px] font-bold uppercase tracking-[0.35em]">
            <div className="h-px w-12 bg-white/8" />
            <span>⭐ Line Up ⭐</span>
            <div className="h-px w-12 bg-white/8" />
          </div>
          {eventName && (
            <p className="text-[9px] text-gray-700 mt-1.5 tracking-[0.25em] uppercase">{eventName}</p>
          )}
        </div>

        {/* Nombres estilo afiche — mezclados y variados */}
        <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-2.5 text-center">
          {shuffled.map((team, idx) => {
            const sizeIdx = nameHash(team.name + "size", SIZES.length);
            const opacIdx = nameHash(team.name + "opacity", OPACITIES.length);
            const colorIdx = nameHash(team.name + "color", customColors.length);

            const sizeClass = SIZES[sizeIdx];
            const opacClass = OPACITIES[opacIdx];
            const teamColor = customColors[colorIdx];

            return (
              <span
                key={team.id}
                className={`${sizeClass} ${opacClass} hover:opacity-100 transition-all duration-200 cursor-default leading-tight drop-shadow-md`}
                style={{ color: teamColor }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--primary-color, #a855f7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = teamColor;
                }}
              >
                {team.name}
              </span>
            );
          })}
        </div>

        {/* Separador y contador */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-3 text-gray-700 text-[9px] font-bold uppercase tracking-[0.3em]">
            <div className="h-px w-8 bg-white/5" />
            <span>{teams.length} Equipo{teams.length !== 1 ? "s" : ""}</span>
            <div className="h-px w-8 bg-white/5" />
          </div>
        </div>
      </div>
    </section>
  );
}
