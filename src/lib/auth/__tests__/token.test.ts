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
