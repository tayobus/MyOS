import { ObjectId } from "mongodb";

// 클라이언트용 직렬화 타입
export interface Group {
  id: string;
  name: string;
  order: number;
  collapsed: boolean;
  createdAt: string; // ISO 8601
}

// MongoDB 도큐먼트 타입 (서버 전용)
export interface GroupDocument {
  _id: ObjectId;
  name: string;
  order: number;
  collapsed: boolean;
  createdAt: Date;
}

// GroupDocument → Group 직렬화
export function serializeGroup(doc: GroupDocument): Group {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    order: doc.order,
    collapsed: doc.collapsed ?? false,
    createdAt: doc.createdAt.toISOString(),
  };
}
