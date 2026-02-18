import { NextResponse } from "next/server";
import { getTaskCollection } from "@/lib/tasks";
import { serializeTask, TaskDocument } from "@/types/task";

// GET /api/tasks — 전체 태스크 목록 (order 순)
export async function GET() {
  const col = await getTaskCollection();
  const docs = await col.find().sort({ order: 1 }).toArray();
  return NextResponse.json({ tasks: docs.map(serializeTask) });
}

// POST /api/tasks — 태스크 생성
export async function POST(req: Request) {
  const body = await req.json();
  const { title, duration } = body;

  if (!title || typeof title !== "string" || title.trim() === "") {
    return NextResponse.json({ error: "title은 필수입니다" }, { status: 400 });
  }
  if (typeof duration !== "number" || !Number.isInteger(duration) || duration < 0) {
    return NextResponse.json(
      { error: "duration은 0 이상의 정수여야 합니다" },
      { status: 400 },
    );
  }

  const col = await getTaskCollection();
  const last = await col.find().sort({ order: -1 }).limit(1).toArray();
  const order = last.length > 0 ? last[0].order + 1 : 0;

  const doc = {
    title: title.trim(),
    duration,
    order,
    createdAt: new Date(),
  };

  const result = await col.insertOne(doc as TaskDocument);
  const inserted = await col.findOne({ _id: result.insertedId });
  return NextResponse.json({ task: serializeTask(inserted as TaskDocument) }, { status: 201 });
}
