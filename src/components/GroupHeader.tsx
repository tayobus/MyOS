"use client";

import { useState, useEffect } from "react";
import { Group } from "@/types/group";
import { formatDuration } from "@/types/task";

interface Props {
  group: Group;
  totalMinutes: number;
  taskCount: number;
  onUpdate: (fields: Partial<Pick<Group, "name" | "collapsed">>) => void;
  onDelete: () => void;
  dragHandleProps: Record<string, unknown>;
}

export default function GroupHeader({
  group,
  totalMinutes,
  taskCount,
  onUpdate,
  onDelete,
  dragHandleProps,
}: Props) {
  const [name, setName] = useState(group.name);

  useEffect(() => {
    setName(group.name);
  }, [group.name]);

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== group.name) {
      onUpdate({ name: trimmed });
    } else {
      setName(group.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLElement).blur();
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* 드래그 핸들 */}
      <button
        className="cursor-grab touch-none p-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-600/50 transition-colors text-slate-400 hover:text-slate-600 dark:text-slate-500"
        {...dragHandleProps}
        aria-label="드래그하여 그룹 순서 변경"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="12" r="1" />
          <circle cx="9" cy="5" r="1" />
          <circle cx="9" cy="19" r="1" />
          <circle cx="15" cy="12" r="1" />
          <circle cx="15" cy="5" r="1" />
          <circle cx="15" cy="19" r="1" />
        </svg>
      </button>

      {/* 접기/펴기 토글 */}
      <button
        onClick={() => onUpdate({ collapsed: !group.collapsed })}
        className="p-0.5 rounded transition-transform text-slate-400 hover:text-slate-600 dark:text-slate-500"
        aria-label={group.collapsed ? "그룹 펼치기" : "그룹 접기"}
      >
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform duration-200 ${group.collapsed ? "" : "rotate-90"}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* 그룹명 */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleNameBlur}
        onKeyDown={handleKeyDown}
        className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none placeholder:text-slate-400"
        placeholder="그룹 이름"
      />

      {/* 태스크 수 + 합산 시간 */}
      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 shrink-0">
        <span>{taskCount}개</span>
        {totalMinutes > 0 && (
          <>
            <span>·</span>
            <span className="text-indigo-500 dark:text-indigo-400 font-medium">{formatDuration(totalMinutes)}</span>
          </>
        )}
      </div>

      {/* 삭제 버튼 */}
      <button
        onClick={onDelete}
        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover/card:opacity-100 focus:opacity-100"
        aria-label="그룹 삭제"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}
