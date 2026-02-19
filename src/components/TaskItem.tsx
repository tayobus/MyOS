"use client";

import { useState, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, formatDuration } from "@/types/task";

interface Props {
  task: Task;
  onUpdate: (id: string, fields: Partial<Pick<Task, "title" | "duration" | "memo">>) => void;
  onDelete: (id: string) => void;
  isOverlay?: boolean;
}

export default function TaskItem({ task, onUpdate, onDelete, isOverlay }: Props) {
  const [title, setTitle] = useState(task.title);
  const [duration, setDuration] = useState(String(task.duration));
  const [memo, setMemo] = useState(task.memo);
  const [expanded, setExpanded] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);

  // prop 변경 시 로컬 state 동기화
  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    setDuration(String(task.duration));
  }, [task.duration]);

  useEffect(() => {
    setMemo(task.memo);
  }, [task.memo]);

  // 새 태스크 생성 시 자동 포커스
  useEffect(() => {
    if (task.title === "새 태스크" && titleRef.current && !isOverlay) {
      titleRef.current.select();
    }
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `task::${task.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : "auto",
  };

  // title 편집 완료
  const handleTitleBlur = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed });
    } else {
      setTitle(task.title);
    }
  };

  // duration 편집 완료
  const handleDurationBlur = () => {
    const num = parseInt(duration, 10);
    if (!isNaN(num) && num >= 0 && num !== task.duration) {
      onUpdate(task.id, { duration: num });
    } else {
      setDuration(String(task.duration));
    }
  };

  // memo 편집 완료
  const handleMemoBlur = () => {
    if (memo !== task.memo) {
      onUpdate(task.id, { memo });
    }
  };

  // Enter키로 포커스 해제
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      (e.target as HTMLElement).blur();
    }
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : style}
      className={`group rounded-xl border transition-all duration-200 ${
        isOverlay
          ? "bg-white shadow-2xl ring-2 ring-indigo-500 scale-105 rotate-1 cursor-grabbing z-50 border-indigo-100 dark:bg-slate-800 dark:border-indigo-500"
          : "bg-white hover:border-indigo-200 hover:shadow-md border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* 드래그 핸들 */}
        <button
          className={`cursor-grab touch-none p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
            isOverlay ? "cursor-grabbing text-indigo-500" : "text-slate-400 hover:text-slate-600 dark:text-slate-500"
          }`}
          {...(isOverlay ? {} : { ...attributes, ...listeners })}
          aria-label="드래그하여 순서 변경"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="12" r="1" />
            <circle cx="9" cy="5" r="1" />
            <circle cx="9" cy="19" r="1" />
            <circle cx="15" cy="12" r="1" />
            <circle cx="15" cy="5" r="1" />
            <circle cx="15" cy="19" r="1" />
          </svg>
        </button>

        {/* 태스크명 */}
        <div className="flex-1 min-w-0">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium dark:text-slate-200"
            placeholder="할일을 입력하세요"
          />
        </div>

        {/* 메모 표시기 + 토글 */}
        {!isOverlay && (
          <button
            onClick={() => setExpanded(!expanded)}
            className={`p-1.5 rounded-lg transition-colors ${
              expanded
                ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                : task.memo
                  ? "text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  : "text-slate-300 hover:text-slate-500 hover:bg-slate-100 opacity-0 group-hover:opacity-100 focus:opacity-100 dark:text-slate-600 dark:hover:bg-slate-700"
            }`}
            aria-label="메모"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </button>
        )}

        {/* 소요시간 */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-100 dark:border-slate-700">
          <div className="flex items-center bg-slate-50 px-2 py-1 rounded-md border border-slate-100 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 dark:bg-slate-900 dark:border-slate-700">
            <input
              ref={durationRef}
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              onBlur={handleDurationBlur}
              onKeyDown={handleKeyDown}
              min={0}
              className="w-8 bg-transparent text-right text-sm text-slate-600 outline-none font-medium appearance-none dark:text-slate-300"
            />
            <span className="text-xs text-slate-400 ml-1">분</span>
          </div>
        </div>

        {/* 삭제 버튼 */}
        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 dark:text-slate-600 dark:hover:bg-red-900/20"
          aria-label="삭제"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>

      {/* 메모 영역 (아코디언) */}
      {expanded && !isOverlay && (
        <div className="px-4 pb-3.5 pt-0">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={handleMemoBlur}
            rows={3}
            className="w-full bg-slate-50 text-sm text-slate-700 rounded-lg border border-slate-100 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
            placeholder="메모를 입력하세요..."
          />
        </div>
      )}
    </div>
  );
}
