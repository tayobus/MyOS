"use client";

import { useState, useCallback, useId, useMemo, useRef, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Task, formatDuration } from "@/types/task";
import { Group } from "@/types/group";
import TaskItem from "./TaskItem";
import GroupCard from "./GroupCard";
import AddTaskButton from "./AddTaskButton";
import AddGroupButton from "./AddGroupButton";

interface Props {
  initialTasks: Task[];
  initialGroups: Group[];
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
};

// --- 미분류 섹션 드롭존 ---
function UngroupedDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "droppable::ungrouped",
    data: { type: "ungrouped" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-3 min-h-[8px] rounded-xl transition-colors ${isOver ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""
        }`}
    >
      {children}
    </div>
  );
}

export default function TaskBoard({ initialTasks, initialGroups }: Props) {
  const dndId = useId();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [activeItem, setActiveItem] = useState<
    | { type: "group"; data: Group }
    | { type: "task"; data: Task }
    | null
  >(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 최신 state를 ref로 추적 (클로저 stale state 방지)
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  const groupsRef = useRef(groups);
  useEffect(() => { groupsRef.current = groups; }, [groups]);

  // 드래그 시작 시점의 스냅샷 (실패 시 롤백용)
  const tasksBeforeDrag = useRef<Task[]>([]);
  const groupsBeforeDrag = useRef<Group[]>([]);

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

  // --- 그룹별 태스크 필터링 ---
  const tasksByGroup = useMemo(() => {
    const map = new Map<string | null, Task[]>();
    map.set(null, []);
    groups.forEach((g) => map.set(g.id, []));
    tasks.forEach((t) => {
      const key = t.groupId ?? null;
      if (!map.has(key)) {
        // groupId가 존재하지 않는 그룹을 참조 → 미분류로
        map.get(null)!.push(t);
      } else {
        map.get(key)!.push(t);
      }
    });
    // 각 그룹 내 order 기준 정렬
    map.forEach((arr) => arr.sort((a, b) => a.order - b.order));
    return map;
  }, [tasks, groups]);

  // --- 태스크 CRUD ---
  const handleAddTask = useCallback(
    async (groupId: string | null = null) => {
      if (isAdding) return;
      setIsAdding(true);

      const tempId = `temp-${Date.now()}`;
      const groupTasks = tasksByGroup.get(groupId) ?? [];
      const newTask: Task = {
        id: tempId,
        title: "새 태스크",
        duration: 25,
        memo: "",
        order: groupTasks.length,
        groupId,
        createdAt: new Date().toISOString(),
      };

      setTasks((prev) => [...prev, newTask]);

      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTask.title, duration: newTask.duration, groupId }),
        });

        if (res.ok) {
          const { task } = await res.json();
          setTasks((prev) => prev.map((t) => (t.id === tempId ? task : t)));
          showToast("태스크가 추가되었습니다.");
        } else {
          throw new Error("Failed to add task");
        }
      } catch (error) {
        console.error(error);
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        showToast("태스크 추가에 실패했습니다.", "error");
      } finally {
        setIsAdding(false);
      }
    },
    [isAdding, tasksByGroup, showToast],
  );

  const handleUpdateTask = useCallback(
    async (id: string, fields: Partial<Pick<Task, "title" | "duration" | "memo">>) => {
      const previousTasks = [...tasksRef.current];
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...fields } : t)));

      try {
        const res = await fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) throw new Error("Failed to update task");
      } catch (error) {
        console.error(error);
        setTasks(previousTasks);
        showToast("태스크 수정에 실패했습니다.", "error");
      }
    },
    [showToast],
  );

  const handleDeleteTask = useCallback(
    async (id: string) => {
      const previousTasks = [...tasksRef.current];
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
        setTasks(previousTasks);
        showToast("태스크 삭제에 실패했습니다.", "error");
      }
    },
    [showToast],
  );

  // --- 그룹 CRUD ---
  const handleAddGroup = useCallback(async () => {
    if (isAddingGroup) return;
    setIsAddingGroup(true);

    const tempId = `temp-group-${Date.now()}`;
    const newGroup: Group = {
      id: tempId,
      name: "새 그룹",
      order: groups.length,
      collapsed: false,
      createdAt: new Date().toISOString(),
    };

    setGroups((prev) => [...prev, newGroup]);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroup.name }),
      });

      if (res.ok) {
        const { group } = await res.json();
        setGroups((prev) => prev.map((g) => (g.id === tempId ? group : g)));
        showToast("그룹이 추가되었습니다.");
      } else {
        throw new Error("Failed to add group");
      }
    } catch (error) {
      console.error(error);
      setGroups((prev) => prev.filter((g) => g.id !== tempId));
      showToast("그룹 추가에 실패했습니다.", "error");
    } finally {
      setIsAddingGroup(false);
    }
  }, [isAddingGroup, groups.length, showToast]);

  const handleUpdateGroup = useCallback(
    async (id: string, fields: Partial<Pick<Group, "name" | "collapsed">>) => {
      const previousGroups = [...groupsRef.current];
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...fields } : g)));

      try {
        const res = await fetch(`/api/groups/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) throw new Error("Failed to update group");
      } catch (error) {
        console.error(error);
        setGroups(previousGroups);
        // collapsed 토글은 조용히 롤백, 이름 변경은 토스트
        if (fields.name !== undefined) {
          showToast("그룹 수정에 실패했습니다.", "error");
        }
      }
    },
    [showToast],
  );

  const handleDeleteGroup = useCallback(
    async (id: string) => {
      const previousGroups = [...groupsRef.current];
      const previousTasks = [...tasksRef.current];

      setGroups((prev) => prev.filter((g) => g.id !== id));
      setTasks((prev) => prev.map((t) => (t.groupId === id ? { ...t, groupId: null } : t)));

      try {
        const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
        if (res.ok) {
          showToast("그룹이 삭제되었습니다.");
        } else {
          throw new Error("Failed to delete group");
        }
      } catch (error) {
        console.error(error);
        setGroups(previousGroups);
        setTasks(previousTasks);
        showToast("그룹 삭제에 실패했습니다.", "error");
      }
    },
    [showToast],
  );

  // --- DnD 핸들러 ---
  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    tasksBeforeDrag.current = [...tasks];
    groupsBeforeDrag.current = [...groups];

    if (id.startsWith("group::")) {
      const groupId = id.replace("group::", "");
      const group = groups.find((g) => g.id === groupId);
      if (group) setActiveItem({ type: "group", data: group });
    } else if (id.startsWith("task::")) {
      const taskId = id.replace("task::", "");
      const task = tasks.find((t) => t.id === taskId);
      if (task) setActiveItem({ type: "task", data: task });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // 그룹 드래그 중이면 무시
    if (activeId.startsWith("group::")) return;
    if (!activeId.startsWith("task::")) return;

    const activeTaskId = activeId.replace("task::", "");

    // 타겟 그룹 결정
    let targetGroupId: string | null = null;
    let overTaskId: string | null = null;

    if (overId === "droppable::ungrouped") {
      targetGroupId = null;
    } else if (overId.startsWith("droppable::")) {
      targetGroupId = overId.replace("droppable::", "");
    } else if (overId.startsWith("group::")) {
      // 그룹 카드 자체에 드롭된 경우 (특히 빈 그룹)
      targetGroupId = overId.replace("group::", "");
    } else if (overId.startsWith("task::")) {
      overTaskId = overId.replace("task::", "");
      const overTask = tasks.find((t) => t.id === overTaskId);
      if (!overTask) return;
      targetGroupId = overTask.groupId;
    } else {
      return;
    }

    const activeTask = tasks.find((t) => t.id === activeTaskId);
    if (!activeTask) return;

    // 같은 그룹 내 순서 변경 (그룹 태스크만 격리하여 이동)
    if (activeTask.groupId === targetGroupId) {
      if (overTaskId && overTaskId !== activeTaskId) {
        setTasks((prev) => {
          const gid = activeTask.groupId ?? null;
          const groupTasks = prev.filter((t) => (t.groupId ?? null) === gid);
          const others = prev.filter((t) => (t.groupId ?? null) !== gid);
          const activeIdx = groupTasks.findIndex((t) => t.id === activeTaskId);
          const overIdx = groupTasks.findIndex((t) => t.id === overTaskId);
          if (activeIdx === -1 || overIdx === -1) return prev;
          return [...others, ...arrayMove(groupTasks, activeIdx, overIdx)];
        });
      }
      return;
    }

    // 다른 그룹으로 이동
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== activeTaskId);
      const movedTask = { ...activeTask, groupId: targetGroupId };

      if (overTaskId) {
        // 특정 태스크 위에 드롭 → 해당 위치에 삽입
        const overIdx = updated.findIndex((t) => t.id === overTaskId);
        updated.splice(overIdx, 0, movedTask);
      } else {
        // 빈 드롭존에 드롭 → 해당 그룹 마지막에 추가
        updated.push(movedTask);
      }

      return updated;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("group::") && overId.startsWith("group::")) {
      // --- 그룹 순서 변경 ---
      const fromGroupId = activeId.replace("group::", "");
      const toGroupId = overId.replace("group::", "");
      if (fromGroupId === toGroupId) return;

      const fromIdx = groups.findIndex((g) => g.id === fromGroupId);
      const toIdx = groups.findIndex((g) => g.id === toGroupId);
      if (fromIdx === -1 || toIdx === -1) return;

      const reordered = arrayMove(groups, fromIdx, toIdx);
      setGroups(reordered);

      const validIds = reordered.filter((g) => !g.id.startsWith("temp-")).map((g) => g.id);
      if (validIds.length === 0) return;

      try {
        const res = await fetch("/api/groups/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: validIds }),
        });
        if (!res.ok) throw new Error("Failed to reorder groups");
      } catch (error) {
        console.error(error);
        setGroups(groupsBeforeDrag.current);
        showToast("그룹 순서 변경에 실패했습니다.", "error");
      }
      return;
    }

    if (activeId.startsWith("task::")) {
      // --- 태스크 순서/그룹 변경 API 호출 ---
      // onDragOver에서 이미 tasks state가 갱신됨
      // 최신 tasks 상태에서 각 그룹별로 order를 재계산하여 API 호출
      const latestTasks = tasksRef.current;
      const latestGroups = groupsRef.current;

      const moves: { id: string; groupId: string | null; order: number }[] = [];
      const groupIds = [null, ...latestGroups.map((g) => g.id)];

      for (const gid of groupIds) {
        const groupTasks = latestTasks.filter((t) => (t.groupId ?? null) === gid);
        groupTasks.forEach((t, idx) => {
          if (!t.id.startsWith("temp-")) {
            moves.push({ id: t.id, groupId: gid, order: idx });
          }
        });
      }

      if (moves.length === 0) return;

      try {
        const res = await fetch("/api/tasks/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ moves }),
        });
        if (!res.ok) throw new Error("Failed to reorder tasks");
      } catch (error) {
        console.error(error);
        setTasks(tasksBeforeDrag.current);
        showToast("순서 변경에 실패했습니다.", "error");
      }
    }
  };

  // --- 총 소요시간 ---
  const totalMinutes = tasks.reduce((sum, t) => sum + t.duration, 0);
  const ungroupedTasks = tasksByGroup.get(null) ?? [];

  return (
    <div className="mx-auto max-w-xl pb-20 relative">
      {/* Toast */}
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
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col gap-4">
          {/* 그룹 카드들 */}
          <SortableContext
            items={groups.map((g) => `group::${g.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                tasks={tasksByGroup.get(group.id) ?? []}
                onUpdateGroup={handleUpdateGroup}
                onDeleteGroup={handleDeleteGroup}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onAddTask={handleAddTask}
              />
            ))}
          </SortableContext>

          {/* 미분류 태스크 */}
          <SortableContext
            items={ungroupedTasks.map((t) => `task::${t.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <UngroupedDropZone>
              {ungroupedTasks.length === 0 && groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                  <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <p className="text-sm font-medium">할 일이 없습니다.</p>
                  <p className="text-xs mt-1">새로운 작업을 추가해보세요!</p>
                </div>
              ) : (
                ungroupedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onUpdate={handleUpdateTask}
                    onDelete={handleDeleteTask}
                  />
                ))
              )}
            </UngroupedDropZone>
          </SortableContext>
        </div>

        {/* 드래그 오버레이 */}
        <DragOverlay dropAnimation={dropAnimationConfig}>
          {activeItem?.type === "task" && (
            <TaskItem
              task={activeItem.data}
              onUpdate={() => { }}
              onDelete={() => { }}
              isOverlay
            />
          )}
          {activeItem?.type === "group" && (
            <GroupCard
              group={activeItem.data}
              tasks={tasksByGroup.get(activeItem.data.id) ?? []}
              onUpdateGroup={() => { }}
              onDeleteGroup={() => { }}
              onUpdateTask={() => { }}
              onDeleteTask={() => { }}
              onAddTask={() => { }}
              isOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* 하단 액션 */}
      <div className="mt-6 flex flex-col gap-3">
        <AddTaskButton onAdd={() => handleAddTask(null)} disabled={isAdding} />
        <AddGroupButton onAdd={handleAddGroup} disabled={isAddingGroup} />
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
