import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUserCollection } from "@/lib/users";
import { serializeUser, UserDocument } from "@/types/user";
import { createToken, setTokenCookie } from "@/lib/auth";

// POST /api/auth/login — 로그인
export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || typeof email !== "string" || email.trim() === "") {
    return NextResponse.json({ error: "이메일은 필수입니다" }, { status: 400 });
  }
  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "비밀번호는 필수입니다" },
      { status: 400 },
    );
  }

  const col = await getUserCollection();
  const user = await col.findOne({ email: email.trim().toLowerCase() });

  if (!user) {
    return NextResponse.json(
      { error: "이메일 또는 비밀번호가 올바르지 않습니다" },
      { status: 401 },
    );
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json(
      { error: "이메일 또는 비밀번호가 올바르지 않습니다" },
      { status: 401 },
    );
  }

  // JWT 토큰 생성 및 쿠키 설정
  const token = await createToken({
    userId: user._id.toHexString(),
    email: user.email,
  });
  await setTokenCookie(token);

  return NextResponse.json({ user: serializeUser(user as UserDocument) });
}
