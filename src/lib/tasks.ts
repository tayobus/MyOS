import clientPromise from "@/lib/mongodb";
import { TaskDocument } from "@/types/task";

const DB_NAME = "myos";
const COLLECTION = "tasks";

// 공통 tasks 컬렉션 접근 함수
export async function getTaskCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<TaskDocument>(COLLECTION);
}
