import { sqliteTable, text, integer, real, primaryKey, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const stories = sqliteTable("stories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  premise: text("premise").notNull().default(""),
  defaultProvider: text("default_provider", { enum: ["anthropic", "openai", "ollama"] })
    .notNull()
    .default("anthropic"),
  defaultModel: text("default_model").notNull().default(""),
  ollamaHost: text("ollama_host").notNull().default("http://localhost:11434"),
  systemPrompt: text("system_prompt").notNull().default(""),
  temperature: real("temperature").notNull().default(1),
  extendedThinking: integer("extended_thinking", { mode: "boolean" }).notNull().default(false),
  maxTokens: integer("max_tokens").notNull().default(4096),
  compiledProse: text("compiled_prose"),
  compiledAt: integer("compiled_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const chapters = sqliteTable("chapters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  status: text("status", { enum: ["drafting", "generated"] }).notNull().default("drafting"),
  generatedProse: text("generated_prose"),
  currentVersionId: integer("current_version_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const proseVersions = sqliteTable("prose_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chapterId: integer("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  contentHash: text("content_hash").notNull(),
  source: text("source", { enum: ["generated", "edited", "imported", "reverted"] })
    .notNull()
    .default("generated"),
  parentVersionId: integer("parent_version_id"),
  label: text("label"),
  model: text("model"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chapterId: integer("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  incomplete: integer("incomplete", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const characters = sqliteTable("characters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().notNull().default([]),
  role: text("role", { enum: ["protagonist", "antagonist", "supporting", "minor", ""] }).notNull().default(""),
  summary: text("summary").notNull().default(""),
  appearance: text("appearance").notNull().default(""),
  personality: text("personality").notNull().default(""),
  backstory: text("backstory").notNull().default(""),
  goals: text("goals").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const places = sqliteTable("places", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").references(() => chapters.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().notNull().default([]),
  kind: text("kind").notNull().default(""),
  parentPlaceId: integer("parent_place_id").references((): AnySQLiteColumn => places.id, { onDelete: "set null" }),
  summary: text("summary").notNull().default(""),
  description: text("description").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const themes = sqliteTable("themes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const timelineEvents = sqliteTable("timeline_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().notNull().default([]),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  inStoryDateLabel: text("in_story_date_label").notNull().default(""),
  placeId: integer("place_id").references(() => places.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const images = sqliteTable("images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  // Polymorphic on purpose: one table serves characters, places, chapters and
  // the story cover, where per-entity columns would not.
  entityType: text("entity_type", { enum: ["character", "place", "chapter", "story"] }).notNull(),
  entityId: integer("entity_id").notNull(),
  storedName: text("stored_name").notNull(),
  contentHash: text("content_hash").notNull(),
  mimeType: text("mime_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  caption: text("caption").notNull().default(""),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const characterRelationships = sqliteTable("character_relationships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  storyId: integer("story_id")
    .notNull()
    .references(() => stories.id, { onDelete: "cascade" }),
  fromCharacterId: integer("from_character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  toCharacterId: integer("to_character_id")
    .notNull()
    .references(() => characters.id, { onDelete: "cascade" }),
  label: text("label").notNull().default(""),
});

export const timelineEventChapters = sqliteTable(
  "timeline_event_chapters",
  {
    eventId: integer("event_id")
      .notNull()
      .references(() => timelineEvents.id, { onDelete: "cascade" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.chapterId] })]
);

export const timelineEventCharacters = sqliteTable(
  "timeline_event_characters",
  {
    eventId: integer("event_id")
      .notNull()
      .references(() => timelineEvents.id, { onDelete: "cascade" }),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.characterId] })]
);
