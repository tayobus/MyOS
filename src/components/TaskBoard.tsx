"use client";

import { useState, useCallback, useId, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Task, formatDuration } from "@/types/task";
import TaskItem from "./TaskItem";
import AddTaskButton from "./AddTaskButton";

interface Props {
  initialTasks: Task[];
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
};

export default function TaskBoard({ initialTasks }: Props) {
  const dndId = useId();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 태스크 추가 - 낙관적 업데이트 적용
  const handleAdd = useCallback(async () => {
    if (isAdding) return;
    setIsAdding(true);

    // 임시 ID 생성
    const tempId = `temp-${Date.now()}`;
    const newTask: Task = {
      id: tempId,
      title: "새 태스크",
      duration: 25,
      order: tasks.length,
      createdAt: new Date().toISOString(), // 임시 생성 시간
    };

    // 낙관적 업데이트
    setTasks((prev) => [...prev, newTask]);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTask.title, duration: newTask.duration }),
      });

      if (res.ok) {
        const { task } = await res.json();
        // 실제 ID로 교체
        setTasks((prev) => prev.map((t) => (t.id === tempId ? task : t)));
        showToast("태스크가 추가되었습니다.");
      } else {
        throw new Error("Failed to add task");
      }
    } catch (error) {
      console.error(error);
      // 실패 시 롤백
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      showToast("태스크 추가에 실패했습니다.", "error");
    } finally {
      setIsAdding(false);
    }
  }, [isAdding, tasks.length, showToast]);

  // 태스크 수정 - 낙관적 업데이트 적용
  const handleUpdate = useCallback(
    async (id: string, fields: Partial<Pick<Task, "title" | "duration">>) => {
      // 이전 상태 저장
      const previousTasks = [...tasks];

      // 낙관적 업데이트
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...fields } : t))
      );

      try {
        const res = await fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });

        if (!res.ok) throw new Error("Failed to update task");
        // 성공 시 조용히 유지 (이미 업데이트됨)
      } catch (error) {
        console.error(error);
        // 실패 시 롤백
        setTasks(previousTasks);
        showToast("태스크 수정에 실패했습니다.", "error");
      }
    },
    [tasks, showToast]
  );

  // 태스크 삭제 - 낙관적 업데이트 적용
  const handleDelete = useCallback(async (id: string) => {
    const previousTasks = [...tasks];

    // 낙관적 업데이트
    setTasks((prev) => prev.filter((task) => task.id !== id));

    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("태스크가 삭제되었습니다.");
      } else {
        throw new Error("Failed to delete task");
      }
    } catch (error) {
      console.error(error);
      // 실패 시 롤백
      setTasks(previousTasks);
      showToast("태스크 삭제에 실패했습니다.", "error");
    }
  }, [tasks, showToast]);

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  // 드래그 종료
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const previousTasks = [...tasks];

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIndex, newIndex);

    // 낙관적 업데이트
    setTasks(reordered);

    // 임시 ID가 포함된 경우 서버 요청 제외
    const validOrderedIds = reordered
      .filter((t) => !t.id.startsWith("temp-"))
      .map((t) => t.id);

    if (validOrderedIds.length === 0) return;

    try {
      const res = await fetch("/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: validOrderedIds }),
      });

      if (!res.ok) throw new Error("Failed to reorder tasks");
    } catch (error) {
      console.error(error);
      // 실패 시 롤백
      setTasks(previousTasks);
      showToast("순서 변경에 실패했습니다.", "error");
    }
  };

  const activeTask = tasks.find((t) => t.id === activeId);
  const totalMinutes = tasks.reduce((sum, t) => sum + t.duration, 0);

  return (
    <div className="mx-auto max-w-xl pb-20 relative">
      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in transition-all transform translate-y-0 opacity-100 ${toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
              }`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3 min-h-[100px]">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p className="text-sm font-medium">할 일이 없습니다.</p>
                <p className="text-xs mt-1">새로운 작업을 추가해보세요!</p>
              </div>
            ) : (
              tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={dropAnimationConfig}>
          {activeTask && (
            <TaskItem
              task={activeTask}
              onUpdate={() => { }}
              onDelete={() => { }}
              isOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      <div className="mt-6">
        <AddTaskButton onAdd={handleAdd} disabled={isAdding} />
      </div>

      {/* 총 소요시간 */}
      {tasks.length > 0 && (
        <div className="mt-6 flex justify-end items-center text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 w-fit ml-auto">
          <span>총 예상 소요시간:</span>
          <span className="ml-2 text-indigo-600 font-bold">{formatDuration(totalMinutes)}</span>
        </div>
      )}
    </div>
  );
}
