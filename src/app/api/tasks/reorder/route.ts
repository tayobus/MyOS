import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getTaskCollection } from "@/lib/tasks";

// PATCH /api/tasks/reorder — 순서 일괄 변경
export async function PATCH(req: Request) {
  const { orderedIds } = await req.json();

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds 배열이 필요합니다" }, { status: 400 });
  }

  let objectIds: ObjectId[];
  try {
    objectIds = orderedIds.map((id: string) => new ObjectId(id));
  } catch {
    return NextResponse.json({ error: "잘못된 id가 포함되어 있습니다" }, { status: 400 });
  }

  const col = await getTaskCollection();
  const operations = objectIds.map((oid, index) => ({
    updateOne: {
      filter: { _id: oid },
      update: { $set: { order: index } },
    },
  }));

  await col.bulkWrite(operations);
  return NextResponse.json({ success: true });
}
