import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./client";
import { stories } from "./schema";
import { resetTestDb } from "./testDb";

describe("db client", () => {
  beforeEach(() => resetTestDb());

  it("round-trips a story row", () => {
    const inserted = db.insert(stories).values({ title: "My Story" }).returning().get();
    expect(inserted.id).toBeTypeOf("number");
    expect(inserted.title).toBe("My Story");
    expect(inserted.defaultProvider).toBe("anthropic");

    const all = db.select().from(stories).all();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("My Story");
  });
});
