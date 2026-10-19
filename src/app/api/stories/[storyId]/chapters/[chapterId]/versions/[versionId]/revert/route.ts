import { NextRequest, NextResponse } from "next/server";
import { revertToProseVersion } from "@/db/proseVersions";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ chapterId: string; versionId: string }> }
) {
  const { chapterId, versionId } = await ctx.params;
  try {
    const version = revertToProseVersion(Number(chapterId), Number(versionId));
    return NextResponse.json(version);
  } catch {
    // The only failure mode is a version that is not this chapter's.
    return NextResponse.json({ error: "version not found for this chapter" }, { status: 404 });
  }
}
