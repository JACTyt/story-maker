import { redirect } from "next/navigation";

/** The separate list pages became tabs of the story bible. */
export default async function Page({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  redirect(`/stories/${storyId}/bible?tab=timeline`);
}
