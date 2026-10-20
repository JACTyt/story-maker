import { db } from "./client";
import {
  stories,
  chapters,
  chatMessages,
  characters,
  places,
  themes,
  timelineEvents,
  proseVersions,
  images,
  characterRelationships,
  timelineEventChapters,
  timelineEventCharacters,
} from "./schema";

export function resetTestDb() {
  db.delete(timelineEventChapters).run();
  db.delete(timelineEventCharacters).run();
  db.delete(characterRelationships).run();
  db.delete(images).run();
  db.delete(proseVersions).run();
  db.delete(chatMessages).run();
  db.delete(timelineEvents).run();
  db.delete(places).run();
  db.delete(characters).run();
  db.delete(themes).run();
  db.delete(chapters).run();
  db.delete(stories).run();
}
