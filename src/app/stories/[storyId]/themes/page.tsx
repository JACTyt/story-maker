"use client";

import { use } from "react";
import { EntityListPage } from "@/components/EntityListPage";

export default function ThemesPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = use(params);
  return (
    <EntityListPage
      storyId={storyId}
      resourcePath="themes"
      title="Themes"
      fields={[
        { key: "name", label: "Name" },
        { key: "description", label: "Description", multiline: true },
      ]}
    />
  );
}
