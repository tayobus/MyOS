# 회원 기능 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 이메일/비밀번호 기반 멀티유저 인증 시스템을 TDD로 구현

**Architecture:** 계층형 모듈 구조 (password, token, session, repository, API route). 의존성 주입으로 테스트 용이성 확보. 기존 task/group에 userId 필터 추가.

**Tech Stack:** bcryptjs, jose, vitest

---

### Task 1: vitest 설정

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts에 test 추가)
- Modify: `tsconfig.json` (vitest 타입 포함)

**Step 1: 의존성 설치**

Run: `npm install -D vitest`

**Step 2: vitest.config.ts 생성**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Step 3: package.json에 test 스크립트 추가**

`scripts`에 `"test": "vitest run"`, `"test:watch": "vitest"` 추가

**Step 4: tsconfig.json에 vitest 타입 추가**

`compilerOptions.types`에 `["vitest/globals"]` 추가

**Step 5: 동작 확인**

Run: `npx vitest run`
Expected: "No test files found" (에러 아닌 정상 종료)

**Step 6: 커밋**

```bash
git add vitest.config.ts package.json package-lock.json tsconfig.json
git commit -m "chore: vitest 테스트 환경 설정"
```

---

### Task 2: password.ts — 비밀번호 해싱/검증

**Files:**
- Create: `src/lib/auth/password.ts`
- Create: `src/lib/auth/__tests__/password.test.ts`

**Step 1: 의존성 설치**

Run: `npm install bcryptjs && npm install -D @types/bcryptjs`

**Step 2: 실패하는 테스트 작성**

```ts
// src/lib/auth/__tests__/password.test.ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("password", () => {
  describe("hashPassword", () => {
    it("평문과 다른 해시를 반환한다", async () => {
      const hash = await hashPassword("mypassword");
      expect(hash).not.toBe("mypassword");
    });

    it("같은 평문이라도 매번 다른 해시를 생성한다", async () => {
      const hash1 = await hashPassword("mypassword");
      const hash2 = await hashPassword("mypassword");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("올바른 평문이면 true를 반환한다", async () => {
      const hash = await hashPassword("mypassword");
      const result = await verifyPassword("mypassword", hash);
      expect(result).toBe(true);
    });

    it("틀린 평문이면 false를 반환한다", async () => {
      const hash = await hashPassword("mypassword");
      const result = await verifyPassword("wrongpassword", hash);
      expect(result).toBe(false);
    });
  });
});
```

**Step 3: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/auth/__tests__/password.test.ts`
Expected: FAIL — "Cannot find module '../password'"

**Step 4: 최소 구현 작성**

```ts
// src/lib/auth/password.ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

**Step 5: 테스트 통과 확인**

Run: `npx vitest run src/lib/auth/__tests__/password.test.ts`
Expected: 4 tests PASS

**Step 6: 커밋**

```bash
git add src/lib/auth/password.ts src/lib/auth/__tests__/password.test.ts package.json package-lock.json
git commit -m "feat: 비밀번호 해싱/검증 모듈 구현 (TDD)"
```

---

### Task 3: token.ts — JWT 생성/검증

**Files:**
- Create: `src/lib/auth/token.ts`
- Create: `src/lib/auth/__tests__/token.test.ts`

**Step 1: 의존성 설치**

Run: `npm install jose`

**Step 2: 실패하는 테스트 작성**

```ts
// src/lib/auth/__tests__/token.test.ts
import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../token";

describe("token", () => {
  const payload = { userId: "abc123", email: "test@example.com" };

  describe("signToken", () => {
    it("문자열 토큰을 반환한다", async () => {
      const token = await signToken(payload);
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe("verifyToken", () => {
    it("유효한 토큰에서 페이로드를 복원한다", async () => {
      const token = await signToken(payload);
      const result = await verifyToken(token);
      expect(result.userId).toBe("abc123");
      expect(result.email).toBe("test@example.com");
    });

    it("변조된 토큰은 null을 반환한다", async () => {
      const token = await signToken(payload);
      const tampered = token + "x";
      const result = await verifyToken(tampered);
      expect(result).toBeNull();
    });

    it("빈 문자열은 null을 반환한다", async () => {
      const result = await verifyToken("");
      expect(result).toBeNull();
    });
  });
});
```

**Step 3: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/auth/__tests__/token.test.ts`
Expected: FAIL — "Cannot find module '../token'"

**Step 4: 최소 구현 작성**

```ts
// src/lib/auth/token.ts
import { SignJWT, jwtVerify } from "jose";

// 테스트와 프로덕션 모두에서 동작하도록 환경변수 또는 기본값 사용
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "test-secret-do-not-use-in-production";
  return new TextEncoder().encode(secret);
}

export interface TokenPayload {
  userId: string;
  email: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}
```

**Step 5: 테스트 통과 확인**

Run: `npx vitest run src/lib/auth/__tests__/token.test.ts`
Expected: 4 tests PASS

**Step 6: 커밋**

```bash
git add src/lib/auth/token.ts src/lib/auth/__tests__/token.test.ts package.json package-lock.json
git commit -m "feat: JWT 토큰 생성/검증 모듈 구현 (TDD)"
```

---

### Task 4: User 타입 정의

**Files:**
- Create: `src/types/user.ts`
- Create: `src/types/__tests__/user.test.ts`

**Step 1: 실패하는 테스트 작성**

```ts
// src/types/__tests__/user.test.ts
import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import { serializeUser } from "../user";

describe("serializeUser", () => {
  it("UserDocument를 User로 직렬화한다", () => {
    const doc = {
      _id: new ObjectId("507f1f77bcf86cd799439011"),
      email: "test@example.com",
      passwordHash: "hashed",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    };

    const user = serializeUser(doc);

    expect(user).toEqual({
      id: "507f1f77bcf86cd799439011",
      email: "test@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("passwordHash를 포함하지 않는다", () => {
    const doc = {
      _id: new ObjectId("507f1f77bcf86cd799439011"),
      email: "test@example.com",
      passwordHash: "hashed",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    };

    const user = serializeUser(doc);
    expect(user).not.toHaveProperty("passwordHash");
  });
});
```

**Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/types/__tests__/user.test.ts`
Expected: FAIL

**Step 3: 최소 구현 작성**

```ts
// src/types/user.ts
import { ObjectId } from "mongodb";

// 클라이언트용 직렬화 타입 (passwordHash 제외)
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

// MongoDB 도큐먼트 타입 (서버 전용)
export interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

// UserDocument -> User 직렬화
export function serializeUser(doc: UserDocument): User {
  return {
    id: doc._id.toHexString(),
    email: doc.email,
    createdAt: doc.createdAt.toISOString(),
  };
}
```

**Step 4: 테스트 통과 확인**

Run: `npx vitest run src/types/__tests__/user.test.ts`
Expected: 2 tests PASS

**Step 5: 커밋**

```bash
git add src/types/user.ts src/types/__tests__/user.test.ts
git commit -m "feat: User 타입과 직렬화 함수 구현 (TDD)"
```

---

### Task 5: User Repository

**Files:**
- Create: `src/lib/users/repository.ts`
- Create: `src/lib/users/__tests__/repository.test.ts`

**Step 1: 실패하는 테스트 작성**

```ts
// src/lib/users/__tests__/repository.test.ts
import { describe, it, expect, vi } from "vitest";
import { createUserRepository } from "../repository";

// mock 컬렉션 팩토리
function createMockCollection() {
  return {
    findOne: vi.fn(),
    insertOne: vi.fn(),
    createIndex: vi.fn(),
  };
}

describe("userRepository", () => {
  describe("findByEmail", () => {
    it("이메일로 유저를 조회한다", async () => {
      const col = createMockCollection();
      const fakeUser = { _id: "id1", email: "test@test.com" };
      col.findOne.mockResolvedValue(fakeUser);

      const repo = createUserRepository(col as any);
      const result = await repo.findByEmail("test@test.com");

      expect(col.findOne).toHaveBeenCalledWith({ email: "test@test.com" });
      expect(result).toEqual(fakeUser);
    });

    it("존재하지 않는 이메일이면 null을 반환한다", async () => {
      const col = createMockCollection();
      col.findOne.mockResolvedValue(null);

      const repo = createUserRepository(col as any);
      const result = await repo.findByEmail("nope@test.com");

      expect(result).toBeNull();
    });
  });

  describe("insert", () => {
    it("유저를 삽입하고 결과를 반환한다", async () => {
      const col = createMockCollection();
      col.insertOne.mockResolvedValue({ insertedId: "id1" });

      const repo = createUserRepository(col as any);
      const doc = { email: "test@test.com", passwordHash: "hash", createdAt: new Date() };
      const result = await repo.insert(doc as any);

      expect(col.insertOne).toHaveBeenCalledWith(doc);
      expect(result).toEqual({ insertedId: "id1" });
    });
  });
});
```

**Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/users/__tests__/repository.test.ts`
Expected: FAIL

**Step 3: 최소 구현 작성**

```ts
// src/lib/users/repository.ts
import { Collection, InsertOneResult } from "mongodb";
import { UserDocument } from "@/types/user";
import clientPromise from "@/lib/mongodb";

const DB_NAME = "myos";
const COLLECTION = "users";

export function createUserRepository(col: Collection<UserDocument>) {
  return {
    findByEmail: (email: string) => col.findOne({ email }),
    insert: (doc: UserDocument) => col.insertOne(doc) as Promise<InsertOneResult>,
  };
}

// 프로덕션용: 실제 컬렉션으로 생성
export async function getUserCollection() {
  const client = await clientPromise;
  return client.db(DB_NAME).collection<UserDocument>(COLLECTION);
}
```

**Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/users/__tests__/repository.test.ts`
Expected: 3 tests PASS

**Step 5: 커밋**

```bash
git add src/lib/users/repository.ts src/lib/users/__tests__/repository.test.ts
git commit -m "feat: User repository 모듈 구현 (TDD)"
```

---

### Task 6: session.ts — 요청에서 현재 유저 추출

**Files:**
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/auth/__tests__/session.test.ts`

**Step 1: 실패하는 테스트 작성**

```ts
// src/lib/auth/__tests__/session.test.ts
import { describe, it, expect, vi } from "vitest";
import { createGetCurrentUser } from "../session";

function makeRequest(cookieHeader?: string): Request {
  const headers = new Headers();
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return new Request("http://localhost", { headers });
}

describe("getCurrentUser", () => {
  it("쿠키가 없으면 null을 반환한다", async () => {
    const verify = vi.fn();
    const getCurrentUser = createGetCurrentUser(verify);

    const result = await getCurrentUser(makeRequest());

    expect(result).toBeNull();
    expect(verify).not.toHaveBeenCalled();
  });

  it("token 쿠키가 없으면 null을 반환한다", async () => {
    const verify = vi.fn();
    const getCurrentUser = createGetCurrentUser(verify);

    const result = await getCurrentUser(makeRequest("other=abc"));

    expect(result).toBeNull();
  });

  it("유효한 토큰이면 페이로드를 반환한다", async () => {
    const payload = { userId: "abc", email: "test@test.com" };
    const verify = vi.fn().mockResolvedValue(payload);
    const getCurrentUser = createGetCurrentUser(verify);

    const result = await getCurrentUser(makeRequest("token=valid-jwt"));

    expect(verify).toHaveBeenCalledWith("valid-jwt");
    expect(result).toEqual(payload);
  });

  it("유효하지 않은 토큰이면 null을 반환한다", async () => {
    const verify = vi.fn().mockResolvedValue(null);
    const getCurrentUser = createGetCurrentUser(verify);

    const result = await getCurrentUser(makeRequest("token=bad-jwt"));

    expect(result).toBeNull();
  });
});
```

**Step 2: 테스트가 실패하는지 확인**

Run: `npx vitest run src/lib/auth/__tests__/session.test.ts`
Expected: FAIL

**Step 3: 최소 구현 작성**

```ts
// src/lib/auth/session.ts
import { verifyToken as defaultVerify, TokenPayload } from "./token";

type VerifyFn = (token: string) => Promise<TokenPayload | null>;

function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

export function createGetCurrentUser(verify: VerifyFn = defaultVerify) {
  return async (req: Request): Promise<TokenPayload | null> => {
    const cookieHeader = req.headers.get("cookie");
    if (!cookieHeader) return null;

    const token = parseCookie(cookieHeader, "token");
    if (!token) return null;

    return verify(token);
  };
}

export const getCurrentUser = createGetCurrentUser();
```

**Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/auth/__tests__/session.test.ts`
Expected: 4 tests PASS

**Step 5: 커밋**

```bash
git add src/lib/auth/session.ts src/lib/auth/__tests__/session.test.ts
git commit -m "feat: 세션 모듈 구현 — 요청에서 현재 유저 추출 (TDD)"
```

---

### Task 7: 회원가입 API

**Files:**
- Create: `src/app/api/auth/signup/route.ts`

**Note:** 이 태스크부터는 통합 테스트 영역. DB 의존이 있어 수동 테스트 또는 별도 통합 테스트로 검증.

**Step 1: 회원가입 API 구현**

```ts
// src/app/api/auth/signup/route.ts
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
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: "/",
  });

  return response;
}
```

**Step 2: 수동 테스트**

Run: `npm run dev`

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}' -v
```

Expected: 201, Set-Cookie 헤더에 token 포함, body에 user 객체 반환
Expected (중복): 409, "이미 사용 중인 이메일입니다"

**Step 3: 커밋**

```bash
git add src/app/api/auth/signup/route.ts
git commit -m "feat: 회원가입 API 구현"
```

---

### Task 8: 로그인 API

**Files:**
- Create: `src/app/api/auth/login/route.ts`

**Step 1: 로그인 API 구현**

```ts
// src/app/api/auth/login/route.ts
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
```

**Step 2: 수동 테스트**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}' -v
```

Expected: 200, Set-Cookie, user 객체
Expected (틀린 비밀번호): 401

**Step 3: 커밋**

```bash
git add src/app/api/auth/login/route.ts
git commit -m "feat: 로그인 API 구현"
```

---

### Task 9: 로그아웃 API + 현재 유저 API

**Files:**
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/me/route.ts`

**Step 1: 로그아웃 구현**

```ts
// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
```

**Step 2: 현재 유저 확인 API 구현**

```ts
// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
```

**Step 3: 커밋**

```bash
git add src/app/api/auth/logout/route.ts src/app/api/auth/me/route.ts
git commit -m "feat: 로그아웃 및 현재 유저 확인 API 구현"
```

---

### Task 10: 미들웨어 — 비로그인 시 리다이렉트

**Files:**
- Create: `src/middleware.ts`

**Step 1: 미들웨어 구현**

```ts
// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/token";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 정적 파일, _next는 통과
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 2: 수동 테스트**

- 쿠키 없이 `http://localhost:3000/` 접근 → `/login`으로 리다이렉트 확인
- 로그인 후 쿠키와 함께 접근 → 정상 렌더링 확인

**Step 3: 커밋**

```bash
git add src/middleware.ts
git commit -m "feat: 인증 미들웨어 구현 — 비로그인 시 /login 리다이렉트"
```

---

### Task 11: 기존 task/group 컬렉션에 userId 필터 추가

**Files:**
- Modify: `src/types/task.ts` — TaskDocument에 userId 추가
- Modify: `src/types/group.ts` — GroupDocument에 userId 추가
- Modify: `src/app/api/tasks/route.ts` — userId 필터 적용
- Modify: `src/app/api/tasks/[id]/route.ts` — userId 필터 적용
- Modify: `src/app/api/tasks/reorder/route.ts` — userId 필터 적용
- Modify: `src/app/api/groups/route.ts` — userId 필터 적용
- Modify: `src/app/api/groups/[id]/route.ts` — userId 필터 적용
- Modify: `src/app/api/groups/reorder/route.ts` — userId 필터 적용
- Modify: `src/app/page.tsx` — userId 기반 조회

**Step 1: TaskDocument, GroupDocument에 userId 필드 추가**

`src/types/task.ts`의 `TaskDocument`에:
```ts
userId: ObjectId;
```

`src/types/group.ts`의 `GroupDocument`에:
```ts
userId: ObjectId;
```

**Step 2: 모든 API Route에 인증 + userId 필터 적용**

각 API Route 패턴:
```ts
import { getCurrentUser } from "@/lib/auth/session";

// 핸들러 시작부에 추가:
const user = await getCurrentUser(req);
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const userId = new ObjectId(user.userId);

// 조회 시: .find({ userId }) 로 변경
// 생성 시: doc에 userId 포함
// 수정/삭제 시: 필터에 userId 추가 (예: { _id: objectId, userId })
```

**Step 3: page.tsx에서 userId 기반 조회**

```ts
// src/app/page.tsx
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/token";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  const payload = await verifyToken(token);
  if (!payload) redirect("/login");

  const userId = new ObjectId(payload.userId);

  // 기존 조회에 { userId } 필터 추가
  const taskDocs = await taskCol.find({ userId }).sort({ order: 1 }).toArray();
  const groupDocs = await groupCol.find({ userId }).sort({ order: 1 }).toArray();
  // ...
}
```

**Step 4: 수동 테스트**

- 유저 A로 로그인 → 태스크 생성 → 유저 B로 로그인 → 유저 A의 태스크가 안 보이는지 확인

**Step 5: 커밋**

```bash
git add src/types/task.ts src/types/group.ts src/app/api/ src/app/page.tsx
git commit -m "feat: 기존 API에 userId 필터 적용 — 멀티유저 데이터 분리"
```

---

### Task 12: 로그인 페이지 UI

**Files:**
- Create: `src/app/login/page.tsx`

**Step 1: 로그인/회원가입 페이지 구현**

```tsx
// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("요청에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            MyOS
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isSignup ? "계정을 만들어 시작하세요" : "로그인하여 시작하세요"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
          />
          <input
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-50"
          />

          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "처리 중..." : isSignup ? "회원가입" : "로그인"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          {isSignup ? "이미 계정이 있으신가요?" : "계정이 없으신가요?"}{" "}
          <button
            onClick={() => { setIsSignup(!isSignup); setError(""); }}
            className="text-indigo-600 font-medium hover:underline"
          >
            {isSignup ? "로그인" : "회원가입"}
          </button>
        </p>
      </div>
    </main>
  );
}
```

**Step 2: 수동 테스트**

- `http://localhost:3000/login` 접근 → 폼 렌더링
- 회원가입 → 자동으로 `/`로 이동
- 로그아웃 후 로그인 → 동작 확인

**Step 3: 커밋**

```bash
git add src/app/login/page.tsx
git commit -m "feat: 로그인/회원가입 페이지 UI 구현"
```

---

### Task 13: 로그아웃 버튼 추가

**Files:**
- Modify: `src/app/page.tsx` — 로그아웃 버튼 포함

**Step 1: page.tsx에 유저 이메일과 로그아웃 버튼 추가**

`TaskBoard`에 `userEmail` prop을 전달하거나, 헤더 영역에 별도 클라이언트 컴포넌트 추가.

간단한 방법: page.tsx의 헤더에 로그아웃 버튼용 클라이언트 컴포넌트 생성.

```tsx
// src/components/LogoutButton.tsx
"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ email }: { email: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3 text-sm text-slate-500">
      <span>{email}</span>
      <button
        onClick={handleLogout}
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        로그아웃
      </button>
    </div>
  );
}
```

page.tsx 헤더에 `<LogoutButton email={payload.email} />` 추가.

**Step 2: 수동 테스트**

- 로그인 상태에서 로그아웃 버튼 클릭 → `/login`으로 이동 확인

**Step 3: 커밋**

```bash
git add src/components/LogoutButton.tsx src/app/page.tsx
git commit -m "feat: 로그아웃 버튼 및 유저 이메일 표시 추가"
```

---

### Task 14: .env.local에 JWT_SECRET 설정 안내

**Step 1: .env.local에 JWT_SECRET 추가**

```
JWT_SECRET=여기에-랜덤-시크릿-키-입력
```

Run: `openssl rand -base64 32` 로 시크릿 생성

**Step 2: 최종 전체 테스트**

Run: `npx vitest run`
Expected: 모든 단위 테스트 PASS

Run: `npm run build`
Expected: 빌드 성공

**Step 3: 커밋 (필요 시)**

```bash
git add -A
git commit -m "chore: 최종 정리 및 빌드 검증"
```
