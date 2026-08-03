import { eq } from "drizzle-orm";
import { db } from "./client";

type StoryScopedTable = {
  id: any;
  storyId: any;
};

export function createStoryScopedRepo<T extends StoryScopedTable>(table: T) {
  return {
    get(id: number) {
      return db.select().from(table as any).where(eq(table.id, id)).get();
    },
    list(storyId: number) {
      return db.select().from(table as any).where(eq(table.storyId, storyId)).all();
    },
    create(values: Record<string, unknown>) {
      return db.insert(table as any).values(values).returning().get();
    },
    update(id: number, values: Record<string, unknown>) {
      return db
        .update(table as any)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(table.id, id))
        .returning()
        .get();
    },
    remove(id: number) {
      db.delete(table as any).where(eq(table.id, id)).run();
    },
  };
}
