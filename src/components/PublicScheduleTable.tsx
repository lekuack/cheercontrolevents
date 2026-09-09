import { Schedule, Team, Institution, EventSession } from "@prisma/client";

type ScheduleWithRelations = Schedule & {
  team?: (Team & { institution: Institution }) | null;
};

interface Props {
  schedules: ScheduleWithRelations[];
  session?: EventSession | null;
  registrationZonesCount?: number;
  warmupZonesCount?: number;
  springfloorZonesCount?: number;
  startingNumber?: number;
  
  tableHeaderBgColor?: string;
  tableHeaderTextColor?: string;
  tableRowBgColor?: string;
  tableRowHoverBgColor?: string;
  tableRowTextColor?: string;
}

export default function PublicScheduleTable({
  schedules,
  registrationZonesCount = 1,
  warmupZonesCount = 1,
  springfloorZonesCount = 1,
  startingNumber = 1,
  tableHeaderBgColor = "rgba(255, 255, 255, 0.05)",
  tableHeaderTextColor = "#9ca3af",
  tableRowBgColor = "transparent",
  tableRowHoverBgColor = "rgba(255, 255, 255, 0.03)",
  tableRowTextColor = "#ffffff"
}: Props) {
  const formatTime = (d: Date | null | string | undefined) =>
    d ? new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "–";

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-xl text-sm">
        El cronograma aún no ha sido publicado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full text-left border-collapse text-sm">
        <thead style={{ backgroundColor: tableHeaderBgColor, color: tableHeaderTextColor }}>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wider">
            <th className="px-0 py-1 min-w-10">#</th>
            <th className="px-0 py-1 min-w-60">Equipo</th>
            <th className="px-0 py-1 text-center min-w-[140px]">Cat/Nivel</th>
            <th className="px-0 py-1 text-center">
              <small>Registro</small>
              {registrationZonesCount > 1 && <span className="ml-1 text-blue-400 text-[9px]">Zona</span>}
            </th>
            <th className="px-0 py-1 text-center">
              <small>Calent. 1</small>
              {warmupZonesCount > 1 && <span className="ml-1 text-purple-400 text-[9px]">Zona</span>}
            </th>
            <th className="px-0 py-1 text-center">
              <small>Calent. 2</small>
              {springfloorZonesCount > 1 && <span className="ml-1 text-pink-400 text-[9px]">Zona</span>}
            </th>
            <th className="px-2 py-1 font-bold rounded-t-lg text-center">Competencia</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            let currentTeamNumber = startingNumber;
            return schedules.map((item) => {
              const isBreak = item.type === "BREAK";
              let displayNum = null;
              if (!isBreak) {
                displayNum = currentTeamNumber++;
              }

              return (
                <tr
                  key={item.id}
                  className={`border-b border-white/5 transition-colors ${isBreak
                    ? "bg-warning/5"
                    : item.isExhibition
                      ? "bg-purple-900/10"
                      : ""
                    }`}
                  style={!isBreak && !item.isExhibition ? { backgroundColor: tableRowBgColor, color: tableRowTextColor } : {}}
                  onMouseEnter={(e) => {
                    if (!isBreak && !item.isExhibition) e.currentTarget.style.backgroundColor = tableRowHoverBgColor;
                  }}
                  onMouseLeave={(e) => {
                    if (!isBreak && !item.isExhibition) e.currentTarget.style.backgroundColor = tableRowBgColor;
                  }}
                >
                  {isBreak ? (
                    <td colSpan={7} className="px-0 py-0 text-center">
                      <div className="font-bold text-warning inline-flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
                        {item.showBreakTitle ? item.breakTitle : "Actividad"}
                      </div>
                    </td>
                  ) : (
                    <>
                      {/* Número */}
                      <td className="px-0 py-0 font-bold text-gray-600 text-xs">{displayNum}</td>

                      {/* Nombre */}
                      <td className="px-0 py-0 min-w-[280px]">
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5 flex-wrap text-sm">
                            {item.team?.name}
                            {item.isExhibition && (
                              <span className="text-[9px] text-purple-300 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                                Exhibición
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {item.team?.institution?.name}
                            {item.team?.institution?.city && ` · ${item.team.institution.city}`}
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="px-0 py-0 text-center min-w-[140px]">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-white text-xs font-semibold">{item.team?.category} {item.team?.division}</span>
                          <span className="text-gray-600 text-[9px] uppercase tracking-wider">{item.team?.level}</span>
                        </div>
                      </td>

                      {/* Registro */}
                      <td className="px-4 py-3 opacity-90">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs" suppressHydrationWarning>{formatTime(item.scheduledRegistration)}</span>
                          {registrationZonesCount > 1 && item.registrationZone && (
                            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] px-1.5 py-0.5 rounded font-bold">
                              {item.registrationZone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Warmup */}
                      <td className="px-4 py-3 opacity-90">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs" suppressHydrationWarning>{formatTime(item.scheduledWarmup1)}</span>
                          {warmupZonesCount > 1 && item.warmupZone && (
                            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] px-1.5 py-0.5 rounded font-bold">
                              {item.warmupZone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Springfloor */}
                      <td className="px-4 py-3 opacity-90">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs" suppressHydrationWarning>{formatTime(item.scheduledSpringfloor)}</span>
                          {springfloorZonesCount > 1 && item.springfloorZone && (
                            <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[9px] px-1.5 py-0.5 rounded font-bold">
                              {item.springfloorZone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Competencia — columna destacada */}
                      <td className="px-4 py-3 bg-white/10 first:rounded-tl-lg last:rounded-bl-lg">
                        <span className="font-black font-mono text-sm" suppressHydrationWarning>
                          {formatTime(item.scheduledPerformance)}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              );
            });
          })()}
        </tbody>
      </table>
    </div>
  );
}
