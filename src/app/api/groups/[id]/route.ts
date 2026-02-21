import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getGroupCollection } from "@/lib/groups";
import { getTaskCollection } from "@/lib/tasks";
import { serializeGroup, GroupDocument } from "@/types/group";
import { getCurrentUserId } from "@/lib/auth";

// PATCH /api/groups/[id] — 그룹 수정 (name, collapsed)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;
  const userObjectId = new ObjectId(userId);

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "잘못된 id 형식입니다" }, { status: 400 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json({ error: "name은 빈 문자열일 수 없습니다" }, { status: 400 });
    }
    update.name = body.name.trim();
  }
  if (body.collapsed !== undefined) {
    if (typeof body.collapsed !== "boolean") {
      return NextResponse.json({ error: "collapsed는 boolean이어야 합니다" }, { status: 400 });
    }
    update.collapsed = body.collapsed;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "수정할 필드가 없습니다" }, { status: 400 });
  }

  const col = await getGroupCollection();
  const result = await col.findOneAndUpdate(
    { _id: objectId, userId: userObjectId },
    { $set: update },
    { returnDocument: "after" },
  );

  if (!result) {
    return NextResponse.json({ error: "그룹을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ group: serializeGroup(result as GroupDocument) });
}

// DELETE /api/groups/[id] — 그룹 삭제 (소속 태스크도 함께 삭제)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;
  const userObjectId = new ObjectId(userId);

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "잘못된 id 형식입니다" }, { status: 400 });
  }

  const groupCol = await getGroupCollection();
  const taskCol = await getTaskCollection();

  const group = await groupCol.findOne({ _id: objectId, userId: userObjectId });
  if (!group) {
    return NextResponse.json({ error: "그룹을 찾을 수 없습니다" }, { status: 404 });
  }

  // 소속 태스크 모두 삭제
  await taskCol.deleteMany({ groupId: objectId });

  await groupCol.deleteOne({ _id: objectId });

  return NextResponse.json({ success: true });
}
