"use client";

import { use } from "react";
import { EntityListPage } from "@/components/EntityListPage";

export default function TimelinePage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = use(params);
  return (
    <EntityListPage
      storyId={storyId}
      resourcePath="timeline"
      title="Timeline"
      fields={[
        { key: "inStoryDateLabel", label: "When" },
        { key: "title", label: "Event" },
        { key: "description", label: "Description", multiline: true },
      ]}
    />
  );
}
