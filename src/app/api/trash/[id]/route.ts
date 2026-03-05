import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getTaskCollection } from "@/lib/tasks";
import { getGroupCollection } from "@/lib/groups";

// PATCH /api/trash/[id] — 휴지통에서 복원 (type 쿼리 파라미터로 task/group 구분)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "task" | "group"

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "잘못된 id 형식입니다" }, { status: 400 });
  }

  if (type === "group") {
    const groupCol = await getGroupCollection();
    const taskCol = await getTaskCollection();

    const result = await groupCol.findOneAndUpdate(
      { _id: objectId, deletedAt: { $ne: null } },
      { $set: { deletedAt: null } },
      { returnDocument: "after" },
    );
    if (!result) {
      return NextResponse.json({ error: "그룹을 찾을 수 없습니다" }, { status: 404 });
    }

    // 같은 그룹에 속한 삭제된 태스크들도 함께 복원
    await taskCol.updateMany(
      { groupId: objectId, deletedAt: { $ne: null } },
      { $set: { deletedAt: null } },
    );

    return NextResponse.json({ success: true });
  }

  // 기본: 태스크 복원
  const taskCol = await getTaskCollection();
  const result = await taskCol.findOneAndUpdate(
    { _id: objectId, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { returnDocument: "after" },
  );

  if (!result) {
    return NextResponse.json({ error: "태스크를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/trash/[id] — 휴지통에서 영구 삭제
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "task" | "group"

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "잘못된 id 형식입니다" }, { status: 400 });
  }

  if (type === "group") {
    const groupCol = await getGroupCollection();
    const taskCol = await getTaskCollection();

    // 휴지통에 있는 소속 태스크도 영구 삭제
    await taskCol.deleteMany({ groupId: objectId, deletedAt: { $ne: null } });
    const result = await groupCol.deleteOne({ _id: objectId, deletedAt: { $ne: null } });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "그룹을 찾을 수 없습니다" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }

  // 기본: 태스크 영구 삭제
  const taskCol = await getTaskCollection();
  const result = await taskCol.deleteOne({ _id: objectId, deletedAt: { $ne: null } });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "태스크를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
