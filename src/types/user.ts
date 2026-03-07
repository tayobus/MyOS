import { ObjectId } from "mongodb";

// 클라이언트용 직렬화 타입 (passwordHash 제외)
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

// MongoDB 도큐먼트 타입 (서버 전용)
export interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

// UserDocument -> User 직렬화
export function serializeUser(doc: UserDocument): User {
  return {
    id: doc._id.toHexString(),
    email: doc.email,
    createdAt: doc.createdAt.toISOString(),
  };
}
