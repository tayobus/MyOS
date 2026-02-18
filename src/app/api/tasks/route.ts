import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getTaskCollection } from "@/lib/tasks";
import { serializeTask, TaskDocument } from "@/types/task";

export const dynamic = "force-dynamic";

// GET /api/tasks — 전체 태스크 목록 (order 순)
export async function GET() {
  const col = await getTaskCollection();
  const docs = await col.find().sort({ order: 1 }).toArray();
  return NextResponse.json({ tasks: docs.map(serializeTask) });
}

// POST /api/tasks — 태스크 생성
export async function POST(req: Request) {
  const body = await req.json();
  const { title, duration, groupId } = body;

  if (!title || typeof title !== "string" || title.trim() === "") {
    return NextResponse.json({ error: "title은 필수입니다" }, { status: 400 });
  }
  if (typeof duration !== "number" || !Number.isInteger(duration) || duration < 0) {
    return NextResponse.json(
      { error: "duration은 0 이상의 정수여야 합니다" },
      { status: 400 },
    );
  }

  // groupId 파싱 (선택적)
  let parsedGroupId: ObjectId | null = null;
  if (groupId !== undefined && groupId !== null) {
    try {
      parsedGroupId = new ObjectId(groupId);
    } catch {
      return NextResponse.json({ error: "잘못된 groupId 형식입니다" }, { status: 400 });
    }
  }

  const col = await getTaskCollection();
  // 같은 그룹 내 최대 order 계산
  const filter = parsedGroupId ? { groupId: parsedGroupId } : { groupId: null };
  const last = await col.find(filter).sort({ order: -1 }).limit(1).toArray();
  const order = last.length > 0 ? last[0].order + 1 : 0;

  const doc = {
    title: title.trim(),
    duration,
    memo: "",
    order,
    groupId: parsedGroupId,
    createdAt: new Date(),
  };

  const result = await col.insertOne(doc as TaskDocument);
  const inserted = await col.findOne({ _id: result.insertedId });
  return NextResponse.json({ task: serializeTask(inserted as TaskDocument) }, { status: 201 });
}
