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
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"), // For custom authentication
  emailVerified: boolean("email_verified").default(false),
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
  createdBy: varchar("created_by").references(() => users.id), // null for system goals, user ID for custom goals
  isCustom: boolean("is_custom").default(false),
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

export const friendships = pgTable("friendships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  addresseeId: varchar("addressee_id").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending", "accepted", "declined", "blocked"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const activityFeed = pgTable("activity_feed", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  activityType: varchar("activity_type", { length: 50 }).notNull(), // "achievement_earned", "goal_completed", "week_completed", "custom_goal_created"
  data: jsonb("data"), // JSON object with activity-specific data
  message: text("message"), // Human-readable activity message
  isPublic: boolean("is_public").default(true), // Whether friends can see this activity
  createdAt: timestamp("created_at").defaultNow(),
});

export const sharedAchievements = pgTable("shared_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementId: varchar("achievement_id").notNull().references(() => achievements.id),
  sharedWith: varchar("shared_with"), // "friends", "public", or specific user ID
  message: text("message"), // Optional message when sharing
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
  creator: one(users, {
    fields: [goals.createdBy],
    references: [users.id],
  }),
  userGoals: many(userGoals),
}));

export const usersRelations = relations(users, ({ many }) => ({
  userGoals: many(userGoals),
  achievements: many(achievements),
  customGoals: many(goals),
  requestedFriendships: many(friendships, { relationName: "requester" }),
  receivedFriendships: many(friendships, { relationName: "addressee" }),
  activities: many(activityFeed),
  sharedAchievements: many(sharedAchievements),
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

export const achievementsRelations = relations(achievements, ({ one, many }) => ({
  user: one(users, {
    fields: [achievements.userId],
    references: [users.id],
  }),
  sharedAchievements: many(sharedAchievements),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(users, {
    fields: [friendships.requesterId],
    references: [users.id],
    relationName: "requester",
  }),
  addressee: one(users, {
    fields: [friendships.addresseeId], 
    references: [users.id],
    relationName: "addressee",
  }),
}));

export const activityFeedRelations = relations(activityFeed, ({ one }) => ({
  user: one(users, {
    fields: [activityFeed.userId],
    references: [users.id],
  }),
}));

export const sharedAchievementsRelations = relations(sharedAchievements, ({ one }) => ({
  user: one(users, {
    fields: [sharedAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [sharedAchievements.achievementId],
    references: [achievements.id],
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

export const insertFriendshipSchema = createInsertSchema(friendships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityFeedSchema = createInsertSchema(activityFeed).omit({
  id: true,
  createdAt: true,
});

export const insertSharedAchievementSchema = createInsertSchema(sharedAchievements).omit({
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
export type Friendship = typeof friendships.$inferSelect;
export type ActivityFeed = typeof activityFeed.$inferSelect;
export type SharedAchievement = typeof sharedAchievements.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type InsertUserGoal = z.infer<typeof insertUserGoalSchema>;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type InsertActivityFeed = z.infer<typeof insertActivityFeedSchema>;
export type InsertSharedAchievement = z.infer<typeof insertSharedAchievementSchema>;
export type SelectGoal = z.infer<typeof selectGoalSchema>;

// Authentication schemas
export const registerSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
