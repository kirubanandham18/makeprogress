import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertUserGoalSchema, selectGoalSchema } from "@shared/schema";
import { z } from "zod";

function getWeekStart(date: Date = new Date()): Date {
  const weekStart = new Date(date);
  const dayOfWeek = weekStart.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function calculateAchievementLevel(categoriesCompleted: number): string {
  if (categoriesCompleted >= 6) return "slayed";
  if (categoriesCompleted >= 4) return "rock";
  if (categoriesCompleted >= 2) return "track";
  return "none";
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize default categories and goals
  const initializeDefaultData = async () => {
    try {
      const existingCategories = await storage.getCategories();
      if (existingCategories.length === 0) {
        // Create categories
        const categoriesData = [
          { name: "Personal", description: "Personal development goals", icon: "fas fa-user", color: "personal" },
          { name: "Inner Peace", description: "Mindfulness and spiritual goals", icon: "fas fa-leaf", color: "peace" },
          { name: "Health", description: "Physical and mental health goals", icon: "fas fa-heart", color: "health" },
          { name: "Family", description: "Family and relationships goals", icon: "fas fa-home", color: "family" },
          { name: "Career", description: "Professional development goals", icon: "fas fa-briefcase", color: "career" },
          { name: "Fun", description: "Recreation and hobby goals", icon: "fas fa-gamepad", color: "fun" },
        ];

        const createdCategories = await Promise.all(
          categoriesData.map(category => storage.createCategory(category))
        );

        // Create goals for each category
        const goalsData = [
          // Personal goals
          { categoryId: createdCategories[0].id, description: "Read for 30 minutes daily" },
          { categoryId: createdCategories[0].id, description: "Practice a new skill for 20 minutes" },
          { categoryId: createdCategories[0].id, description: "Write in a personal journal" },
          { categoryId: createdCategories[0].id, description: "Learn 5 new words in a foreign language" },
          
          // Inner Peace goals
          { categoryId: createdCategories[1].id, description: "Meditate for 10 minutes" },
          { categoryId: createdCategories[1].id, description: "Practice gratitude journaling" },
          { categoryId: createdCategories[1].id, description: "Spend 15 minutes in nature" },
          { categoryId: createdCategories[1].id, description: "Practice deep breathing exercises" },
          
          // Health goals
          { categoryId: createdCategories[2].id, description: "Exercise for 30 minutes" },
          { categoryId: createdCategories[2].id, description: "Drink 8 glasses of water daily" },
          { categoryId: createdCategories[2].id, description: "Get 8 hours of sleep" },
          { categoryId: createdCategories[2].id, description: "Eat 5 servings of fruits/vegetables" },
          
          // Family goals
          { categoryId: createdCategories[3].id, description: "Call a family member" },
          { categoryId: createdCategories[3].id, description: "Plan a family activity" },
          { categoryId: createdCategories[3].id, description: "Have dinner together without devices" },
          { categoryId: createdCategories[3].id, description: "Write a letter or message to someone you care about" },
          
          // Career goals
          { categoryId: createdCategories[4].id, description: "Update LinkedIn profile" },
          { categoryId: createdCategories[4].id, description: "Learn a new professional skill" },
          { categoryId: createdCategories[4].id, description: "Network with a colleague or industry peer" },
          { categoryId: createdCategories[4].id, description: "Organize and plan upcoming work tasks" },
          
          // Fun goals
          { categoryId: createdCategories[5].id, description: "Try a new hobby" },
          { categoryId: createdCategories[5].id, description: "Watch a documentary" },
          { categoryId: createdCategories[5].id, description: "Play a game or do a puzzle" },
          { categoryId: createdCategories[5].id, description: "Listen to music or a podcast" },
        ];

        await Promise.all(
          goalsData.map(goal => storage.createGoal(goal))
        );
      }
    } catch (error) {
      console.error("Error initializing default data:", error);
    }
  };

  await initializeDefaultData();

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Category routes
  app.get('/api/categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get('/api/categories/:id/goals', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const goals = await storage.getGoalsByCategory(id);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  // User goal routes
  app.get('/api/user/goals/week', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const weekStart = getWeekStart();
      const userGoals = await storage.getUserGoalsForWeek(userId, weekStart);
      res.json(userGoals);
    } catch (error) {
      console.error("Error fetching user goals:", error);
      res.status(500).json({ message: "Failed to fetch user goals" });
    }
  });

  app.post('/api/user/select-goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { goalIds } = req.body;
      
      if (!Array.isArray(goalIds) || goalIds.length !== 12) {
        return res.status(400).json({ message: "Must select exactly 12 goals (2 per category)" });
      }

      const weekStart = getWeekStart();
      const userGoals = await storage.selectUserGoals(userId, goalIds, weekStart);
      res.json(userGoals);
    } catch (error) {
      console.error("Error selecting goals:", error);
      res.status(500).json({ message: "Failed to select goals" });
    }
  });

  app.patch('/api/user-goals/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const updatedGoal = await storage.toggleGoalCompletion(id);
      
      // Check for achievements
      const weekStart = getWeekStart();
      const allUserGoals = await storage.getUserGoalsForWeek(userId, weekStart);
      
      // Count completed categories
      const categoryCompletions = new Map<string, { completed: number; total: number }>();
      
      allUserGoals.forEach(userGoal => {
        const categoryName = userGoal.goal.category.name;
        if (!categoryCompletions.has(categoryName)) {
          categoryCompletions.set(categoryName, { completed: 0, total: 0 });
        }
        const stats = categoryCompletions.get(categoryName)!;
        stats.total++;
        if (userGoal.completed) {
          stats.completed++;
        }
      });

      // Count categories with 2 completed goals
      const categoriesCompleted = Array.from(categoryCompletions.values())
        .filter(stats => stats.completed >= 2).length;

      // Create or update achievement
      const existingAchievement = await storage.getWeeklyAchievement(userId, weekStart);
      const level = calculateAchievementLevel(categoriesCompleted);
      
      if (!existingAchievement && level !== "none") {
        await storage.createAchievement({
          userId,
          weekStart,
          categoriesCompleted,
          level,
        });
      }

      res.json(updatedGoal);
    } catch (error) {
      console.error("Error toggling goal completion:", error);
      res.status(500).json({ message: "Failed to toggle goal completion" });
    }
  });

  // Progress and achievement routes
  app.get('/api/user/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const weekStart = getWeekStart();
      
      const [userGoals, achievement] = await Promise.all([
        storage.getUserGoalsForWeek(userId, weekStart),
        storage.getWeeklyAchievement(userId, weekStart),
      ]);

      const totalGoals = userGoals.length;
      const completedGoals = userGoals.filter(goal => goal.completed).length;
      
      // Group by category and count completions
      const categoryStats = new Map<string, { completed: number; total: number; name: string; color: string }>();
      
      userGoals.forEach(userGoal => {
        const categoryName = userGoal.goal.category.name;
        const categoryColor = userGoal.goal.category.color || '';
        
        if (!categoryStats.has(categoryName)) {
          categoryStats.set(categoryName, { 
            completed: 0, 
            total: 0, 
            name: categoryName,
            color: categoryColor 
          });
        }
        const stats = categoryStats.get(categoryName)!;
        stats.total++;
        if (userGoal.completed) {
          stats.completed++;
        }
      });

      const categories = Array.from(categoryStats.values());
      const categoriesCompleted = categories.filter(cat => cat.completed >= 2).length;

      res.json({
        weekStart: weekStart.toISOString(),
        totalGoals,
        completedGoals,
        categories,
        categoriesCompleted,
        achievement,
        progressPercentage: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
      });
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.get('/api/user/achievements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const achievements = await storage.getUserAchievements(userId);
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
