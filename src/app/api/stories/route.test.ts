import { describe, it, expect, beforeEach } from "vitest";
import { resetTestDb } from "@/db/testDb";
import { GET, POST } from "./route";

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/stories", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/stories", () => {
  beforeEach(() => resetTestDb());

  it("rejects a story with no title", async () => {
    const res = await POST(jsonRequest({ title: "" }) as any);
    expect(res.status).toBe(400);
  });

  it("creates and lists stories", async () => {
    const created = await POST(jsonRequest({ title: "Dune Retelling", premise: "Spice on a moon" }) as any);
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.title).toBe("Dune Retelling");

    const listed = await GET();
    const listedBody = await listed.json();
    expect(listedBody).toHaveLength(1);
    expect(listedBody[0].title).toBe("Dune Retelling");
  });
});
