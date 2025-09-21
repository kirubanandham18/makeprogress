import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => categories.id),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userGoals = pgTable("user_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  goalId: varchar("goal_id").notNull().references(() => goals.id),
  weekStart: timestamp("week_start").notNull(), // Monday of the week
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  weekStart: timestamp("week_start").notNull(),
  categoriesCompleted: integer("categories_completed").notNull(),
  level: varchar("level", { length: 50 }).notNull(), // "track", "rock", "slayed"
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  goals: many(goals),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  category: one(categories, {
    fields: [goals.categoryId],
    references: [categories.id],
  }),
  userGoals: many(userGoals),
}));

export const usersRelations = relations(users, ({ many }) => ({
  userGoals: many(userGoals),
  achievements: many(achievements),
}));

export const userGoalsRelations = relations(userGoals, ({ one }) => ({
  user: one(users, {
    fields: [userGoals.userId],
    references: [users.id],
  }),
  goal: one(goals, {
    fields: [userGoals.goalId],
    references: [goals.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, {
    fields: [achievements.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  createdAt: true,
});

export const insertUserGoalSchema = createInsertSchema(userGoals).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
});

export const selectGoalSchema = createInsertSchema(userGoals).pick({
  goalId: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type UserGoal = typeof userGoals.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type InsertUserGoal = z.infer<typeof insertUserGoalSchema>;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type SelectGoal = z.infer<typeof selectGoalSchema>;
