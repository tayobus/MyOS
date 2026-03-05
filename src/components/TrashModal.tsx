"use client";

import { useState, useEffect, useCallback } from "react";
import { Task, formatDuration } from "@/types/task";
import { Group } from "@/types/group";

interface Props {
  open: boolean;
  onClose: () => void;
  onRestored: () => void;
}

type TrashItem =
  | { type: "task"; data: Task }
  | { type: "group"; data: Group };

export default function TrashModal({ open, onClose, onRestored }: Props) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trash");
      if (res.ok) {
        const data = await res.json();
        const trashItems: TrashItem[] = [
          ...data.groups.map((g: Group) => ({ type: "group" as const, data: g })),
          ...data.tasks.map((t: Task) => ({ type: "task" as const, data: t })),
        ];
        // deletedAt 기준 최신순 정렬
        trashItems.sort((a, b) => {
          const aDate = a.data.deletedAt;
          const bDate = b.data.deletedAt;
          return new Date(bDate!).getTime() - new Date(aDate!).getTime();
        });
        setItems(trashItems);
      }
    } catch (error) {
      console.error("휴지통 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchTrash();
  }, [open, fetchTrash]);

  const handleRestore = async (item: TrashItem) => {
    const id = item.data.id;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/trash/${id}?type=${item.type}`, { method: "PATCH" });
      if (res.ok) {
        setItems((prev) => {
          if (item.type === "group") {
            // 그룹 복원 시 소속 태스크도 함께 제거
            return prev.filter(
              (i) =>
                i.data.id !== id &&
                !(i.type === "task" && (i.data as Task).groupId === id),
            );
          }
          return prev.filter((i) => i.data.id !== id);
        });
        onRestored();
      }
    } catch (error) {
      console.error("복원 실패:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (item: TrashItem) => {
    const id = item.data.id;
    if (!window.confirm("영구 삭제하면 복원할 수 없습니다. 정말 삭제하시겠습니까?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/trash/${id}?type=${item.type}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => {
          if (item.type === "group") {
            return prev.filter(
              (i) =>
                i.data.id !== id &&
                !(i.type === "task" && (i.data as Task).groupId === id),
            );
          }
          return prev.filter((i) => i.data.id !== id);
        });
      }
    } catch (error) {
      console.error("영구 삭제 실패:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm("휴지통을 비우면 모든 항목이 영구 삭제됩니다. 계속하시겠습니까?")) return;
    setActionLoading("empty");
    try {
      const res = await fetch("/api/trash", { method: "DELETE" });
      if (res.ok) {
        setItems([]);
      }
    } catch (error) {
      console.error("휴지통 비우기 실패:", error);
    } finally {
      setActionLoading(null);
    }
  };

  if (!open) return null;

  const formatDeletedAt = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay}일 전`;
    return d.toLocaleDateString("ko-KR");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* 모달 */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">휴지통</h2>
            {items.length > 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
                ({items.length}개)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                disabled={actionLoading === "empty"}
                className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                {actionLoading === "empty" ? "삭제 중..." : "휴지통 비우기"}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="닫기"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              불러오는 중...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 text-slate-300 dark:text-slate-600">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              <p className="text-sm font-medium">휴지통이 비어있습니다</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => {
                const isGroup = item.type === "group";
                const id = item.data.id;
                const isLoading = actionLoading === id;
                const deletedAt = item.data.deletedAt;

                return (
                  <div
                    key={`${item.type}-${id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {/* 타입 아이콘 */}
                    <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                      isGroup
                        ? "bg-purple-100 text-purple-500 dark:bg-purple-900/30 dark:text-purple-400"
                        : "bg-indigo-100 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400"
                    }`}>
                      {isGroup ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 11l3 3L22 4" />
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                      )}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                        {isGroup
                          ? (item.data as Group).name
                          : (item.data as Task).title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {isGroup ? "그룹" : "태스크"}
                        </span>
                        {!isGroup && (
                          <>
                            <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {formatDuration((item.data as Task).duration)}
                            </span>
                          </>
                        )}
                        <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {formatDeletedAt(deletedAt)}
                        </span>
                      </div>
                    </div>

                    {/* 액션 버튼들 */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* 복원 */}
                      <button
                        onClick={() => handleRestore(item)}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                        aria-label="복원"
                        title="복원"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                      </button>
                      {/* 영구 삭제 */}
                      <button
                        onClick={() => handlePermanentDelete(item)}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        aria-label="영구 삭제"
                        title="영구 삭제"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
