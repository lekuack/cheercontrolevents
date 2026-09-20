import { NextResponse } from "next/server";

// Cache global en memoria para guardar las vinculaciones PIN -> eventId
if (!(global as any).tvPairingsMap) {
  (global as any).tvPairingsMap = new Map<string, string>();
}

const tvPairingsMap: Map<string, string> = (global as any).tvPairingsMap;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pin = searchParams.get("pin");

  if (!pin) {
    return NextResponse.json({ error: "PIN requerido" }, { status: 400 });
  }

  const eventId = tvPairingsMap.get(pin) || null;
  return NextResponse.json({ pin, eventId });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pin, eventId } = body;

    if (!pin || !eventId) {
      return NextResponse.json({ error: "PIN y eventId son requeridos" }, { status: 400 });
    }

    tvPairingsMap.set(String(pin), String(eventId));

    // Si Socket.IO está presente globalmente, emitir evento a la sala tv-{pin}
    if ((global as any).io) {
      (global as any).io.to(`tv-${pin}`).emit("tv-paired", { pin, eventId });
    }

    return NextResponse.json({ success: true, pin, eventId });
  } catch (error) {
    console.error("Error en POST /api/tv-pair:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
