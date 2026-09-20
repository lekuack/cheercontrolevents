import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cookies } from "next/headers";
import { updateScheduleStatus, toggleHitZeroAwarded } from "@/app/admin/actions";
import CountdownTimer from "@/components/CountdownTimer";
import SocketSync from "@/components/SocketSync";
import StaffScheduleList from "@/components/StaffScheduleList";
import SupervisorDashboard from "@/components/SupervisorDashboard";
import DemoStationSwitcher from "@/components/DemoStationSwitcher";

interface SearchParams {
  userId?: string;
  activeStation?: string;
}

export default async function StaffEventTrackerPage({
  params,
  searchParams
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { eventId } = await params;
  const { userId: searchUserId, activeStation } = await searchParams;
  const cookieStore = await cookies();
  const userId = searchUserId || cookieStore.get("userId")?.value;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      schedules: {
        include: { team: { include: { institution: true } } },
        orderBy: { orderIndex: "asc" }
      }
    }
  });

  if (!event) return <div className="text-white p-4">Evento no encontrado</div>;

  // Filtrar breaks del cronograma para el staff
  event.schedules = event.schedules.filter(s => s.type !== "BREAK" && s.team) as any;

  // Si no hay un userId asignado en la URL (simulación), mostramos selector de Staffs
  if (!userId) {
    const activeStaffs = await prisma.user.findMany({
      where: {
        producerId: event.producerId,
        role: "STAFF"
      }
    });

    return (
      <div className="space-y-6">
        {event.isDemo && (
          <DemoStationSwitcher
            eventId={event.id}
            demoPin={event.demoPin || "1234"}
            activeRole="STAFF"
          />
        )}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/staff" className="text-xl bg-white/10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20">
            ←
          </Link>
          <div>
            <h2 className="text-xl font-bold text-white">{event.name}</h2>
            <p className="text-sm text-gray-400">Identificación de Personal</p>
          </div>
        </div>

        <div className="glass-panel p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">Selecciona tu Perfil de Staff</h3>
          <p className="text-sm text-gray-400">
            Para continuar, selecciona tu nombre de la lista. Tus estaciones de trabajo están predefinidas por el Productor.
          </p>

          {activeStaffs.length === 0 ? (
            <div className="bg-warning/10 border border-warning/30 p-4 rounded-lg text-sm text-warning">
              No hay cuentas de Staff configuradas para este productor. Pídele al Administrador que cree cuentas de Staff y les asigne estaciones en el panel de control.
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              {activeStaffs.map(staff => {
                const rawUserStations = staff.station ? staff.station.split(",") : [];
                const getZoneLetter = (index: number) => String.fromCharCode(65 + index);
                const activeWarmupZones = Array.from({ length: event.warmupZonesCount || 1 }, (_, i) => `WARMUP_1_${getZoneLetter(i)}`);
                const activeSpringfloorZones = Array.from({ length: event.springfloorZonesCount || 1 }, (_, i) => `SPRINGFLOOR_${getZoneLetter(i)}`);

                // Filtrar estaciones legacy o no habilitadas para este evento
                const userStations = rawUserStations.filter(st => {
                  if (st === "WARMUP_1" || st === "SPRINGFLOOR") return false; // legacy, ignorar
                  if (st.startsWith("WARMUP_1_")) return activeWarmupZones.includes(st);
                  if (st.startsWith("SPRINGFLOOR_")) return activeSpringfloorZones.includes(st);
                  return true;
                });

                return (
                  <Link
                    key={staff.id}
                    href={`/staff/${eventId}?userId=${staff.id}`}
                    className="block w-full text-left glass-panel p-4 hover:border-primary/50 hover:bg-white/5 active:bg-white/10 transition-all"
                  >
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{staff.name}</span>
                      {staff.isSupervisor && (
                        <span className="text-[9px] bg-primary/20 text-primary font-extrabold px-1.5 py-0.5 rounded-full">PRINCIPAL</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {userStations.length === 0 ? (
                        <span className="text-[10px] text-gray-500 italic">Sin estaciones válidas asignadas</span>
                      ) : userStations.map(st => {
                        let label = st;
                        if (st === "RUNNER") label = "🏃 Buscador";
                        else if (st === "REGISTRATION") label = "📥 Registro";
                        else if (st.startsWith("WARMUP_1_")) label = `🔥 Calentamiento ${st.replace("WARMUP_1_", "")}`;
                        else if (st.startsWith("SPRINGFLOOR_")) label = `🤸 Springfloor ${st.replace("SPRINGFLOOR_", "")}`;
                        else if (st === "TRANSIT") label = "🔀 Trayecto";
                        else if (st === "COMPETING") label = "🏟️ Competencia";

                        return (
                          <span key={st} className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 py-0.5 rounded">
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Si hay un userId, buscamos los detalles del Staff
  const currentStaff = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!currentStaff || (currentStaff.role !== "STAFF" && currentStaff.role !== "ADMIN" && currentStaff.role !== "SUPERADMIN")) {
    const activeStaffs = await prisma.user.findMany({
      where: {
        producerId: event.producerId,
        role: "STAFF"
      }
    });

    return (
      <div className="space-y-6">
        {event.isDemo && (
          <DemoStationSwitcher
            eventId={event.id}
            demoPin={event.demoPin || "1234"}
            activeRole="STAFF"
          />
        )}
        <div className="glass-panel p-8 text-center space-y-4 max-w-lg mx-auto my-12 border border-warning/30 bg-slate-900/90 rounded-2xl shadow-2xl">
          <div className="w-16 h-16 bg-warning/20 text-warning rounded-full flex items-center justify-center text-3xl mx-auto">
            👤
          </div>
          <h2 className="text-2xl font-black text-white">Sesión de Staff requerida</h2>
          <p className="text-sm text-gray-300">
            La cuenta actual <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-amber-300">({currentStaff ? currentStaff.role : "Sesión expirada"})</span> no cuenta con el perfil de Staff asignado para este control operacional.
          </p>

          {activeStaffs.length > 0 && (
            <div className="pt-4 border-t border-white/10 space-y-3">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Selecciona un perfil de Staff activo:</p>
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {activeStaffs.map(st => (
                  <Link
                    key={st.id}
                    href={`/staff/${event.id}?userId=${st.id}`}
                    className="block p-3 bg-white/5 hover:bg-primary/20 border border-white/10 rounded-xl text-left transition-colors"
                  >
                    <span className="font-bold text-white block text-sm">{st.name}</span>
                    <span className="text-[10px] text-gray-400">{st.station || "Estación por defecto"}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4">
            <Link
              href="/staff"
              className="inline-block bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary-light transition-all text-sm shadow-lg"
            >
              🏠 Volver a Selección de Evento
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Las estaciones asignadas vienen separadas por comas (ej. "RUNNER,REGISTRATION")
  // Las estaciones asignadas vienen separadas por comas (ej. "RUNNER,REGISTRATION")
  const rawStations = currentStaff.station ? currentStaff.station.split(",") : [];

  // Filtrar estaciones asignadas según la configuración de zonas de este evento
  const getZoneLetter = (index: number) => String.fromCharCode(65 + index);
  const activeWarmupZones = Array.from({ length: event.warmupZonesCount || 1 }, (_, i) => `WARMUP_1_${getZoneLetter(i)}`);
  const activeSpringfloorZones = Array.from({ length: event.springfloorZonesCount || 1 }, (_, i) => `SPRINGFLOOR_${getZoneLetter(i)}`);

  const assignedStations = rawStations.map(s => {
    if (s === "WARMUP_1") return "WARMUP_1_A";
    if (s === "SPRINGFLOOR") return "SPRINGFLOOR_A";
    return s;
  }).filter(stationVal => {
    if (stationVal.startsWith("WARMUP_1_")) {
      return activeWarmupZones.includes(stationVal);
    }
    if (stationVal.startsWith("SPRINGFLOOR_")) {
      return activeSpringfloorZones.includes(stationVal);
    }
    return true;
  });

  if (assignedStations.length === 0) {
    // Si es supervisor, mostrar el panel de control general aunque no tenga estación asignada
    if (currentStaff.isSupervisor) {
      return (
        <div className="space-y-6">
          <SocketSync eventId={eventId} />
          <div className="glass-panel p-4 border-l-4 border-l-warning flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-400">Supervisor Principal</div>
              <div className="font-bold text-white text-lg flex items-center gap-2">
                <span>👑 {currentStaff.name}</span>
                <span className="text-[9px] bg-warning/20 text-warning font-extrabold px-1.5 py-0.5 rounded-full">SUPERVISOR</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{event.name}</div>
            </div>
            <Link
              href={`/staff/${eventId}`}
              className="text-[11px] bg-white/5 hover:bg-white/10 text-gray-300 py-1 px-2.5 rounded-full transition-colors"
            >
              Cerrar Sesión
            </Link>
          </div>
          <SupervisorDashboard event={{
            id: event.id,
            name: event.name,
            globalAlert: event.globalAlert ?? null,
            globalAlertAt: event.globalAlertAt ?? null,
            warmupZonesCount: event.warmupZonesCount,
            springfloorZonesCount: event.springfloorZonesCount,
            forceSameZone: event.forceSameZone,
            schedules: event.schedules as any
          }} />
        </div>
      );
    }

    // Staff normal sin estaciones
    return (
      <div className="glass-panel p-6 text-center space-y-4">
        <p className="text-white">Este usuario no tiene ninguna estación asignada o las asignadas pertenecen a zonas no habilitadas para este evento.</p>
        <Link href={`/staff/${eventId}`} className="btn-primary inline-block">Volver</Link>
      </div>
    );
  }

  // Determinar estación activa actual (por defecto la primera asignada)
  const currentStation = (activeStation && assignedStations.includes(activeStation)) 
    ? activeStation 
    : assignedStations[0];

  const stationNames: Record<string, string> = {
    "RUNNER": "🏃 Buscador de Equipos (Pre-Registro)",
    "REGISTRATION": "📥 Registro",
    "WARMUP_1": "🔥 Calentamiento",
    "SPRINGFLOOR": "🤸 Área de Springfloor",
    "TRANSIT": "🔀 Trayecto / Traslado (Calentamiento a Pista)",
    "WAITING": "🚪 Boca de Escenario / En Espera",
    "COMPETING": "🏟️ Pista de Competencia"
  };

  const getFilteredSchedules = (schedules: typeof event.schedules) => {
    let filtered: typeof schedules = [];
    if (currentStation === "RUNNER") {
      filtered = schedules.filter(s => s.status === "PENDING");
    } else if (currentStation === "REGISTRATION") {
      filtered = schedules.filter(s => ["PENDING", "IN_REGISTRATION"].includes(s.status));
    } else if (currentStation.startsWith("WARMUP_1_") || currentStation === "WARMUP_1") {
      const zone = currentStation.replace("WARMUP_1_", "");
      filtered = schedules.filter(s => 
        ["REGISTERED", "ARRIVED_WARMUP", "WARMING_UP", "FINISHED_WARMUP"].includes(s.status) &&
        (currentStation === "WARMUP_1" || s.warmupZone === zone)
      );
    } else if (currentStation.startsWith("SPRINGFLOOR_") || currentStation === "SPRINGFLOOR") {
      const zone = currentStation.replace("SPRINGFLOOR_", "");
      filtered = schedules.filter(s =>
        ["FINISHED_WARMUP", "ARRIVED_SPRINGFLOOR", "WARMING_UP_SPRINGFLOOR", "FINISHED_SPRINGFLOOR"].includes(s.status) &&
        (currentStation === "SPRINGFLOOR" || s.springfloorZone === zone)
      );
    } else if (currentStation === "TRANSIT") {
      filtered = schedules.filter(s => ["FINISHED_SPRINGFLOOR", "IN_TRANSIT"].includes(s.status));
    } else if (currentStation === "WAITING" || currentStation === "COMPETING") {
      const activeTeams = schedules.filter(s => ["IN_TRANSIT", "ARRIVED_COMPETITION", "WAITING", "COMPETING"].includes(s.status));
      const finishedTeams = schedules.filter(s => s.status === "FINISHED");
      filtered = [...activeTeams, ...finishedTeams];
    } else {
      filtered = schedules;
    }

    // Mover equipos finalizados (FINISHED) al final de la lista, manteniendo el orden de los activos arriba
    const active = filtered.filter(s => s.status !== "FINISHED");
    const finished = filtered.filter(s => s.status === "FINISHED");
    return [...active, ...finished];
  };

  const filteredSchedules = getFilteredSchedules(event.schedules);

  // Obtener el siguiente equipo que lógicamente debería entrar a esta estación (para validar orden)
  const getNextExpectedTeam = (schedules: typeof event.schedules, station: string) => {
    if (station === "RUNNER") return schedules.find(s => s.status === "PENDING");
    if (station === "REGISTRATION") return schedules.find(s => ["PENDING", "IN_REGISTRATION"].includes(s.status));
    if (station.startsWith("WARMUP_1_") || station === "WARMUP_1") {
      const zone = station.replace("WARMUP_1_", "");
      return schedules.find(s =>
        ["REGISTERED", "ARRIVED_WARMUP", "WARMING_UP"].includes(s.status) &&
        (station === "WARMUP_1" || s.warmupZone === zone)
      );
    }
    if (station.startsWith("SPRINGFLOOR_") || station === "SPRINGFLOOR") {
      const zone = station.replace("SPRINGFLOOR_", "");
      return schedules.find(s =>
        ["FINISHED_WARMUP", "ARRIVED_SPRINGFLOOR", "WARMING_UP_SPRINGFLOOR"].includes(s.status) &&
        (station === "SPRINGFLOOR" || s.springfloorZone === zone)
      );
    }
    if (station === "TRANSIT") return schedules.find(s => ["FINISHED_SPRINGFLOOR", "IN_TRANSIT"].includes(s.status));
    if (station === "COMPETING") return schedules.find(s => ["ARRIVED_COMPETITION", "WAITING"].includes(s.status));
    return null;
  };
  const nextExpectedTeam = getNextExpectedTeam(event.schedules, currentStation);

  // Buscar si hay algún equipo actualmente en competencia (para la cabecera de la pista)
  const currentlyCompeting = event.schedules.find(s => s.status === "COMPETING");

  const allStatuses = [
    { value: "PENDING", label: "Pendiente" },
    { value: "IN_REGISTRATION", label: "En Registro" },
    { value: "REGISTERED", label: "Registrado" },
    { value: "ARRIVED_WARMUP", label: "Llegada Calentamiento" },
    { value: "WARMING_UP", label: "Calentando" },
    { value: "FINISHED_WARMUP", label: "Calentamiento Finalizado" },
    { value: "ARRIVED_SPRINGFLOOR", label: "Llegada Springfloor" },
    { value: "WARMING_UP_SPRINGFLOOR", label: "Calentando Springfloor" },
    { value: "FINISHED_SPRINGFLOOR", label: "Springfloor Finalizado" },
    { value: "IN_TRANSIT", label: "En Traslado" },
    { value: "ARRIVED_COMPETITION", label: "Llegada Competencia" },
    { value: "WAITING", label: "En Espera / Boca Escenario" },
    { value: "COMPETING", label: "Compitiendo" },
    { value: "FINISHED", label: "Finalizado" }
  ];

  // Lógica para detectar si el escenario está vacío y si hay retraso
  const hasCompeting = event.schedules.some(s => s.status === "COMPETING");
  const hasWaiting = event.schedules.some(s => s.status === "WAITING");
  const isStageEmpty = !hasCompeting && !hasWaiting;

  // Encontrar el primer equipo pendiente de competir
  const nextScheduledTeam = event.schedules.find(s => !["FINISHED", "COMPETING"].includes(s.status));
  const isEventDelayed = nextScheduledTeam && nextScheduledTeam.scheduledPerformance && new Date() > new Date(nextScheduledTeam.scheduledPerformance);

  // Equipos con Hit Zero para alertas de Boca de Escenario
  const pendingHitZeroStaff = event.schedules.filter(s => s.isHitZero && !s.hitZeroAwarded);

  return (
    <div className="space-y-6">
      {event.isDemo && (
        <DemoStationSwitcher
          eventId={event.id}
          demoPin={event.demoPin || "1234"}
          activeRole={currentStaff.isSupervisor ? "SUPERVISOR" : "STAFF"}
          activeStation={currentStation}
        />
      )}
      <SocketSync eventId={eventId} />

      {/* Banner de Alerta Global del Supervisor */}
      {event.globalAlert && (
        <div className="bg-red-500/15 border-2 border-red-500/70 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
          <span className="text-2xl shrink-0">🚨</span>
          <div>
            <div className="text-[10px] text-red-400 font-extrabold uppercase tracking-widest mb-1">Alerta del Supervisor</div>
            <p className="text-red-200 text-sm font-semibold">{event.globalAlert}</p>
            {event.globalAlertAt && (
              <p className="text-[10px] text-red-500 mt-1">
                {new Date(event.globalAlertAt).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Cabecera del Staff */}
      <div className="glass-panel p-4 border-l-4 border-l-primary flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs text-gray-400">Personal Activo</div>
            <div className="font-bold text-white text-lg flex items-center gap-2">
              <span>{currentStaff.name}</span>
              {currentStaff.isSupervisor && (
                <span className="text-[9px] bg-primary/20 text-primary font-extrabold px-1.5 py-0.5 rounded-full">SUPERVISOR</span>
              )}
            </div>
          </div>
          <Link 
            href={`/staff/${eventId}`}
            className="text-[11px] bg-white/5 hover:bg-white/10 text-gray-300 py-1 px-2.5 rounded-full transition-colors"
          >
            Cerrar Sesión
          </Link>
        </div>

        {/* Tab Bar si el usuario tiene asignadas múltiples estaciones */}
        {assignedStations.length > 1 && (
          <div className="border-t border-white/5 pt-3">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2 font-semibold">Tus Estaciones Asignadas:</span>
            <div className="flex flex-wrap gap-1 bg-black/30 p-1 rounded-lg">
              {assignedStations.map(stationVal => (
                <Link
                  key={stationVal}
                  href={`/staff/${eventId}?userId=${userId}&activeStation=${stationVal}`}
                  className={`flex-1 text-center py-1.5 px-2 rounded text-xs font-semibold transition-all ${
                    currentStation === stationVal 
                      ? "bg-primary text-white shadow" 
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {stationVal === "RUNNER" ? "🏃 Buscador" :
                   stationVal === "REGISTRATION" ? "📥 Registro" :
                   stationVal.startsWith("WARMUP_1_") ? `🔥 Calentamiento ${stationVal.replace("WARMUP_1_", "")}` :
                   stationVal === "WARMUP_1" ? "🔥 Calentamiento" :
                   stationVal.startsWith("SPRINGFLOOR_") ? `🤸 Spring ${stationVal.replace("SPRINGFLOOR_", "")}` :
                   stationVal === "SPRINGFLOOR" ? "🤸 Spring" :
                   stationVal === "TRANSIT" ? "🔀 Traslado" :
                   stationVal === "WAITING" ? "🚪 Boca Escenario" :
                   stationVal === "COMPETING" ? "🏟️ Pista" : "Estación"}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alerta de Escenario Vacío */}
      {isStageEmpty && (["WARMUP_1", "SPRINGFLOOR", "TRANSIT", "WAITING", "COMPETING"].includes(currentStation) || currentStation.startsWith("WARMUP_1_") || currentStation.startsWith("SPRINGFLOOR_")) && (
        <div className="bg-red-500/10 border-2 border-red-500 text-red-200 p-5 rounded-2xl shadow-xl animate-pulse space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <span className="font-black tracking-wider text-sm uppercase">¡ALERTA CRÍTICA: ESCENARIO VACÍO!</span>
          </div>
          <p className="text-xs leading-relaxed text-red-300">
            No hay ningún equipo en pista de competencia ni esperando en boca de escenario. Se está generando tiempo muerto en el evento.
          </p>
          {isEventDelayed ? (
            <div className="bg-red-950/60 border border-red-800 p-3 rounded-lg text-xs text-yellow-400 space-y-1">
              <span className="font-extrabold block">⚠️ EL CRONOGRAMA CORRE CON RETRASO:</span>
              <p>Por favor, apura la salida del equipo actual o **acorta el tiempo de calentamiento** de inmediato para regularizar la competencia.</p>
            </div>
          ) : (
            <p className="text-[11px] text-gray-400">Por favor, presiona el paso del equipo en tránsito para posicionarlo en la zona de espera a la brevedad.</p>
          )}
        </div>
      )}

      {/* Titulo Estación Activa */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
          {stationNames[currentStation]}
        </h2>
        <p className="text-xs text-gray-400">
          {currentStation === "RUNNER" 
            ? "Monitorea equipos próximos a ingresar y búscalos si están retrasados."
            : "Controla y aprueba el paso de equipos a la siguiente zona."}
        </p>
      </div>

      {/* Banner Superior Prominente de Hit Zero Notificados (Móvil y Escritorio) */}
      {(currentStation === "WAITING" || currentStation === "COMPETING") && pendingHitZeroStaff.length > 0 && (
        <div className="glass-panel p-4 border-2 border-amber-400/60 bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-amber-500/15 rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl animate-bounce">🎯</span>
              <div>
                <h3 className="font-black text-amber-300 text-sm uppercase tracking-wide flex items-center gap-2">
                  <span>Equipos con Hit Zero Otorgado</span>
                  <span className="bg-amber-400 text-black text-xs font-black px-2 py-0.5 rounded-full">
                    {pendingHitZeroStaff.length}
                  </span>
                </h3>
                <p className="text-[11px] text-amber-200/90">Avisar a los equipos en boca de escenario antes de que se retiren</p>
              </div>
            </div>
            <span className="hidden sm:inline-block text-[10px] text-amber-300 font-bold bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30">
              Notificación en tiempo real ⚡
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingHitZeroStaff.map((schedule) => (
              <div key={schedule.id} className="p-3.5 rounded-xl border bg-slate-950/80 border-amber-400/50 shadow-md flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded shrink-0">#{schedule.orderIndex}</span>
                    <p className="font-black text-white text-sm truncate">{schedule.team?.name}</p>
                  </div>
                  <p className="text-xs text-amber-200/80 truncate mt-0.5">{schedule.team?.institution.name}</p>
                </div>

                <form action={async (formData: FormData) => {
                  "use server";
                  const id = formData.get("scheduleId") as string;
                  await toggleHitZeroAwarded(id, true);
                }} className="shrink-0">
                  <input type="hidden" name="scheduleId" value={schedule.id} />
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs py-2 px-3.5 rounded-xl shadow-md border border-emerald-300/50 transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <span>🎤</span>
                    <span>Anunciado</span>
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vista Principal de la Estación */}
      <div className="space-y-6">
        {/* SECCIÓN ESPECIAL FIJA: Equipo en Competencia (Solo en la Pista de Competencia) */}
        {currentStation === "COMPETING" && (
          <div className="glass-panel p-5 border-l-4 border-l-success bg-gradient-to-r from-success/5 to-transparent space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-success font-black tracking-widest uppercase">Pista ocupada actualmente</span>
              <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-full font-bold animate-pulse border border-success/30">EN VIVO</span>
            </div>

            {currentlyCompeting ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-2xl font-black text-white leading-tight">{currentlyCompeting.team?.name}</h3>
                  <p className="text-sm text-primary font-semibold">{currentlyCompeting.team?.institution.name}</p>
                  <div className="text-[11px] text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>Ciudad: {currentlyCompeting.team?.institution.city || "N/D"}</span>
                    <span>Cat: {currentlyCompeting.team?.category}</span>
                    <span>Atletas: {currentlyCompeting.team?.athletesCount}</span>
                  </div>
                </div>

                <form action={updateScheduleStatus}>
                  <input type="hidden" name="scheduleId" value={currentlyCompeting.id} />
                  <input type="hidden" name="newStatus" value="FINISHED" />
                  <input type="hidden" name="eventId" value={eventId} />
                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-xl hover:shadow-red-600/10 hover:brightness-105 active:scale-98 transition-all cursor-pointer text-base uppercase tracking-wider"
                  >
                    ⏹️ Finalizar Presentación Actual
                  </button>
                </form>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic py-3 text-center">No hay ningún equipo realizando su presentación en este momento.</p>
            )}
          </div>
        )}

        {/* Lista Principal */}
        {filteredSchedules.length === 0 ? (
          <div className="glass-panel p-8 text-center text-gray-400 text-sm">
            No hay equipos {currentStation === "RUNNER" ? "pendientes de registro" : "en esta estación"} en este momento.
          </div>
        ) : (
          <StaffScheduleList
            schedules={filteredSchedules}
            currentStation={currentStation}
            eventId={eventId}
            isSupervisor={currentStaff.isSupervisor}
            nextExpectedTeamId={nextExpectedTeam?.id || null}
            nextExpectedTeamName={nextExpectedTeam?.team?.name || null}
            warmupZonesCount={event.warmupZonesCount}
            springfloorZonesCount={event.springfloorZonesCount}
            forceSameZone={event.forceSameZone}
          />
        )}
      </div>

      {/* Accordion para Ver Todos los Equipos y Manejar Incidencias Fuera de la Estación (Solo Supervisor) */}
      {currentStaff.isSupervisor && (
        <div className="border-t border-white/10 pt-6">
          <details className="group">
            <summary className="text-sm font-semibold text-gray-300 cursor-pointer hover:text-white select-none list-none flex items-center justify-between p-3 glass-panel">
              <span>📋 Todos los Equipos de este Evento ({event.schedules.length})</span>
              <span className="transition-transform group-open:rotate-180">▼</span>
            </summary>
            
            <div className="space-y-3 mt-4">
              {event.schedules.map((schedule) => (
                <div key={schedule.id} className="bg-black/30 border border-white/5 p-3 rounded-lg flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">{schedule.team?.name}</h4>
                    <p className="text-[11px] text-gray-400 truncate">
                      {schedule.team?.institution.name} • {allStatuses.find(s => s.value === schedule.status)?.label || schedule.status}
                    </p>
                  </div>
                  
                  <details className="group shrink-0 relative">
                    <summary className="text-xs bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 py-1 px-2.5 rounded cursor-pointer list-none flex items-center gap-1">
                      <span>Mover</span>
                      <span>▼</span>
                    </summary>
                    
                    <div className="absolute right-0 bottom-full mb-1 z-50 bg-[#1e293b] border border-white/10 rounded-lg shadow-xl p-2 min-w-[150px] space-y-1">
                      {allStatuses.map(statusObj => (
                        <form key={statusObj.value} action={updateScheduleStatus}>
                          <input type="hidden" name="scheduleId" value={schedule.id} />
                          <input type="hidden" name="newStatus" value={statusObj.value} />
                          <input type="hidden" name="eventId" value={eventId} />
                          <button
                            type="submit"
                            disabled={schedule.status === statusObj.value}
                            className="w-full text-left text-xs text-gray-300 hover:bg-white/10 hover:text-white p-1.5 rounded disabled:opacity-50 disabled:bg-transparent"
                          >
                            {statusObj.label}
                          </button>
                        </form>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

    </div>
  );
}
