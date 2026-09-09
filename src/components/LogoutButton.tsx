"use client";

import { useRouter } from "next/navigation";
import { logoutUser } from "@/app/admin/actions";

interface LogoutButtonProps {
  redirectTo?: string;
  label?: string;
  className?: string;
}

export default function LogoutButton({ 
  redirectTo = "/", 
  label = "Cerrar Sesión",
  className
}: LogoutButtonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutUser();
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className={className ?? "text-xs bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 hover:text-red-300 px-4 py-1.5 rounded-full transition-all font-semibold"}
    >
      {label}
    </button>
  );
}
