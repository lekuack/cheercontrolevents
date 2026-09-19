"use client";

import { useState, useRef, useEffect } from "react";
import { getExistingLogos } from "@/app/admin/actions";

interface LogoUploaderProps {
  name: string;
  defaultValue?: string | null;
  label?: string;
  placeholder?: string;
}

export default function LogoUploader({
  name,
  defaultValue = "",
  label = "Logo",
  placeholder = "https://ejemplo.com/logo.png o sube un archivo",
}: LogoUploaderProps) {
  const [value, setValue] = useState(defaultValue || "");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [mode, setMode] = useState<"file" | "url" | "gallery">("file");
  const [galleryLogos, setGalleryLogos] = useState<string[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "gallery" && galleryLogos.length === 0) {
      setLoadingGallery(true);
      getExistingLogos()
        .then(logos => setGalleryLogos(logos || []))
        .catch(err => console.error("Error loading gallery:", err))
        .finally(() => setLoadingGallery(false));
    }
  }, [mode]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona un archivo de imagen (PNG, JPG, SVG, WebP, etc.).");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setValue(data.url);
      } else {
        alert(`Error al subir imagen: ${data.error || "Error desconocido"}`);
      }
    } catch (err: any) {
      alert(`Error de red al subir la imagen: ${err?.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        {label && <label className="block text-sm text-gray-300 font-medium">{label}</label>}
        <div className="flex items-center gap-1 text-[11px] bg-white/5 rounded-lg p-0.5 border border-white/10">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`px-2 py-0.5 rounded-md transition-all font-semibold cursor-pointer ${mode === "file" ? "bg-primary text-white shadow" : "text-gray-400 hover:text-white"
              }`}
          >
            📁 Archivo
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-2 py-0.5 rounded-md transition-all font-semibold cursor-pointer ${mode === "url" ? "bg-primary text-white shadow" : "text-gray-400 hover:text-white"
              }`}
          >
            🔗 URL
          </button>
          <button
            type="button"
            onClick={() => setMode("gallery")}
            className={`px-2 py-0.5 rounded-md transition-all font-semibold cursor-pointer ${mode === "gallery" ? "bg-primary text-white shadow" : "text-gray-400 hover:text-white"
              }`}
          >
            🖼️ Galería
          </button>
        </div>
      </div>

      {/* Input oculto para que FormDatas del servidor lean el valor de `name` */}
      <input type="hidden" name={name} value={value} />

      {/* Previsualización del Logo y Botón Quitar */}
      {value && (
        <div className="flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-xl mb-2">
          <div className="w-12 h-12 rounded-lg bg-black/40 overflow-hidden border border-white/10 shrink-0 flex items-center justify-center p-1">
            <img src={value} alt="Vista previa logo" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-emerald-400 font-semibold truncate">Logo seleccionado</div>
            <div className="text-[10px] text-gray-400 font-mono truncate">{value}</div>
          </div>
          <button
            type="button"
            onClick={() => setValue("")}
            className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-300 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Eliminar logo"
          >
            🗑️ Quitar
          </button>
        </div>
      )}

      {mode === "file" ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${dragActive
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30"
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-xs text-primary font-bold py-1">
              <span className="animate-spin">⏳</span> Subiendo imagen...
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-xl">🖼️</div>
              <div className="text-xs text-gray-300 font-medium">
                Haz clic para subir o arrastra la imagen aquí
              </div>
              <div className="text-[10px] text-gray-500">
                PNG, JPG, SVG, WebP (Máx 5MB)
              </div>
            </div>
          )}
        </div>
      ) : mode === "url" ? (
        <div>
          <input
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      ) : (
        <div className="bg-black/30 border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto custom-scrollbar">
          {loadingGallery ? (
            <div className="text-center text-xs text-gray-400 py-4">Cargando galería...</div>
          ) : galleryLogos.length === 0 ? (
            <div className="text-center text-xs text-gray-400 py-4">No hay logos guardados previamente.</div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {galleryLogos.map((logo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setValue(logo)}
                  className={`relative aspect-square rounded-lg border-2 overflow-hidden bg-black/50 hover:border-primary/50 transition-all ${value === logo ? "border-primary shadow-lg shadow-primary/20 scale-105" : "border-white/5"
                    }`}
                >
                  <img src={logo} alt="Logo de galería" className="w-full h-full object-contain p-1" />
                  {value === logo && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                      <span className="text-white text-lg drop-shadow-md">✅</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
