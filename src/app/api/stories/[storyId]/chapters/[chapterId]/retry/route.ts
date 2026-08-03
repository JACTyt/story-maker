import { NextRequest } from "next/server";
import { streamAssistantReply } from "../messages/route";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ storyId: string; chapterId: string }> }) {
  const { storyId, chapterId } = await ctx.params;
  return streamAssistantReply(Number(storyId), Number(chapterId));
}
