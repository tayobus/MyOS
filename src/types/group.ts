import { ObjectId } from "mongodb";

// 클라이언트용 직렬화 타입
export interface Group {
  id: string;
  name: string;
  order: number;
  collapsed: boolean;
  createdAt: string; // ISO 8601
  deletedAt: string | null; // 휴지통 이동 시각 (null = 삭제되지 않음)
}

// MongoDB 도큐먼트 타입 (서버 전용)
export interface GroupDocument {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  order: number;
  collapsed: boolean;
  createdAt: Date;
  deletedAt: Date | null;
}

// GroupDocument → Group 직렬화
export function serializeGroup(doc: GroupDocument): Group {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    order: doc.order,
    collapsed: doc.collapsed ?? false,
    createdAt: doc.createdAt.toISOString(),
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
  };
}
