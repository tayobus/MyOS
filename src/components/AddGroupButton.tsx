"use client";

interface Props {
  onAdd: () => void;
  disabled?: boolean;
}

export default function AddGroupButton({ onAdd, disabled }: Props) {
  return (
    <button
      onClick={onAdd}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 text-sm font-medium transition-all duration-200 ${
        disabled
          ? "border-slate-200 text-slate-300 cursor-not-allowed"
          : "border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 dark:border-slate-700 dark:text-slate-500 dark:hover:border-indigo-700 dark:hover:text-indigo-400"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      그룹 추가
    </button>
  );
}
