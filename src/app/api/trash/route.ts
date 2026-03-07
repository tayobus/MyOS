import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getTaskCollection } from "@/lib/tasks";
import { getGroupCollection } from "@/lib/groups";
import { serializeTask, TaskDocument } from "@/types/task";
import { serializeGroup, GroupDocument } from "@/types/group";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// GET /api/trash — 휴지통 항목 조회 (삭제된 태스크 + 그룹)
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = new ObjectId(user.userId);

  const [taskCol, groupCol] = await Promise.all([
    getTaskCollection(),
    getGroupCollection(),
  ]);
  const [taskDocs, groupDocs] = await Promise.all([
    taskCol.find({ deletedAt: { $ne: null }, userId }).sort({ deletedAt: -1 }).toArray(),
    groupCol.find({ deletedAt: { $ne: null }, userId }).sort({ deletedAt: -1 }).toArray(),
  ]);

  return NextResponse.json({
    tasks: taskDocs.map((d) => serializeTask(d as TaskDocument)),
    groups: groupDocs.map((d) => serializeGroup(d as GroupDocument)),
  });
}

// DELETE /api/trash — 휴지통 비우기 (모든 삭제 항목 영구 삭제)
export async function DELETE(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = new ObjectId(user.userId);

  const [taskCol, groupCol] = await Promise.all([
    getTaskCollection(),
    getGroupCollection(),
  ]);
  await Promise.all([
    taskCol.deleteMany({ deletedAt: { $ne: null }, userId }),
    groupCol.deleteMany({ deletedAt: { $ne: null }, userId }),
  ]);

  return NextResponse.json({ success: true });
}
