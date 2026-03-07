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
