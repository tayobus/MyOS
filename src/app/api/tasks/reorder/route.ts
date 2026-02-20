import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getTaskCollection } from "@/lib/tasks";
import { getCurrentUserId } from "@/lib/auth";

// PATCH /api/tasks/reorder — 태스크 순서/그룹 일괄 변경
// Body: { moves: Array<{ id: string, groupId: string | null, order: number }> }
export async function PATCH(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { moves } = body;

    if (!Array.isArray(moves) || moves.length === 0) {
      return NextResponse.json({ error: "moves 배열이 필요합니다" }, { status: 400 });
    }

    let operations;
    try {
      operations = moves.map(
        (move: { id: string; groupId: string | null; order: number }) => {
          const taskObjectId = new ObjectId(move.id);
          const groupObjectId = move.groupId ? new ObjectId(move.groupId) : null;

          return {
            updateOne: {
              filter: { _id: taskObjectId, userId: new ObjectId(userId) },
              update: { $set: { groupId: groupObjectId, order: move.order } },
            },
          };
        },
      );
    } catch {
      return NextResponse.json({ error: "잘못된 id가 포함되어 있습니다" }, { status: 400 });
    }

    const col = await getTaskCollection();

    await col.bulkWrite(operations);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Task reorder error:", error);
    return NextResponse.json(
      { error: "순서 저장에 실패했습니다." },
      { status: 500 },
    );
  }
}
