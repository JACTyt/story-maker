"use client";

import { use } from "react";
import { EntityListPage } from "@/components/EntityListPage";

export default function ScenesPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = use(params);
  return (
    <EntityListPage
      storyId={storyId}
      resourcePath="scenes"
      title="Scenes"
      fields={[
        { key: "title", label: "Title" },
        { key: "description", label: "Description", multiline: true },
      ]}
    />
  );
}
