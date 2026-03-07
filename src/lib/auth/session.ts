import { verifyToken as defaultVerify, TokenPayload } from "./token";

type VerifyFn = (token: string) => Promise<TokenPayload | null>;

// cookie 헤더에서 특정 이름의 값 추출
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
