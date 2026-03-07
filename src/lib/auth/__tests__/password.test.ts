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
