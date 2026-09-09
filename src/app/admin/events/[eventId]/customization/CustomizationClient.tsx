"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEventCustomization } from "@/app/admin/actions";
import { Event } from "@prisma/client";

export default function CustomizationClient({ event }: { event: Event }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [bgType, setBgType] = useState<"solid" | "gradient">(
    event.pageBgGradientFrom ? "gradient" : "solid"
  );

  // Form State
  const [pageBgColor, setPageBgColor] = useState(event.pageBgColor || "#050b18");
  const [pageBgGradientFrom, setPageBgGradientFrom] = useState(event.pageBgGradientFrom || "#09101f");
  const [pageBgGradientVia, setPageBgGradientVia] = useState(event.pageBgGradientVia || "#080d1a");
  const [pageBgGradientTo, setPageBgGradientTo] = useState(event.pageBgGradientTo || "#050b18");

  const [posterBgColorFrom, setPosterBgColorFrom] = useState(event.posterBgColorFrom || "#09101f");
  const [posterBgColorVia, setPosterBgColorVia] = useState(event.posterBgColorVia || "#080d1a");
  const [posterBgColorTo, setPosterBgColorTo] = useState(event.posterBgColorTo || "#050b18");
  const [posterTextColor1, setPosterTextColor1] = useState(event.posterTextColor1 || "#ffffff");
  const [posterTextColor2, setPosterTextColor2] = useState(event.posterTextColor2 || "#e2e8f0");
  const [posterTextColor3, setPosterTextColor3] = useState(event.posterTextColor3 || "#94a3b8");

  const [fontFamily, setFontFamily] = useState(event.fontFamily || "Inter");
  const [titleColor, setTitleColor] = useState(event.titleColor || "#ffffff");
  const [titleFontSize, setTitleFontSize] = useState(event.titleFontSize || "2xl");

  const [tableHeaderBgColor, setTableHeaderBgColor] = useState(event.tableHeaderBgColor || "rgba(255, 255, 255, 0.05)");
  const [tableHeaderTextColor, setTableHeaderTextColor] = useState(event.tableHeaderTextColor || "#9ca3af");
  const [tableRowBgColor, setTableRowBgColor] = useState(event.tableRowBgColor || "transparent");
  const [tableRowHoverBgColor, setTableRowHoverBgColor] = useState(event.tableRowHoverBgColor || "rgba(255, 255, 255, 0.03)");
  const [tableRowTextColor, setTableRowTextColor] = useState(event.tableRowTextColor || "#ffffff");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData();
    formData.append("eventId", event.id);
    formData.append("pageBgColor", pageBgColor);
    formData.append("pageBgGradientFrom", bgType === "gradient" ? pageBgGradientFrom : "");
    formData.append("pageBgGradientVia", bgType === "gradient" ? pageBgGradientVia : "");
    formData.append("pageBgGradientTo", bgType === "gradient" ? pageBgGradientTo : "");
    formData.append("posterBgColorFrom", posterBgColorFrom);
    formData.append("posterBgColorVia", posterBgColorVia);
    formData.append("posterBgColorTo", posterBgColorTo);
    formData.append("posterTextColor1", posterTextColor1);
    formData.append("posterTextColor2", posterTextColor2);
    formData.append("posterTextColor3", posterTextColor3);
    formData.append("fontFamily", fontFamily);
    formData.append("titleColor", titleColor);
    formData.append("titleFontSize", titleFontSize);
    formData.append("tableHeaderBgColor", tableHeaderBgColor);
    formData.append("tableHeaderTextColor", tableHeaderTextColor);
    formData.append("tableRowBgColor", tableRowBgColor);
    formData.append("tableRowHoverBgColor", tableRowHoverBgColor);
    formData.append("tableRowTextColor", tableRowTextColor);

    await updateEventCustomization(formData);
    setIsSaving(false);
    
    // Refresh the router to reflect the new server state
    router.refresh();
    alert("¡Cambios guardados correctamente!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Editor Panel */}
      <div className="lg:col-span-1 space-y-6">
        <form id="customization-form" onSubmit={handleSubmit} className="space-y-6">
          
          <div className="glass-panel p-5">
            <h2 className="text-sm font-bold text-white mb-4">🔤 Tipografía y Títulos</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fuente (Font Family)</label>
                <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white">
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="'College', sans-serif">College</option>
                  <option value="'Varsity', sans-serif">Varsity</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tamaño Título</label>
                  <select value={titleFontSize} onChange={e => setTitleFontSize(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white">
                    <option value="xl">XL (Normal)</option>
                    <option value="2xl">2XL (Grande)</option>
                    <option value="3xl">3XL (Muy Grande)</option>
                    <option value="4xl">4XL (Enorme)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Color Título</label>
                  <input type="color" value={titleColor} onChange={e => setTitleColor(e.target.value)} className="w-full h-9 rounded border border-white/10 bg-transparent cursor-pointer" />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-5">
            <h2 className="text-sm font-bold text-white mb-4">🎨 Fondo de la Página Principal</h2>
            <div className="space-y-4">
              <div className="flex gap-4 mb-1">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="radio" name="bgType" checked={bgType === "solid"} onChange={() => setBgType("solid")} className="accent-blue-500" />
                  Color Sólido
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input type="radio" name="bgType" checked={bgType === "gradient"} onChange={() => setBgType("gradient")} className="accent-blue-500" />
                  Degradado
                </label>
              </div>

              {bgType === "solid" ? (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Color de Fondo Sólido</label>
                  <input type="color" value={pageBgColor} onChange={e => setPageBgColor(e.target.value)} className="w-full h-9 rounded border border-white/10 bg-transparent cursor-pointer" />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Degradado (Arriba → Centro → Abajo)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="color" value={pageBgGradientFrom} onChange={e => setPageBgGradientFrom(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" title="From" />
                    <input type="color" value={pageBgGradientVia} onChange={e => setPageBgGradientVia(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" title="Via" />
                    <input type="color" value={pageBgGradientTo} onChange={e => setPageBgGradientTo(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" title="To" />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel p-5">
            <h2 className="text-sm font-bold text-white mb-4">🖼️ Lineup Póster</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fondo del Póster (Degradado)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input type="color" value={posterBgColorFrom} onChange={e => setPosterBgColorFrom(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                  <input type="color" value={posterBgColorVia} onChange={e => setPosterBgColorVia(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                  <input type="color" value={posterBgColorTo} onChange={e => setPosterBgColorTo(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Colores de Texto Dinámico</label>
                <div className="grid grid-cols-3 gap-2">
                  <input type="color" value={posterTextColor1} onChange={e => setPosterTextColor1(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" title="Color Principal" />
                  <input type="color" value={posterTextColor2} onChange={e => setPosterTextColor2(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" title="Color Secundario" />
                  <input type="color" value={posterTextColor3} onChange={e => setPosterTextColor3(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" title="Color Terciario" />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-5">
            <h2 className="text-sm font-bold text-white mb-4">📋 Tabla de Horarios</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Fondo Cabecera (rgba o hex)</label>
                  <input type="text" value={tableHeaderBgColor} onChange={e => setTableHeaderBgColor(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Texto Cabecera</label>
                  <input type="color" value={tableHeaderTextColor} onChange={e => setTableHeaderTextColor(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Fondo Fila</label>
                  <input type="text" value={tableRowBgColor} onChange={e => setTableRowBgColor(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Fila Hover</label>
                  <input type="text" value={tableRowHoverBgColor} onChange={e => setTableRowHoverBgColor(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Texto Fila</label>
                  <input type="color" value={tableRowTextColor} onChange={e => setTableRowTextColor(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex justify-center"
          >
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>
      </div>

      {/* Live Preview Panel */}
      <div className="lg:col-span-2">
        <div className="sticky top-6">
          <h3 className="text-sm font-bold text-gray-400 mb-2">Vista Previa</h3>
          <div 
            className="border-2 border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
            style={{
              background: bgType === "gradient" && pageBgGradientFrom 
                ? `linear-gradient(to bottom, ${pageBgGradientFrom}, ${pageBgGradientVia || pageBgGradientFrom}, ${pageBgGradientTo || pageBgGradientFrom})` 
                : pageBgColor,
              fontFamily: fontFamily
            }}
          >
            <div className="p-8">
              <h1 className={`text-${titleFontSize} font-bold mb-6 text-center`} style={{ color: titleColor }}>{event.name}</h1>
              
              {/* Tabla de Prueba */}
              <div className="overflow-hidden rounded-xl border border-white/5 mb-8">
                <table className="w-full text-left text-sm">
                  <thead style={{ backgroundColor: tableHeaderBgColor, color: tableHeaderTextColor }}>
                    <tr>
                      <th className="px-4 py-3 font-bold">#</th>
                      <th className="px-4 py-3 font-bold">Institución</th>
                      <th className="px-4 py-3 font-bold">Equipo</th>
                      <th className="px-4 py-3 font-bold text-center">Horario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((num) => (
                      <tr 
                        key={num} 
                        className="border-b border-white/5 transition-colors"
                        style={{ backgroundColor: tableRowBgColor, color: tableRowTextColor }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = tableRowHoverBgColor}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = tableRowBgColor}
                      >
                        <td className="px-4 py-3 opacity-50">{num}</td>
                        <td className="px-4 py-3 font-bold">Ejemplo All Stars</td>
                        <td className="px-4 py-3">Team {num}</td>
                        <td className="px-4 py-3 text-center">10:0{num}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Póster de Prueba */}
              <div 
                className="rounded-2xl p-6 text-center border border-white/10"
                style={{
                  background: `linear-gradient(to bottom, ${posterBgColorFrom}, ${posterBgColorVia}, ${posterBgColorTo})`
                }}
              >
                <h3 className="text-xl font-black mb-4 uppercase" style={{ color: posterTextColor1 }}>Lineup de Presentaciones</h3>
                <div className="space-y-2">
                  <div className="text-lg font-bold" style={{ color: posterTextColor2 }}>Team Fuego</div>
                  <div className="text-sm" style={{ color: posterTextColor3 }}>Nivel 3 - Senior</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
