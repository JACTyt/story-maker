import { db } from "./client";
import { stories, chapters, chatMessages, characters, scenes, themes, timelineEvents } from "./schema";

export function resetTestDb() {
  db.delete(chatMessages).run();
  db.delete(scenes).run();
  db.delete(characters).run();
  db.delete(themes).run();
  db.delete(timelineEvents).run();
  db.delete(chapters).run();
  db.delete(stories).run();
}
