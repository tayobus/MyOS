import { NextResponse } from "next/server";
import { removeTokenCookie } from "@/lib/auth";

// POST /api/auth/logout — 로그아웃
export async function POST() {
  await removeTokenCookie();
  return NextResponse.json({ success: true });
}
