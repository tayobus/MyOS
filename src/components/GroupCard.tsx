"use client";

import { useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Group } from "@/types/group";
import { Task } from "@/types/task";
import GroupHeader from "./GroupHeader";
import TaskItem from "./TaskItem";

interface Props {
  group: Group;
  tasks: Task[];
  onUpdateGroup: (id: string, fields: Partial<Pick<Group, "name" | "collapsed">>) => void;
  onDeleteGroup: (id: string) => void;
  onUpdateTask: (id: string, fields: Partial<Pick<Task, "title" | "duration" | "memo">>) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (groupId: string) => void;
  isOverlay?: boolean;
}

export default function GroupCard({
  group,
  tasks,
  onUpdateGroup,
  onDeleteGroup,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  isOverlay,
}: Props) {
  const totalMinutes = tasks.reduce((sum, t) => sum + t.duration, 0);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `group::${group.id}` });

  // 단일 droppable ref (항상 마운트된 wrapper에 연결)
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable::${group.id}`,
    data: { type: "group", groupId: group.id },
  });

  // 두 ref를 합치는 콜백
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!isOverlay) {
        setSortableRef(node);
        setDroppableRef(node);
      }
    },
    [isOverlay, setSortableRef, setDroppableRef],
  );

  const style = isOverlay
    ? undefined
    : {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
    };

  const dragHandleProps = isOverlay ? {} : { ...attributes, ...listeners };

  return (
    <div
      ref={mergedRef}
      style={style}
      className={`group/card rounded-2xl border transition-all duration-200 ${isOverlay
          ? "bg-slate-50 shadow-2xl ring-2 ring-indigo-500 scale-[1.02] rotate-[0.5deg] border-indigo-200 dark:bg-slate-900 dark:border-indigo-500"
          : `bg-slate-50/80 border-slate-200/80 dark:bg-slate-900/50 dark:border-slate-700/80 ${isOver ? "ring-2 ring-indigo-300 border-indigo-200 dark:ring-indigo-600 dark:border-indigo-700" : ""
          }`
        }`}
    >
      <GroupHeader
        group={group}
        totalMinutes={totalMinutes}
        taskCount={tasks.length}
        onUpdate={(fields) => onUpdateGroup(group.id, fields)}
        onDelete={() => onDeleteGroup(group.id)}
        dragHandleProps={dragHandleProps}
      />

      {/* 태스크 목록 (접기/펴기) */}
      {!group.collapsed && (
        <div className="px-3 pb-3">
          <SortableContext
            items={tasks.map((t) => `task::${t.id}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2 min-h-[8px]">
              {tasks.length === 0 ? (
                <div className="flex items-center justify-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                  태스크를 여기로 드래그하세요
                </div>
              ) : (
                tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onUpdate={onUpdateTask}
                    onDelete={onDeleteTask}
                  />
                ))
              )}
            </div>
          </SortableContext>

          {/* 그룹 내 태스크 추가 */}
          <button
            onClick={() => onAddTask(group.id)}
            className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 text-xs text-slate-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            할일 추가
          </button>
        </div>
      )}

      {/* 접힌 상태에서도 드롭 가능 영역 표시 */}
      {group.collapsed && (
        <div
          className={`mx-3 mb-3 rounded-lg transition-colors ${isOver
              ? "h-10 border-2 border-dashed border-indigo-300 bg-indigo-50/50 dark:border-indigo-600 dark:bg-indigo-950/20"
              : "h-1"
            }`}
        />
      )}
    </div>
  );
}
