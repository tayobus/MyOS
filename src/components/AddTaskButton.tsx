"use client";

interface Props {
  onAdd: () => void;
  disabled?: boolean;
}

export default function AddTaskButton({ onAdd, disabled }: Props) {
  return (
    <button
      onClick={onAdd}
      disabled={disabled}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z" />
      </svg>
      {disabled ? "추가 중..." : "할일 추가"}
    </button>
  );
}
