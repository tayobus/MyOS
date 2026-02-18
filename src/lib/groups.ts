import clientPromise from "@/lib/mongodb";
import { GroupDocument } from "@/types/group";

const DB_NAME = "myos";
const COLLECTION = "groups";

// 공통 groups 컬렉션 접근 함수
export async function getGroupCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<GroupDocument>(COLLECTION);
}
