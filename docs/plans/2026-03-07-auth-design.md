# 회원 기능 설계

## 요구사항

- 멀티유저 지원 (사용자별 태스크 분리)
- 이메일/비밀번호 인증
- 최소 범위: 회원가입, 로그인, 로그아웃
- JWT 기반 stateless 세션
- 직접 구현 (라이브러리 미사용)

## 기술 스택 추가

- `bcryptjs` - 비밀번호 해싱
- `jose` - JWT 생성/검증 (Edge Runtime 호환)
- `vitest` - TDD 테스트 프레임워크

## 아키텍처 — 계층형, 모듈 단위 분리

### 디렉토리 구조

```
src/
├── lib/
│   ├── auth/
│   │   ├── password.ts       # 해싱 추상화 (bcrypt 은닉)
│   │   ├── token.ts          # JWT 추상화 (jose 은닉)
│   │   └── session.ts        # getCurrentUser(req) - 외부 공개 인터페이스
│   ├── users/
│   │   └── repository.ts     # User DB 접근
│   ├── tasks/
│   │   └── repository.ts     # Task DB 접근 (기존 tasks.ts 이동)
│   └── groups/
│       └── repository.ts     # Group DB 접근 (기존 groups.ts 이동)
├── types/
│   ├── user.ts               # User 도메인 타입
│   ├── task.ts               # (기존 유지)
│   └── group.ts              # (기존 유지)
```

### 설계 원칙

- **관심사 분리**: API Route는 HTTP만 담당 (파싱, 응답). 비즈니스 로직은 모듈 함수
- **정보 은닉**: password.ts는 bcrypt를, token.ts는 jose를 숨김. 교체 시 해당 파일만 수정
- **낮은 결합도**: task/group 모듈은 auth에 의존하지 않음. userId만 받음
- **높은 응집도**: 모듈별 단일 책임
- **테스트 용이성**: 의존성 주입으로 모든 계층 독립 테스트 가능

### 의존 흐름

```
API Route
  ├── getCurrentUser(req)         <- session.ts
  ├── createUserRepository(col)   <- 컬렉션 주입
  └── createTaskRepository(col)   <- 컬렉션 주입

session.ts -> token.ts (내부 의존)
repository -> mongodb.ts (DB 연결)
```

## 데이터 모델

### User 컬렉션

- `_id`: ObjectId
- `email`: string (unique index)
- `passwordHash`: string (bcrypt)
- `createdAt`: Date

### 기존 컬렉션 변경

- tasks, groups에 `userId: ObjectId` 필드 추가
- 모든 조회/생성 시 userId 필터링

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | /api/auth/signup | 회원가입 |
| POST | /api/auth/login | 로그인 |
| POST | /api/auth/logout | 로그아웃 |
| GET | /api/auth/me | 현재 유저 확인 |

## JWT 설정

- jose 라이브러리
- 페이로드: `{ userId, email }`
- httpOnly, secure, sameSite=lax 쿠키
- 만료: 7일

## 미들웨어

- JWT 검증, 비로그인 시 `/login` 리다이렉트
- `/api/auth/*`, `/login` 경로 제외

## 의존성 주입 패턴

### Repository

```ts
export function createUserRepository(col: Collection<UserDocument>) {
  return {
    findByEmail: (email: string) => col.findOne({ email }),
    insert: (doc: UserDocument) => col.insertOne(doc),
  };
}
```

### Session

```ts
export function createGetCurrentUser(verify = defaultVerify) {
  return async (req: Request) => {
    const token = getCookieFromRequest(req, "token");
    if (!token) return null;
    return verify(token);
  };
}
export const getCurrentUser = createGetCurrentUser();
```

## 테스트 전략

| 대상 | 방식 | 의존성 |
|------|------|--------|
| password.ts | 단위 테스트 | 없음 (순수 함수) |
| token.ts | 단위 테스트 | 없음 (jose 실제 호출) |
| serializers | 단위 테스트 | 없음 (순수 함수) |
| repository | 단위 테스트 | mock 컬렉션 주입 |
| session.ts | 단위 테스트 | mock verify 주입 |
| API Routes | 통합 테스트 | 테스트 DB + 실제 요청 |

분류 기준: 한 테스트가 한 가지 실패 원인만 갖도록 분리.

## 페이지

- `/login` - 로그인 + 회원가입 폼
- `/` - 태스크 보드 (로그인 필수)
