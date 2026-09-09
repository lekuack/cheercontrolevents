"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

export default function SocketSync({ eventId }: { eventId: string }) {
  const router = useRouter();

  useEffect(() => {
    // Conectamos a la misma dirección del hosting actual
    const socket = io();

    // Nos unimos a la "habitación" del evento actual
    socket.emit("join-event", eventId);

    // Cuando cambie el estado de cualquier equipo, refrescamos el router del Server Component
    socket.on("status-changed", () => {
      console.log("[WS] Status changed, updating page data...");
      router.refresh();
    });

    return () => {
      socket.disconnect();
    };
  }, [eventId, router]);

  return null;
}
