import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./client";
import { stories, characters } from "./schema";
import { resetTestDb } from "./testDb";
import { createStoryScopedRepo } from "./repo";

describe("createStoryScopedRepo", () => {
  beforeEach(() => resetTestDb());

  it("creates, lists, updates, and removes rows scoped to a story", () => {
    const story = db.insert(stories).values({ title: "Repo Test Story" }).returning().get();
    const repo = createStoryScopedRepo(characters);

    const created = repo.create({ storyId: story.id, name: "Mira", description: "A smuggler" });
    expect(created.name).toBe("Mira");

    expect(repo.get(created.id)?.name).toBe("Mira");
    expect(repo.list(story.id)).toHaveLength(1);

    const updated = repo.update(created.id, { description: "A reformed smuggler" });
    expect(updated.description).toBe("A reformed smuggler");

    repo.remove(created.id);
    expect(repo.list(story.id)).toHaveLength(0);
  });
});
