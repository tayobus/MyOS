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
      className={`
        group relative flex w-full items-center justify-center gap-2 rounded-xl py-3.5 
        text-sm font-semibold text-white shadow-md transition-all duration-200
        ${disabled 
          ? "bg-indigo-400 cursor-not-allowed opacity-80" 
          : "bg-indigo-600 hover:bg-indigo-500 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
        }
      `}
    >
      {disabled ? (
        <>
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>추가 중...</span>
        </>
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>할일 추가</span>
        </>
      )}
    </button>
  );
}
