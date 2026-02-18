"use client";

import { useState, useCallback, useId } from "react";
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

export default function TaskBoard({ initialTasks }: Props) {
  const dndId = useId();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 태스크 추가
  const handleAdd = useCallback(async () => {
    if (isAdding) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "새 태스크", duration: 25 }),
      });
      if (res.ok) {
        const { task } = await res.json();
        setTasks((prev) => [...prev, task]);
      }
    } finally {
      setIsAdding(false);
    }
  }, [isAdding]);

  // 태스크 수정
  const handleUpdate = useCallback(
    async (id: string, fields: Partial<Pick<Task, "title" | "duration">>) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        const { task: updated } = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      }
    },
    [],
  );

  // 태스크 삭제 — 함수형 업데이트로 stale closure 방지
  const handleDelete = useCallback(async (id: string) => {
    let snapshot: Task[] = [];
    setTasks((prev) => {
      snapshot = prev;
      return prev.filter((task) => task.id !== id);
    });

    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setTasks(snapshot);
    }
  }, []);

  // 드래그 시작
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  // 드래그 종료 — 함수형 업데이트로 stale closure 방지
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    let previous: Task[] = [];
    let reordered: Task[] = [];

    setTasks((current) => {
      previous = current;
      const oldIndex = current.findIndex((t) => t.id === active.id);
      const newIndex = current.findIndex((t) => t.id === over.id);
      reordered = arrayMove(current, oldIndex, newIndex);
      return reordered;
    });

    const res = await fetch("/api/tasks/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((t) => t.id) }),
    });

    if (!res.ok) {
      setTasks(previous);
    }
  };

  const activeTask = tasks.find((t) => t.id === activeId);

  // 총 소요시간
  const totalMinutes = tasks.reduce((sum, t) => sum + t.duration, 0);

  return (
    <div className="mx-auto max-w-xl">
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
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeTask && (
            <TaskItem
              task={activeTask}
              onUpdate={() => {}}
              onDelete={() => {}}
              isOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      <AddTaskButton onAdd={handleAdd} disabled={isAdding} />

      {/* 총 소요시간 */}
      {tasks.length > 0 && (
        <div className="mt-4 text-right text-sm text-gray-400">
          총 예상 소요시간: {formatDuration(totalMinutes)}
        </div>
      )}
    </div>
  );
}
