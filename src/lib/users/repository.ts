import { Collection, InsertOneResult } from "mongodb";
import { UserDocument } from "@/types/user";

const DB_NAME = "myos";
const COLLECTION = "users";

export function createUserRepository(col: Collection<UserDocument>) {
  return {
    findByEmail: (email: string) => col.findOne({ email }),
    insert: (doc: UserDocument) => col.insertOne(doc) as Promise<InsertOneResult>,
  };
}

export async function getUserCollection() {
  const { default: clientPromise } = await import("@/lib/mongodb");
  const client = await clientPromise;
  return client.db(DB_NAME).collection<UserDocument>(COLLECTION);
}
