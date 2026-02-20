import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUserId } from "@/lib/auth";
import { getUserCollection } from "@/lib/users";
import { serializeUser, UserDocument } from "@/types/user";

// GET /api/auth/me — 현재 로그인된 사용자 정보
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const col = await getUserCollection();
  const user = await col.findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: serializeUser(user as UserDocument) });
}
