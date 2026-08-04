"use client";

import { use } from "react";
import { EntityListPage } from "@/components/EntityListPage";

export default function CharactersPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = use(params);
  return (
    <EntityListPage
      storyId={storyId}
      resourcePath="characters"
      title="Characters"
      fields={[
        { key: "name", label: "Name" },
        { key: "appearance", label: "Appearance", multiline: true },
        { key: "personality", label: "Personality", multiline: true },
      ]}
    />
  );
}
