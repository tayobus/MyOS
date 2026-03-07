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
