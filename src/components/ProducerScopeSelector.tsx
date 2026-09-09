"use client";

import { useTransition } from "react";
import { setProducerScope } from "@/app/admin/actions";

interface ProducerScopeSelectorProps {
  producers: { id: string; name: string }[];
  activeProducerId: string;
}

export default function ProducerScopeSelector({ producers, activeProducerId }: ProducerScopeSelectorProps) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    startTransition(async () => {
      await setProducerScope(val);
    });
  };

  return (
    <div className="flex items-center gap-3 bg-purple-950/20 border border-purple-500/35 p-3 rounded-lg w-full max-w-sm">
      <span className="text-xs font-bold text-purple-300 uppercase whitespace-nowrap">👁️ Ver Productor:</span>
      <select
        value={activeProducerId}
        onChange={handleChange}
        disabled={isPending}
        className="w-full bg-slate-900 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
      >
        {producers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
