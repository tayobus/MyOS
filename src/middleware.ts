import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "myos-default-jwt-secret-change-in-production",
);
const COOKIE_NAME = "myos-token";

// 인증이 필요하지 않은 경로들
const publicPaths = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 정적 파일, _next 등은 무시
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublicPath = publicPaths.some((p) => pathname === p);
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch {
      // 토큰이 유효하지 않은 경우
    }
  }

  // 로그인한 사용자가 로그인/회원가입 페이지 접근 시 홈으로 리다이렉트
  if (isAuthenticated && isPublicPath && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 로그인하지 않은 사용자가 보호된 페이지 접근 시 로그인으로 리다이렉트
  if (!isAuthenticated && !isPublicPath) {
    // API 요청은 401 반환
    if (pathname.startsWith("/api")) {
      // 로그아웃 API는 인증 없이도 호출 가능
      if (pathname === "/api/auth/logout") {
        return NextResponse.next();
      }
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 요청에 매칭:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
