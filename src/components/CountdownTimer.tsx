"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: string; // ISO string
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      setTimeLeft(difference);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft <= 0) {
    return (
      <span className="text-red-500 font-extrabold animate-pulse">
        ⚠️ ¡ATRASADO! ({Math.abs(Math.round(timeLeft / 1000 / 60))} min)
      </span>
    );
  }

  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  // Determinar niveles de alerta
  let colorClass = "text-green-400";
  let alertText = "Tiempo suficiente";

  if (minutes < 10) {
    colorClass = "text-red-500 font-bold animate-pulse";
    alertText = "⚠️ CRÍTICO";
  } else if (minutes < 20) {
    colorClass = "text-orange-400 font-semibold";
    alertText = "⚠️ Próximo";
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-sm px-2 py-0.5 rounded bg-black/40 ${colorClass}`}>
        {minutes}m {seconds}s
      </span>
      <span className="text-[10px] text-gray-400 uppercase tracking-wider">{alertText}</span>
    </div>
  );
}
