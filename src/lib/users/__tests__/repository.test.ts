import { describe, it, expect, vi } from "vitest";
import { createUserRepository } from "../repository";

function createMockCollection() {
  return {
    findOne: vi.fn(),
    insertOne: vi.fn(),
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
