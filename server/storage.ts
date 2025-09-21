import {
  users,
  categories,
  goals,
  userGoals,
  achievements,
  friendships,
  activityFeed,
  sharedAchievements,
  type User,
  type UpsertUser,
  type Category,
  type Goal,
  type UserGoal,
  type Achievement,
  type Friendship,
  type ActivityFeed,
  type SharedAchievement,
  type InsertCategory,
  type InsertGoal,
  type InsertUserGoal,
  type InsertAchievement,
  type InsertFriendship,
  type InsertActivityFeed,
  type InsertSharedAchievement,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, gte, lte, desc, asc, sql, count } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  // Custom authentication operations
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  
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
  
  // Analytics operations
  getWeeklyCompletionStats(userId: string, startDate: Date, endDate: Date): Promise<{
    week: string;
    totalGoals: number;
    completedGoals: number;
    completionRate: number;
    categoriesCompleted: number;
  }[]>;
  getCategoryPerformance(userId: string, startDate: Date, endDate: Date): Promise<{
    categoryId: string;
    categoryName: string;
    totalGoals: number;
    completedGoals: number;
    completionRate: number;
  }[]>;
  getGoalCompletionTrends(userId: string, startDate: Date, endDate: Date): Promise<{
    date: string;
    completedCount: number;
  }[]>;
  getAchievementProgression(userId: string): Promise<{
    week: string;
    level: string;
    categoriesCompleted: number;
  }[]>;
  
  // Social operations
  sendFriendRequest(requesterId: string, addresseeEmail: string): Promise<Friendship>;
  getFriendRequests(userId: string): Promise<(Friendship & { requester: User; addressee: User })[]>;
  respondToFriendRequest(friendshipId: string, status: "accepted" | "declined"): Promise<Friendship>;
  getFriends(userId: string): Promise<User[]>;
  removeFriend(userId: string, friendId: string): Promise<void>;
  createActivity(activity: InsertActivityFeed): Promise<ActivityFeed>;
  getActivityFeed(userId: string): Promise<(ActivityFeed & { user: User })[]>;
  shareAchievement(share: InsertSharedAchievement): Promise<SharedAchievement>;
  getSharedAchievements(userId: string): Promise<(SharedAchievement & { user: User; achievement: Achievement })[]>;
  
  // Recommendation operations
  getGoalRecommendations(userId: string, categoryId?: string): Promise<{
    goalId: string;
    goal: Goal & { category: Category };
    score: number;
    reason: string;
  }[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations

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

  // Custom authentication operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        id: undefined, // Let the database generate the ID
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

  // Analytics operations
  async getWeeklyCompletionStats(userId: string, startDate: Date, endDate: Date): Promise<{
    week: string;
    totalGoals: number;
    completedGoals: number;
    completionRate: number;
    categoriesCompleted: number;
  }[]> {
    const result = await db
      .select({
        weekStart: userGoals.weekStart,
        goalId: userGoals.goalId,
        completed: userGoals.completed,
        categoryId: goals.categoryId,
      })
      .from(userGoals)
      .innerJoin(goals, eq(userGoals.goalId, goals.id))
      .where(
        and(
          eq(userGoals.userId, userId),
          gte(userGoals.weekStart, startDate),
          lte(userGoals.weekStart, endDate)
        )
      );

    // Process the results to calculate weekly stats
    const weeklyStats = new Map<string, {
      totalGoals: number;
      completedGoals: number;
      categoriesWithCompletedGoals: Set<string>;
    }>();

    result.forEach(row => {
      const weekKey = row.weekStart.toISOString().split('T')[0];
      if (!weeklyStats.has(weekKey)) {
        weeklyStats.set(weekKey, {
          totalGoals: 0,
          completedGoals: 0,
          categoriesWithCompletedGoals: new Set(),
        });
      }
      const stats = weeklyStats.get(weekKey)!;
      stats.totalGoals += 1;
      if (row.completed) {
        stats.completedGoals += 1;
        stats.categoriesWithCompletedGoals.add(row.categoryId);
      }
    });

    return Array.from(weeklyStats.entries()).map(([week, stats]) => ({
      week,
      totalGoals: stats.totalGoals,
      completedGoals: stats.completedGoals,
      completionRate: stats.totalGoals > 0 ? (stats.completedGoals / stats.totalGoals) * 100 : 0,
      categoriesCompleted: stats.categoriesWithCompletedGoals.size,
    })).sort((a, b) => a.week.localeCompare(b.week));
  }

  async getCategoryPerformance(userId: string, startDate: Date, endDate: Date): Promise<{
    categoryId: string;
    categoryName: string;
    totalGoals: number;
    completedGoals: number;
    completionRate: number;
  }[]> {
    const result = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        goalId: userGoals.goalId,
        completed: userGoals.completed,
      })
      .from(userGoals)
      .innerJoin(goals, eq(userGoals.goalId, goals.id))
      .innerJoin(categories, eq(goals.categoryId, categories.id))
      .where(
        and(
          eq(userGoals.userId, userId),
          gte(userGoals.weekStart, startDate),
          lte(userGoals.weekStart, endDate)
        )
      );

    // Process results to calculate category performance
    const categoryStats = new Map<string, {
      categoryId: string;
      categoryName: string;
      totalGoals: number;
      completedGoals: number;
    }>();

    result.forEach(row => {
      const key = row.categoryId;
      if (!categoryStats.has(key)) {
        categoryStats.set(key, {
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          totalGoals: 0,
          completedGoals: 0,
        });
      }
      const stats = categoryStats.get(key)!;
      stats.totalGoals += 1;
      if (row.completed) {
        stats.completedGoals += 1;
      }
    });

    return Array.from(categoryStats.values()).map(stats => ({
      categoryId: stats.categoryId,
      categoryName: stats.categoryName,
      totalGoals: stats.totalGoals,
      completedGoals: stats.completedGoals,
      completionRate: stats.totalGoals > 0 ? (stats.completedGoals / stats.totalGoals) * 100 : 0,
    }));
  }

  async getGoalCompletionTrends(userId: string, startDate: Date, endDate: Date): Promise<{
    date: string;
    completedCount: number;
  }[]> {
    const result = await db
      .select({
        completedAt: userGoals.completedAt,
      })
      .from(userGoals)
      .where(
        and(
          eq(userGoals.userId, userId),
          eq(userGoals.completed, true),
          gte(userGoals.completedAt, startDate),
          lte(userGoals.completedAt, endDate)
        )
      );

    // Group by date
    const dailyCounts = new Map<string, number>();
    result.forEach(row => {
      if (row.completedAt) {
        const dateKey = row.completedAt.toISOString().split('T')[0];
        dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
      }
    });

    return Array.from(dailyCounts.entries()).map(([date, completedCount]) => ({
      date,
      completedCount,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getAchievementProgression(userId: string): Promise<{
    week: string;
    level: string;
    categoriesCompleted: number;
  }[]> {
    const result = await db
      .select({
        weekStart: achievements.weekStart,
        level: achievements.level,
        categoriesCompleted: achievements.categoriesCompleted,
      })
      .from(achievements)
      .where(eq(achievements.userId, userId))
      .orderBy(asc(achievements.weekStart));

    return result.map(row => ({
      week: row.weekStart.toISOString().split('T')[0],
      level: row.level,
      categoriesCompleted: row.categoriesCompleted,
    }));
  }

  // Social operations
  async sendFriendRequest(requesterId: string, addresseeEmail: string): Promise<Friendship> {
    // First find the addressee by email
    const [addressee] = await db
      .select()
      .from(users)
      .where(eq(users.email, addresseeEmail));

    if (!addressee) {
      throw new Error("User not found with that email address");
    }

    if (addressee.id === requesterId) {
      throw new Error("Cannot send friend request to yourself");
    }

    // Check if friendship already exists
    const [existing] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, requesterId), eq(friendships.addresseeId, addressee.id)),
          and(eq(friendships.requesterId, addressee.id), eq(friendships.addresseeId, requesterId))
        )
      );

    if (existing) {
      throw new Error("Friend request already exists or you are already friends");
    }

    const [friendship] = await db
      .insert(friendships)
      .values({
        requesterId,
        addresseeId: addressee.id,
        status: "pending",
      })
      .returning();

    return friendship;
  }

  async getFriendRequests(userId: string): Promise<(Friendship & { requester: User; addressee: User })[]> {
    const result = await db
      .select({
        id: friendships.id,
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
        status: friendships.status,
        createdAt: friendships.createdAt,
        updatedAt: friendships.updatedAt,
        requester: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        addressee: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.requesterId, users.id))
      .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, "pending")));

    return result as (Friendship & { requester: User; addressee: User })[];
  }

  async respondToFriendRequest(friendshipId: string, status: "accepted" | "declined"): Promise<Friendship> {
    const [friendship] = await db
      .update(friendships)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(friendships.id, friendshipId))
      .returning();

    if (!friendship) {
      throw new Error("Friend request not found");
    }

    return friendship;
  }

  async getFriends(userId: string): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(friendships)
      .innerJoin(users, 
        or(
          and(eq(friendships.requesterId, userId), eq(users.id, friendships.addresseeId)),
          and(eq(friendships.addresseeId, userId), eq(users.id, friendships.requesterId))
        )
      )
      .where(eq(friendships.status, "accepted"));

    return result;
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    await db
      .delete(friendships)
      .where(
        and(
          eq(friendships.status, "accepted"),
          or(
            and(eq(friendships.requesterId, userId), eq(friendships.addresseeId, friendId)),
            and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, userId))
          )
        )
      );
  }

  async createActivity(activity: InsertActivityFeed): Promise<ActivityFeed> {
    const [newActivity] = await db
      .insert(activityFeed)
      .values(activity)
      .returning();

    return newActivity;
  }

  async getActivityFeed(userId: string): Promise<(ActivityFeed & { user: User })[]> {
    // Get user's friends first
    const friendIds = await this.getFriends(userId);
    const allUserIds = [userId, ...friendIds.map(friend => friend.id)];

    const result = await db
      .select({
        id: activityFeed.id,
        userId: activityFeed.userId,
        activityType: activityFeed.activityType,
        data: activityFeed.data,
        message: activityFeed.message,
        isPublic: activityFeed.isPublic,
        createdAt: activityFeed.createdAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(activityFeed)
      .innerJoin(users, eq(activityFeed.userId, users.id))
      .where(
        and(
          or(...allUserIds.map(id => eq(activityFeed.userId, id))),
          eq(activityFeed.isPublic, true)
        )
      )
      .orderBy(desc(activityFeed.createdAt))
      .limit(50);

    return result as (ActivityFeed & { user: User })[];
  }

  async shareAchievement(share: InsertSharedAchievement): Promise<SharedAchievement> {
    const [sharedAchievement] = await db
      .insert(sharedAchievements)
      .values(share)
      .returning();

    return sharedAchievement;
  }

  async getSharedAchievements(userId: string): Promise<(SharedAchievement & { user: User; achievement: Achievement })[]> {
    // Get user's friends first
    const friendIds = await this.getFriends(userId);
    const allUserIds = [userId, ...friendIds.map(friend => friend.id)];

    const result = await db
      .select({
        id: sharedAchievements.id,
        userId: sharedAchievements.userId,
        achievementId: sharedAchievements.achievementId,
        sharedWith: sharedAchievements.sharedWith,
        message: sharedAchievements.message,
        createdAt: sharedAchievements.createdAt,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        achievement: {
          id: achievements.id,
          userId: achievements.userId,
          weekStart: achievements.weekStart,
          categoriesCompleted: achievements.categoriesCompleted,
          level: achievements.level,
          createdAt: achievements.createdAt,
        },
      })
      .from(sharedAchievements)
      .innerJoin(users, eq(sharedAchievements.userId, users.id))
      .innerJoin(achievements, eq(sharedAchievements.achievementId, achievements.id))
      .where(
        or(
          eq(sharedAchievements.sharedWith, "public"),
          eq(sharedAchievements.sharedWith, "friends"),
          ...allUserIds.map(id => eq(sharedAchievements.userId, id))
        )
      )
      .orderBy(desc(sharedAchievements.createdAt));

    return result as (SharedAchievement & { user: User; achievement: Achievement })[];
  }

  async getGoalRecommendations(userId: string, categoryId?: string): Promise<{
    goalId: string;
    goal: Goal & { category: Category };
    score: number;
    reason: string;
  }[]> {
    // Build where conditions safely
    const whereConditions = [
      or(
        eq(goals.isCustom, false), // System goals
        eq(goals.createdBy, userId) // User's custom goals
      )
    ];
    
    if (categoryId) {
      whereConditions.push(eq(goals.categoryId, categoryId));
    }

    // Get all available goals with categories
    const allGoalsQuery = db
      .select({
        goal: goals,
        category: categories,
      })
      .from(goals)
      .innerJoin(categories, eq(goals.categoryId, categories.id))
      .where(and(...whereConditions));

    const allGoals = await allGoalsQuery;

    // Get user's goal completion history
    const userHistory = await db
      .select({
        goalId: userGoals.goalId,
        categoryId: goals.categoryId,
        completed: userGoals.completed,
        weekStart: userGoals.weekStart,
      })
      .from(userGoals)
      .innerJoin(goals, eq(userGoals.goalId, goals.id))
      .where(eq(userGoals.userId, userId))
      .orderBy(desc(userGoals.weekStart));

    // Get global goal popularity (completion rates)
    const goalPopularity = await db
      .select({
        goalId: userGoals.goalId,
        totalAttempts: sql<number>`count(*)`.as('totalAttempts'),
        completions: sql<number>`sum(case when ${userGoals.completed} = true then 1 else 0 end)`.as('completions'),
      })
      .from(userGoals)
      .groupBy(userGoals.goalId);

    // Calculate recommendations with scoring
    const recommendations = allGoals.map(({ goal, category }) => {
      let score = 0;
      let reasons: string[] = [];

      // Factor 1: User's completion history for this specific goal
      const userGoalHistory = userHistory.filter(h => h.goalId === goal.id);
      const userCompletions = userGoalHistory.filter(h => h.completed).length;
      const userAttempts = userGoalHistory.length;

      if (userAttempts === 0) {
        // New goal - boost score for exploration
        score += 20;
        reasons.push("New goal to explore");
      } else if (userCompletions > 0) {
        // User has completed this goal before - moderate boost
        const successRate = userCompletions / userAttempts;
        score += successRate * 15;
        if (successRate >= 0.8) {
          reasons.push("You've had great success with this goal");
        } else if (successRate >= 0.5) {
          reasons.push("You've completed this goal before");
        }
      } else {
        // User has tried but never completed - slight penalty
        score -= 5;
        reasons.push("Consider trying again with a fresh approach");
      }

      // Factor 2: User's category performance
      const categoryHistory = userHistory.filter(h => h.categoryId === goal.categoryId);
      const categoryCompletions = categoryHistory.filter(h => h.completed).length;
      const categoryAttempts = categoryHistory.length;

      if (categoryAttempts > 0) {
        const categorySuccessRate = categoryCompletions / categoryAttempts;
        score += categorySuccessRate * 10;
        if (categorySuccessRate >= 0.7) {
          reasons.push(`Strong performance in ${category.name} category`);
        } else if (categorySuccessRate >= 0.4) {
          reasons.push(`Good track record in ${category.name}`);
        }
      }

      // Factor 3: Recent category activity
      const recentCategoryActivity = categoryHistory.filter(h => {
        const weeksDiff = (new Date().getTime() - new Date(h.weekStart).getTime()) / (1000 * 60 * 60 * 24 * 7);
        return weeksDiff <= 4; // Last 4 weeks
      });
      
      if (recentCategoryActivity.length > 0) {
        score += 5;
        reasons.push(`Recent activity in ${category.name}`);
      }

      // Factor 4: Global popularity
      const popularity = goalPopularity.find(p => p.goalId === goal.id);
      if (popularity && popularity.totalAttempts > 0) {
        const globalSuccessRate = popularity.completions / popularity.totalAttempts;
        score += globalSuccessRate * 8;
        if (globalSuccessRate >= 0.6) {
          reasons.push("Popular goal with high success rate");
        }
      }

      // Factor 5: Custom goal bonus
      if (goal.isCustom && goal.createdBy === userId) {
        score += 5;
        reasons.push("Your personal custom goal");
      }

      // Factor 6: Diversity bonus - encourage trying different categories
      const userCategoryDistribution = Array.from(
        new Set(userHistory.map(h => h.categoryId))
      );
      if (userCategoryDistribution.length > 0) {
        const categoryFrequency = userHistory.filter(h => h.categoryId === goal.categoryId).length;
        const averageFrequency = userHistory.length / userCategoryDistribution.length;
        if (categoryFrequency < averageFrequency) {
          score += 3;
          reasons.push("Explore different areas of growth");
        }
      }

      return {
        goalId: goal.id,
        goal: { ...goal, category } as Goal & { category: Category },
        score: Math.max(0, score), // Ensure non-negative score
        reason: reasons.length > 0 ? reasons.join(" • ") : "Recommended for you", // Join multiple reasons
      };
    });

    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, categoryId ? 6 : 12); // Return 6 per category or 12 total
  }
}

export const storage = new DatabaseStorage();
