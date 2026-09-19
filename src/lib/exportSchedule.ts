import { Schedule, Team, Institution, EventSession } from "@prisma/client";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ScheduleWithRelations = Schedule & {
  team?: (Team & { institution: Institution }) | null;
};

export interface ExportOptions {
  format: "excel" | "pdf";
  includeWarnings: boolean;
  eventName: string;
  sessionName: string;
  registrationZonesCount?: number;
  warmupZonesCount?: number;
  springfloorZonesCount?: number;
}

export function getExportConflictsAndWarnings(
  item: ScheduleWithRelations,
  items: ScheduleWithRelations[],
  session?: EventSession
): string[] {
  if (item.type === "BREAK" || !session) return [];

  const regDuration = session.registrationDuration || 10;
  const w1Duration = session.warmup1Duration || 10;
  const sfDuration = session.springfloorDuration || 10;
  const perfDuration = session.competitionDuration || 4;

  const notes: string[] = [];

  // 1. Conflicto interno
  if (item.scheduledSpringfloor && item.scheduledPerformance) {
    const sfEnd = new Date(item.scheduledSpringfloor).getTime() + sfDuration * 60000;
    const perfStart = new Date(item.scheduledPerformance).getTime();
    if (perfStart < sfEnd) {
      const diffMins = Math.ceil((sfEnd - perfStart) / 60000);
      notes.push(`⚠️ ALERTA: Competencia empieza ${diffMins} min antes de finalizar Springfloor`);
    }
  }

  // 2. Choques de zona
  const sameZoneTeams = items.filter((other) => other.id !== item.id && other.type === "TEAM");
  if (item.scheduledWarmup1) {
    const w1Start = new Date(item.scheduledWarmup1).getTime();
    const w1End = w1Start + w1Duration * 60000;
    const colliding = sameZoneTeams.filter((other) => {
      if (other.warmupZone !== item.warmupZone || !other.scheduledWarmup1) return false;
      const otherStart = new Date(other.scheduledWarmup1).getTime();
      return otherStart >= w1Start && otherStart < w1End;
    });
    if (colliding.length > 0) {
      notes.push(`⚠️ ALERTA ZONA: Choque en Warmup Zona ${item.warmupZone} con: ${colliding.map((c) => c.team?.name).join(", ")}`);
    }
  }

  if (item.scheduledSpringfloor) {
    const sfStart = new Date(item.scheduledSpringfloor).getTime();
    const sfEnd = sfStart + sfDuration * 60000;
    const colliding = sameZoneTeams.filter((other) => {
      if (other.springfloorZone !== item.springfloorZone || !other.scheduledSpringfloor) return false;
      const otherStart = new Date(other.scheduledSpringfloor).getTime();
      return otherStart >= sfStart && otherStart < sfEnd;
    });
    if (colliding.length > 0) {
      notes.push(`⚠️ ALERTA ZONA: Choque en Springfloor Zona ${item.springfloorZone} con: ${colliding.map((c) => c.team?.name).join(", ")}`);
    }
  }

  // 3. Topes de Club
  if (item.team?.institutionId) {
    const clubTeams = items.filter(
      (other) =>
        other.id !== item.id &&
        other.type === "TEAM" &&
        other.team?.institutionId === item.team?.institutionId
    );

    const overlaps = (startA?: Date | null, durA = 10, startB?: Date | null, durB = 10) => {
      if (!startA || !startB) return false;
      const tA = new Date(startA).getTime();
      const tB = new Date(startB).getTime();
      return tA < tB + durB * 60000 && tB < tA + durA * 60000;
    };

    for (const other of clubTeams) {
      const otherName = other.team?.name || "Otro equipo del club";
      if (overlaps(item.scheduledRegistration, regDuration, other.scheduledRegistration, regDuration)) {
        notes.push(`💡 TOPE CLUB: ${otherName} también en Registro`);
      } else if (overlaps(item.scheduledWarmup1, w1Duration, other.scheduledWarmup1, w1Duration)) {
        notes.push(`💡 TOPE CLUB: ${otherName} también en Warmup`);
      } else if (overlaps(item.scheduledSpringfloor, sfDuration, other.scheduledSpringfloor, sfDuration)) {
        notes.push(`💡 TOPE CLUB: ${otherName} también en Springfloor`);
      } else if (overlaps(item.scheduledPerformance, perfDuration, other.scheduledPerformance, perfDuration)) {
        notes.push(`💡 TOPE CLUB: ${otherName} compite al mismo tiempo`);
      } else if (overlaps(item.scheduledRegistration, regDuration, other.scheduledWarmup1, w1Duration)) {
        notes.push(`💡 TOPE CLUB: ${otherName} en Warmup durante este Registro`);
      } else if (overlaps(item.scheduledRegistration, regDuration, other.scheduledPerformance, perfDuration)) {
        notes.push(`💡 TOPE CLUB: ${otherName} compite durante este Registro`);
      } else if (overlaps(item.scheduledWarmup1, w1Duration, other.scheduledPerformance, perfDuration)) {
        notes.push(`💡 TOPE CLUB: ${otherName} compite durante este Warmup`);
      }
    }
  }

  return notes;
}

export function exportToExcel(
  items: ScheduleWithRelations[],
  options: ExportOptions,
  session?: EventSession
) {
  const formatTime = (d: Date | null) => (d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-");

  const rows = items.map((item, index) => {
    const isBreak = item.type === "BREAK";
    const notes = options.includeWarnings ? getExportConflictsAndWarnings(item, items, session).join(" | ") : "";

    if (isBreak) {
      const baseRow: any = {
        "#": index + 1,
        Tipo: "Pausa / Actividad",
        "Equipo / Actividad": item.breakTitle || "Pausa",
        Club: "-",
        Ciudad: "-",
        Categoría: "-",
        División: "-",
        Nivel: "-",
        "Hora Registro": "-",
        "Hora Warmup": "-",
        "Hora Springfloor": "-",
        "Hora Competencia": formatTime(item.scheduledPerformance),
      };
      if (options.includeWarnings) baseRow["Topes / Advertencias"] = notes || "Sin observaciones";
      return baseRow;
    }

    const regZone = (options.registrationZonesCount || 1) > 1 && item.registrationZone ? ` (${item.registrationZone})` : "";
    const w1Zone = (options.warmupZonesCount || 1) > 1 && item.warmupZone ? ` (${item.warmupZone})` : "";
    const sfZone = (options.springfloorZonesCount || 1) > 1 && item.springfloorZone ? ` (${item.springfloorZone})` : "";

    const baseRow: any = {
      "#": index + 1,
      Tipo: item.isExhibition ? "Exhibición" : "Competencia",
      "Equipo / Actividad": item.team?.name || "-",
      Club: item.team?.institution?.name || "-",
      Ciudad: item.team?.institution?.city || "-",
      Categoría: item.team?.category || "-",
      División: item.team?.division || "-",
      Nivel: item.team?.level || "-",
      "Hora Registro": `${formatTime(item.scheduledRegistration)}${regZone}`,
      "Hora Warmup": `${formatTime(item.scheduledWarmup1)}${w1Zone}`,
      "Hora Springfloor": `${formatTime(item.scheduledSpringfloor)}${sfZone}`,
      "Hora Competencia": formatTime(item.scheduledPerformance),
    };
    if (options.includeWarnings) baseRow["Topes / Advertencias"] = notes || "Sin observaciones";
    return baseRow;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length + 3, ...rows.map((r) => String(r[key] || "").length + 2)),
  }));
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, "Cronograma");

  const cleanEventName = options.eventName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanSessionName = options.sessionName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const warnSuffix = options.includeWarnings ? "_con_topes" : "";
  const fileName = `Cronograma_${cleanEventName}_${cleanSessionName}${warnSuffix}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

export function exportToPdf(
  items: ScheduleWithRelations[],
  options: ExportOptions,
  session?: EventSession
) {
  const formatTime = (d: Date | null) => (d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-");

  const doc = new jsPDF({
    orientation: options.includeWarnings ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(options.eventName, 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Jornada: ${options.sessionName} | Exportado: ${new Date().toLocaleDateString()}`, 14, 21);

  const head = options.includeWarnings
    ? [["#", "Equipo / Actividad", "Club / Ciudad", "Cat. / Div.", "Reg.", "Warmup", "Spring", "Comp.", "Topes / Advertencias"]]
    : [["#", "Equipo / Actividad", "Club / Ciudad", "Cat. / Div.", "Reg.", "Warmup", "Spring", "Comp."]];

  const body = items.map((item, index) => {
    const isBreak = item.type === "BREAK";
    const notes = options.includeWarnings ? getExportConflictsAndWarnings(item, items, session).join("\n") : "";

    if (isBreak) {
      const row = [
        `${index + 1}`,
        `☕ ${item.breakTitle || "Pausa"} (${item.breakDuration} min)`,
        "-",
        "-",
        "-",
        "-",
        "-",
        formatTime(item.scheduledPerformance),
      ];
      if (options.includeWarnings) row.push(notes || "OK");
      return row;
    }

    const regZone = (options.registrationZonesCount || 1) > 1 && item.registrationZone ? ` (${item.registrationZone})` : "";
    const w1Zone = (options.warmupZonesCount || 1) > 1 && item.warmupZone ? ` (${item.warmupZone})` : "";
    const sfZone = (options.springfloorZonesCount || 1) > 1 && item.springfloorZone ? ` (${item.springfloorZone})` : "";

    const teamName = item.isExhibition ? `${item.team?.name} (Exhibición)` : item.team?.name || "-";
    const clubCity = `${item.team?.institution?.name || "-"}\n${item.team?.institution?.city || ""}`;
    const catDiv = `${item.team?.category || "-"}\n${item.team?.division || "-"} ${item.team?.level || ""}`;

    const row = [
      `${index + 1}`,
      teamName,
      clubCity,
      catDiv,
      `${formatTime(item.scheduledRegistration)}${regZone}`,
      `${formatTime(item.scheduledWarmup1)}${w1Zone}`,
      `${formatTime(item.scheduledSpringfloor)}${sfZone}`,
      formatTime(item.scheduledPerformance),
    ];
    if (options.includeWarnings) row.push(notes || "OK");
    return row;
  });

  autoTable(doc, {
    startY: 25,
    head: head,
    body: body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 25 },
  });

  const cleanEventName = options.eventName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanSessionName = options.sessionName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const warnSuffix = options.includeWarnings ? "_con_topes" : "";
  const fileName = `Cronograma_${cleanEventName}_${cleanSessionName}${warnSuffix}.pdf`;

  doc.save(fileName);
}
