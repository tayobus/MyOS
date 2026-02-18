"use client";

import { useState, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, formatDuration } from "@/types/task";

interface Props {
  task: Task;
  onUpdate: (id: string, fields: Partial<Pick<Task, "title" | "duration">>) => void;
  onDelete: (id: string) => void;
  isOverlay?: boolean;
}

export default function TaskItem({ task, onUpdate, onDelete, isOverlay }: Props) {
  const [title, setTitle] = useState(task.title);
  const [duration, setDuration] = useState(String(task.duration));
  const titleRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);

  // prop 변경 시 로컬 state 동기화
  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    setDuration(String(task.duration));
  }, [task.duration]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
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

  // Enter키로 포커스 해제
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLElement).blur();
    }
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : style}
      className={`flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm dark:bg-gray-900 ${
        isOverlay ? "shadow-lg ring-2 ring-blue-400" : "border-gray-200 dark:border-gray-700"
      }`}
    >
      {/* 드래그 핸들 */}
      <button
        className="cursor-grab touch-none text-gray-400 hover:text-gray-600"
        {...(isOverlay ? {} : { ...attributes, ...listeners })}
        aria-label="드래그하여 순서 변경"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>

      {/* 태스크명 */}
      <input
        ref={titleRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        onKeyDown={handleKeyDown}
        className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0 dark:text-gray-200"
        placeholder="할일을 입력하세요"
      />

      {/* 소요시간 */}
      <div className="flex items-center gap-1 text-sm text-gray-500">
        <input
          ref={durationRef}
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          onBlur={handleDurationBlur}
          onKeyDown={handleKeyDown}
          min={0}
          className="w-12 border-0 bg-transparent text-right text-sm text-gray-600 outline-none focus:ring-0 dark:text-gray-300"
        />
        <span className="whitespace-nowrap text-xs text-gray-400">
          {formatDuration(parseInt(duration, 10) || 0)}
        </span>
      </div>

      {/* 삭제 버튼 */}
      <button
        onClick={() => onDelete(task.id)}
        className="text-gray-300 hover:text-red-500"
        aria-label="삭제"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>
    </div>
  );
}
