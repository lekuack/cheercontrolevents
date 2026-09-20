import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo." }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "El archivo debe ser una imagen (PNG, JPG, SVG, WebP, etc.)." }, { status: 400 });
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no debe superar los 5MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Asegurar directorio public/uploads
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Extensión y nombre único de archivo
    const ext = path.extname(file.name) || `.${file.type.split("/")[1] || "png"}`;
    const cleanName = file.name
      .replace(ext, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .toLowerCase();
    const filename = `logo_${Date.now()}_${cleanName}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, buffer);

    const logoUrl = `/api/uploads/${filename}`;
    return NextResponse.json({ success: true, url: logoUrl });
  } catch (error: any) {
    console.error("Error uploading logo:", error);
    return NextResponse.json({ error: error.message || "Error al subir la imagen." }, { status: 500 });
  }
}
