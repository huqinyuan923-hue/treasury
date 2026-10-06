import { index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const links = pgTable(
  "links",
  {
    id: serial("id").primaryKey(),
    url: text("url").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    tags: text("tags").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("links_created_at_idx").on(t.createdAt)]
);

export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
