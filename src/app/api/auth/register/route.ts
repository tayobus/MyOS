import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserCollection } from "@/lib/users";
import { serializeUser, UserDocument } from "@/types/user";
import { createToken, setTokenCookie } from "@/lib/auth";

// POST /api/auth/register — 회원가입
export async function POST(req: Request) {
  const body = await req.json();
  const { email, password, name } = body;

  // 입력값 검증
  if (!email || typeof email !== "string" || email.trim() === "") {
    return NextResponse.json({ error: "이메일은 필수입니다" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "비밀번호는 6자 이상이어야 합니다" },
      { status: 400 },
    );
  }
  if (!name || typeof name !== "string" || name.trim() === "") {
    return NextResponse.json({ error: "이름은 필수입니다" }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json(
      { error: "올바른 이메일 형식이 아닙니다" },
      { status: 400 },
    );
  }

  const col = await getUserCollection();

  // 이메일 중복 검사
  const existing = await col.findOne({ email: email.trim().toLowerCase() });
  if (existing) {
    return NextResponse.json(
      { error: "이미 사용 중인 이메일입니다" },
      { status: 409 },
    );
  }

  // 비밀번호 해싱
  const passwordHash = await bcrypt.hash(password, 12);

  const doc = {
    email: email.trim().toLowerCase(),
    name: name.trim(),
    passwordHash,
    createdAt: new Date(),
  };

  const result = await col.insertOne(doc as UserDocument);
  const inserted = await col.findOne({ _id: result.insertedId });

  if (!inserted) {
    return NextResponse.json(
      { error: "회원가입에 실패했습니다" },
      { status: 500 },
    );
  }

  // JWT 토큰 생성 및 쿠키 설정
  const token = await createToken({
    userId: result.insertedId.toHexString(),
    email: inserted.email,
  });
  await setTokenCookie(token);

  return NextResponse.json(
    { user: serializeUser(inserted as UserDocument) },
    { status: 201 },
  );
}
