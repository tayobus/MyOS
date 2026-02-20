import { ObjectId } from "mongodb";

// 클라이언트용 직렬화 타입
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string; // ISO 8601
}

// MongoDB 도큐먼트 타입 (서버 전용)
export interface UserDocument {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}

// UserDocument → User 직렬화 (비밀번호 제외)
export function serializeUser(doc: UserDocument): User {
  return {
    id: doc._id.toHexString(),
    email: doc.email,
    name: doc.name,
    createdAt: doc.createdAt.toISOString(),
  };
}
