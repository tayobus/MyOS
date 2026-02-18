import { ObjectId } from "mongodb";

// 클라이언트용 직렬화 타입
export interface Task {
  id: string;
  title: string;
  duration: number; // 분 단위
  order: number;
  createdAt: string; // ISO 8601
}

// MongoDB 도큐먼트 타입 (서버 전용)
export interface TaskDocument {
  _id: ObjectId;
  title: string;
  duration: number;
  order: number;
  createdAt: Date;
}

// TaskDocument → Task 직렬화
export function serializeTask(doc: TaskDocument): Task {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    duration: doc.duration,
    order: doc.order,
    createdAt: doc.createdAt.toISOString(),
  };
}

// 분 → 사람이 읽기 쉬운 형태로 변환
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}
