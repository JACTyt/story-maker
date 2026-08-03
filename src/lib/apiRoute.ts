import { NextRequest, NextResponse } from "next/server";
import type { ZodObject, ZodRawShape } from "zod";

type Repo = {
  list: (storyId: number) => unknown[];
  create: (values: Record<string, unknown>) => unknown;
  update: (id: number, values: Record<string, unknown>) => unknown;
  remove: (id: number) => void;
};

export function listCreateHandlers(repo: Repo, schema: ZodObject<ZodRawShape>) {
  return {
    async GET(_req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
      const { storyId } = await ctx.params;
      return NextResponse.json(repo.list(Number(storyId)));
    },
    async POST(req: NextRequest, ctx: { params: Promise<{ storyId: string }> }) {
      const { storyId } = await ctx.params;
      const parsed = schema.safeParse(await req.json());
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      const created = repo.create({ ...(parsed.data as Record<string, unknown>), storyId: Number(storyId) });
      return NextResponse.json(created, { status: 201 });
    },
  };
}

export function itemHandlers(repo: Repo, schema: ZodObject<ZodRawShape>, paramName: string = "id") {
  return {
    async PATCH(req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
      const params = await ctx.params;
      const id = params[paramName];
      const parsed = schema.partial().safeParse(await req.json());
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      const updated = repo.update(Number(id), parsed.data as Record<string, unknown>);
      return NextResponse.json(updated);
    },
    async DELETE(_req: NextRequest, ctx: { params: Promise<Record<string, string>> }) {
      const params = await ctx.params;
      const id = params[paramName];
      repo.remove(Number(id));
      return new NextResponse(null, { status: 204 });
    },
  };
}
