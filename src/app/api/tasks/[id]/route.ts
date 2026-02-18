import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getTaskCollection } from "@/lib/tasks";
import { serializeTask, TaskDocument } from "@/types/task";

// PATCH /api/tasks/[id] — 태스크 수정 (title, duration)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "수정할 필드가 없습니다" }, { status: 400 });
  }

  const col = await getTaskCollection();
  const result = await col.findOneAndUpdate(
    { _id: objectId },
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
  const { id } = await params;

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "잘못된 id 형식입니다" }, { status: 400 });
  }

  const col = await getTaskCollection();
  const result = await col.deleteOne({ _id: objectId });

  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "태스크를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
