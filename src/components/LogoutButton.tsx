"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ email }: { email: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3 text-sm text-slate-500">
      <span>{email}</span>
      <button
        onClick={handleLogout}
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        로그아웃
      </button>
    </div>
  );
}
