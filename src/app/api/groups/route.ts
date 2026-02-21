import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getGroupCollection } from "@/lib/groups";
import { serializeGroup, GroupDocument } from "@/types/group";
import { getCurrentUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/groups — 전체 그룹 목록 (order 순)
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const col = await getGroupCollection();
  const docs = await col.find({ userId: new ObjectId(userId) }).sort({ order: 1 }).toArray();
  return NextResponse.json({ groups: docs.map(serializeGroup) });
}

// POST /api/groups — 그룹 생성
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "name은 필수입니다" }, { status: 400 });
  }

  const col = await getGroupCollection();
  const last = await col.find({ userId: new ObjectId(userId) }).sort({ order: -1 }).limit(1).toArray();
  const order = last.length > 0 ? last[0].order + 1 : 0;

  const doc = {
    name: name.trim(),
    order,
    collapsed: false,
    userId: new ObjectId(userId),
    createdAt: new Date(),
  };

  const result = await col.insertOne(doc as GroupDocument);
  const inserted = await col.findOne({ _id: result.insertedId });
  return NextResponse.json(
    { group: serializeGroup(inserted as GroupDocument) },
    { status: 201 },
  );
}
