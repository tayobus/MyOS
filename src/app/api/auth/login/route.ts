import { NextResponse } from "next/server";
import { getUserCollection, createUserRepository } from "@/lib/users/repository";
import { verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/token";
import { serializeUser } from "@/types/user";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요" }, { status: 400 });
  }

  const col = await getUserCollection();
  const repo = createUserRepository(col);

  const user = await repo.findByEmail(email);
  if (!user) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다" }, { status: 401 });
  }

  const token = await signToken({ userId: user._id.toHexString(), email: user.email });
  const response = NextResponse.json({ user: serializeUser(user) });
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
