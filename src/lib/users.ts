import clientPromise from "@/lib/mongodb";
import { UserDocument } from "@/types/user";

const DB_NAME = "myos";
const COLLECTION = "users";

// 공통 users 컬렉션 접근 함수
export async function getUserCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<UserDocument>(COLLECTION);
}
