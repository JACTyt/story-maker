import { NextRequest, NextResponse } from "next/server";
import { listProseVersions } from "@/db/proseVersions";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await ctx.params;
  return NextResponse.json(listProseVersions(Number(chapterId)));
}
