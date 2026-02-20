"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { User } from "@/types/user";

interface Props {
  user: User;
}

export default function UserHeader({ user }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="font-medium">{user.name}</span>
      </div>
      <button
        onClick={handleLogout}
        disabled={loading}
        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
      >
        {loading ? "로그아웃 중..." : "로그아웃"}
      </button>
    </div>
  );
}
