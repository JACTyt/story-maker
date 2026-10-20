import { z } from "zod";

/** Trimmed, de-duplicated (case-insensitively), empties dropped — aliases feed the mention matcher. */
export const aliasesField = z
  .array(z.string())
  .transform((list) => {
    const seen = new Set<string>();
    return list
      .map((a) => a.trim())
      .filter((a) => a && !seen.has(a.toLowerCase()) && (seen.add(a.toLowerCase()), true));
  });

export const CHARACTER_ROLES = ["protagonist", "antagonist", "supporting", "minor", ""] as const;

export const characterFields = {
  name: z.string().min(1, "Name is required"),
  aliases: aliasesField,
  role: z.enum(CHARACTER_ROLES),
  summary: z.string(),
  appearance: z.string(),
  personality: z.string(),
  backstory: z.string(),
  goals: z.string(),
  notes: z.string(),
};

export const placeFields = {
  name: z.string().min(1, "Name is required"),
  aliases: aliasesField,
  kind: z.string(),
  parentPlaceId: z.number().int().nullable(),
  summary: z.string(),
  description: z.string(),
  chapterId: z.number().int().nullable(),
};

export const timelineFields = {
  title: z.string().min(1, "Title is required"),
  aliases: aliasesField,
  description: z.string(),
  sortOrder: z.number().int(),
  inStoryDateLabel: z.string(),
  placeId: z.number().int().nullable(),
  chapterIds: z.array(z.number().int()),
  characterIds: z.array(z.number().int()),
};

export const themeFields = {
  name: z.string().min(1, "Name is required"),
  description: z.string(),
};

/** Create: only the name is required; everything else defaults in the database. */
export function createSchema<T extends z.ZodRawShape>(fields: T, required: keyof T) {
  const shape = Object.fromEntries(
    Object.entries(fields).map(([key, schema]) => [key, key === required ? schema : (schema as z.ZodType).optional()])
  );
  return z.object(shape as T);
}

export const characterCreate = createSchema(characterFields, "name");
export const characterUpdate = z.object(characterFields).partial();
export const placeCreate = createSchema(placeFields, "name");
export const placeUpdate = z.object(placeFields).partial();
export const timelineCreate = createSchema(timelineFields, "title");
export const timelineUpdate = z.object(timelineFields).partial();
export const themeCreate = createSchema(themeFields, "name");
export const themeUpdate = z.object(themeFields).partial();

export const relationshipCreate = z.object({
  fromCharacterId: z.number().int(),
  toCharacterId: z.number().int(),
  label: z.string().default(""),
});
