import { NextResponse } from "next/server";
import { getUserCollection, createUserRepository } from "@/lib/users/repository";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/token";
import { serializeUser, UserDocument } from "@/types/user";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body;

  // 유효성 검사
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "유효한 이메일을 입력해주세요" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "비밀번호는 6자 이상이어야 합니다" }, { status: 400 });
  }

  const col = await getUserCollection();
  const repo = createUserRepository(col);

  // 이메일 중복 검사
  const existing = await repo.findByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다" }, { status: 409 });
  }

  // 유저 생성
  const passwordHash = await hashPassword(password);
  const doc = { email, passwordHash, createdAt: new Date() } as UserDocument;
  const result = await repo.insert(doc);

  const inserted = await col.findOne({ _id: result.insertedId });
  if (!inserted) {
    return NextResponse.json({ error: "유저 생성에 실패했습니다" }, { status: 500 });
  }

  // JWT 발급
  const token = await signToken({ userId: inserted._id.toHexString(), email });
  const response = NextResponse.json({ user: serializeUser(inserted) }, { status: 201 });
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
