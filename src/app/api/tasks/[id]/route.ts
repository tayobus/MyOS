import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getTaskCollection } from "@/lib/tasks";
import { serializeTask, TaskDocument } from "@/types/task";
import { getCurrentUserId } from "@/lib/auth";

// PATCH /api/tasks/[id] — 태스크 수정 (title, duration)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "잘못된 id 형식입니다" }, { status: 400 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim() === "") {
      return NextResponse.json({ error: "title은 빈 문자열일 수 없습니다" }, { status: 400 });
    }
    update.title = body.title.trim();
  }
  if (body.memo !== undefined) {
    if (typeof body.memo !== "string") {
      return NextResponse.json({ error: "memo는 문자열이어야 합니다" }, { status: 400 });
    }
    update.memo = body.memo;
  }
  if (body.duration !== undefined) {
    if (typeof body.duration !== "number" || !Number.isInteger(body.duration) || body.duration < 0) {
      return NextResponse.json(
        { error: "duration은 0 이상의 정수여야 합니다" },
        { status: 400 },
      );
    }
    update.duration = body.duration;
  }
  if (body.groupId !== undefined) {
    if (body.groupId === null) {
      update.groupId = null;
    } else {
      try {
        update.groupId = new ObjectId(body.groupId);
      } catch {
        return NextResponse.json({ error: "잘못된 groupId 형식입니다" }, { status: 400 });
      }
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "수정할 필드가 없습니다" }, { status: 400 });
  }

  const col = await getTaskCollection();
  const result = await col.findOneAndUpdate(
    { _id: objectId, userId: new ObjectId(userId) },
    { $set: update },
    { returnDocument: "after" },
  );

  if (!result) {
    return NextResponse.json({ error: "태스크를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ task: serializeTask(result as TaskDocument) });
}

// DELETE /api/tasks/[id] — 태스크 삭제
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { id } = await params;

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "잘못된 id 형식입니다" }, { status: 400 });
  }

  const col = await getTaskCollection();
  const result = await col.deleteOne({ _id: objectId, userId: new ObjectId(userId) });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "태스크를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
