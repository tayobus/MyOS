import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getGroupCollection } from "@/lib/groups";
import { getTaskCollection } from "@/lib/tasks";
import { serializeGroup, GroupDocument } from "@/types/group";
import { getCurrentUser } from "@/lib/auth/session";

// PATCH /api/groups/[id] — 그룹 수정 (name, collapsed)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = new ObjectId(user.userId);

  const { id } = await params;

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
    { _id: objectId, userId },
    { $set: update },
    { returnDocument: "after" },
  );

  if (!result) {
    return NextResponse.json({ error: "그룹을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ group: serializeGroup(result as GroupDocument) });
}

// DELETE /api/groups/[id] — 그룹 휴지통으로 이동 (소속 태스크도 함께)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = new ObjectId(user.userId);

  const { id } = await params;

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "잘못된 id 형식입니다" }, { status: 400 });
  }

  const groupCol = await getGroupCollection();
  const taskCol = await getTaskCollection();

  const now = new Date();

  const group = await groupCol.findOneAndUpdate(
    { _id: objectId, deletedAt: null, userId },
    { $set: { deletedAt: now } },
    { returnDocument: "after" },
  );

  if (!group) {
    return NextResponse.json({ error: "그룹을 찾을 수 없습니다" }, { status: 404 });
  }

  // 소속 태스크도 함께 휴지통으로 이동
  await taskCol.updateMany(
    { groupId: objectId, deletedAt: null, userId },
    { $set: { deletedAt: now } },
  );

  return NextResponse.json({ success: true });
}
