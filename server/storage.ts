import {
  users,
  categories,
  goals,
  userGoals,
  achievements,
  type User,
  type UpsertUser,
  type Category,
  type Goal,
  type UserGoal,
  type Achievement,
  type InsertCategory,
  type InsertGoal,
  type InsertUserGoal,
  type InsertAchievement,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, gte, lte, desc, asc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Goal operations
  getGoalsByCategory(categoryId: string): Promise<Goal[]>;
  getGoalsByCategoryAndUser(categoryId: string, userId: string): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  createCustomGoal(goal: InsertGoal, userId: string): Promise<Goal>;
  
  // User goal operations
  getUserGoalsForWeek(userId: string, weekStart: Date): Promise<(UserGoal & { goal: Goal & { category: Category } })[]>;
  selectUserGoals(userId: string, goalIds: string[], weekStart: Date): Promise<UserGoal[]>;
  toggleGoalCompletion(userGoalId: string): Promise<UserGoal>;
  
  // Achievement operations
  getWeeklyAchievement(userId: string, weekStart: Date): Promise<Achievement | undefined>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  getUserAchievements(userId: string): Promise<Achievement[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.name));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  // Goal operations
  async getGoalsByCategory(categoryId: string): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(and(eq(goals.categoryId, categoryId), eq(goals.isCustom, false)))
      .orderBy(asc(goals.description));
  }

  async getGoalsByCategoryAndUser(categoryId: string, userId: string): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(
        and(
          eq(goals.categoryId, categoryId),
          or(
            eq(goals.isCustom, false), // System goals
            eq(goals.createdBy, userId) // User's custom goals
          )
        )
      )
      .orderBy(asc(goals.isCustom), asc(goals.description)); // System goals first, then custom
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [newGoal] = await db
      .insert(goals)
      .values(goal)
      .returning();
    return newGoal;
  }

  async createCustomGoal(goal: InsertGoal, userId: string): Promise<Goal> {
    const customGoal = {
      ...goal,
      createdBy: userId,
      isCustom: true,
    };
    const [newGoal] = await db
      .insert(goals)
      .values(customGoal)
      .returning();
    return newGoal;
  }

  // User goal operations
  async getUserGoalsForWeek(userId: string, weekStart: Date): Promise<(UserGoal & { goal: Goal & { category: Category } })[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const result = await db
      .select({
        id: userGoals.id,
        userId: userGoals.userId,
        goalId: userGoals.goalId,
        weekStart: userGoals.weekStart,
        completed: userGoals.completed,
        completedAt: userGoals.completedAt,
        createdAt: userGoals.createdAt,
        goal: {
          id: goals.id,
          categoryId: goals.categoryId,
          description: goals.description,
          createdAt: goals.createdAt,
          category: {
            id: categories.id,
            name: categories.name,
            description: categories.description,
            icon: categories.icon,
            color: categories.color,
            createdAt: categories.createdAt,
          },
        },
      })
      .from(userGoals)
      .innerJoin(goals, eq(userGoals.goalId, goals.id))
      .innerJoin(categories, eq(goals.categoryId, categories.id))
      .where(
        and(
          eq(userGoals.userId, userId),
          gte(userGoals.weekStart, weekStart),
          lte(userGoals.weekStart, weekEnd)
        )
      )
      .orderBy(asc(categories.name), asc(goals.description));
      
    return result as (UserGoal & { goal: Goal & { category: Category } })[];
  }

  async selectUserGoals(userId: string, goalIds: string[], weekStart: Date): Promise<UserGoal[]> {
    // First, delete existing goals for this week
    await db
      .delete(userGoals)
      .where(
        and(
          eq(userGoals.userId, userId),
          eq(userGoals.weekStart, weekStart)
        )
      );

    // Then insert new goals
    const userGoalData = goalIds.map(goalId => ({
      userId,
      goalId,
      weekStart,
      completed: false,
    }));

    return await db
      .insert(userGoals)
      .values(userGoalData)
      .returning();
  }

  async toggleGoalCompletion(userGoalId: string): Promise<UserGoal> {
    const [existingGoal] = await db
      .select()
      .from(userGoals)
      .where(eq(userGoals.id, userGoalId));

    if (!existingGoal) {
      throw new Error("User goal not found");
    }

    const isCompleting = !existingGoal.completed;
    const [updatedGoal] = await db
      .update(userGoals)
      .set({
        completed: isCompleting,
        completedAt: isCompleting ? new Date() : null,
      })
      .where(eq(userGoals.id, userGoalId))
      .returning();

    return updatedGoal;
  }

  // Achievement operations
  async getWeeklyAchievement(userId: string, weekStart: Date): Promise<Achievement | undefined> {
    const [achievement] = await db
      .select()
      .from(achievements)
      .where(
        and(
          eq(achievements.userId, userId),
          eq(achievements.weekStart, weekStart)
        )
      );
    return achievement;
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const [newAchievement] = await db
      .insert(achievements)
      .values(achievement)
      .returning();
    return newAchievement;
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(desc(achievements.weekStart));
  }
}

export const storage = new DatabaseStorage();
