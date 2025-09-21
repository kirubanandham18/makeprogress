import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerUser, loginUser, blacklistToken } from "./auth";
import { insertUserGoalSchema, selectGoalSchema, registerSchema, loginSchema } from "@shared/schema";
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

  // Auth routes with proper validation and security
  // Registration endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      // Validate input with Zod
      const validatedData = registerSchema.parse(req.body);
      const { email, password, firstName, lastName } = validatedData;
      
      const { user, token } = await registerUser(email, password, firstName, lastName);
      
      res.status(201).json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          emailVerified: user.emailVerified
        }, 
        token 
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Handle Zod validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors.map((e: any) => e.message)
        });
      }
      
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });
  
  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      // Validate input with Zod
      const validatedData = loginSchema.parse(req.body);
      const { email, password } = validatedData;
      
      const { user, token } = await loginUser(email, password);
      
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          emailVerified: user.emailVerified
        }, 
        token 
      });
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Handle Zod validation errors
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors.map((e: any) => e.message)
        });
      }
      
      res.status(401).json({ message: error.message || "Login failed" });
    }
  });
  
  // Get current user endpoint
  app.get('/api/auth/user', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        emailVerified: user.emailVerified
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Logout endpoint with token revocation
  app.post('/api/auth/logout', isAuthenticated, (req, res) => {
    try {
      // Get token from request (set by isAuthenticated middleware)
      const token = (req as any).token;
      
      if (token) {
        // Blacklist the token to prevent reuse
        blacklistToken(token);
      }
      
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
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

  app.get('/api/categories/:id/goals', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const goals = await storage.getGoalsByCategoryAndUser(id, userId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  });

  app.post('/api/categories/:id/goals', isAuthenticated, async (req: any, res) => {
    try {
      const { id: categoryId } = req.params;
      const userId = req.user!.id;
      const { description } = req.body;

      if (!description || description.trim().length === 0) {
        return res.status(400).json({ message: "Goal description is required" });
      }

      if (description.length > 200) {
        return res.status(400).json({ message: "Goal description must be 200 characters or less" });
      }

      const goalData = {
        categoryId,
        description: description.trim(),
      };

      const newGoal = await storage.createCustomGoal(goalData, userId);
      res.status(201).json(newGoal);
    } catch (error) {
      console.error("Error creating custom goal:", error);
      res.status(500).json({ message: "Failed to create custom goal" });
    }
  });

  // Goal recommendations endpoint
  app.get('/api/goals/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { categoryId } = req.query;
      const recommendations = await storage.getGoalRecommendations(
        userId,
        categoryId as string | undefined
      );
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching goal recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // User goal routes
  app.get('/api/user/goals/week', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
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
      const userId = req.user!.id;
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
      const userId = req.user!.id;
      
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
      const userId = req.user!.id;
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
      const userId = req.user!.id;
      const achievements = await storage.getUserAchievements(userId);
      res.json(achievements);
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/weekly-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { weeks = 12 } = req.query; // Default to last 12 weeks
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (parseInt(weeks.toString()) * 7));
      
      const stats = await storage.getWeeklyCompletionStats(userId, startDate, endDate);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching weekly stats:", error);
      res.status(500).json({ message: "Failed to fetch weekly analytics" });
    }
  });

  app.get('/api/analytics/category-performance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { weeks = 12 } = req.query;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (parseInt(weeks.toString()) * 7));
      
      const performance = await storage.getCategoryPerformance(userId, startDate, endDate);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching category performance:", error);
      res.status(500).json({ message: "Failed to fetch category analytics" });
    }
  });

  app.get('/api/analytics/completion-trends', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { days = 30 } = req.query; // Default to last 30 days
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days.toString()));
      
      const trends = await storage.getGoalCompletionTrends(userId, startDate, endDate);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching completion trends:", error);
      res.status(500).json({ message: "Failed to fetch completion trends" });
    }
  });

  app.get('/api/analytics/achievement-progression', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const progression = await storage.getAchievementProgression(userId);
      res.json(progression);
    } catch (error) {
      console.error("Error fetching achievement progression:", error);
      res.status(500).json({ message: "Failed to fetch achievement progression" });
    }
  });

  // Social features routes
  app.post('/api/friends/request', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const friendship = await storage.sendFriendRequest(userId, email);
      res.status(201).json(friendship);
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      res.status(400).json({ message: error.message || "Failed to send friend request" });
    }
  });

  app.get('/api/friends/requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const requests = await storage.getFriendRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      res.status(500).json({ message: "Failed to fetch friend requests" });
    }
  });

  app.patch('/api/friends/requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!["accepted", "declined"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'accepted' or 'declined'" });
      }

      const friendship = await storage.respondToFriendRequest(id, status);
      res.json(friendship);
    } catch (error: any) {
      console.error("Error responding to friend request:", error);
      res.status(400).json({ message: error.message || "Failed to respond to friend request" });
    }
  });

  app.get('/api/friends', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const friends = await storage.getFriends(userId);
      res.json(friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ message: "Failed to fetch friends" });
    }
  });

  app.delete('/api/friends/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      
      await storage.removeFriend(userId, id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing friend:", error);
      res.status(500).json({ message: "Failed to remove friend" });
    }
  });

  app.get('/api/activity-feed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const activities = await storage.getActivityFeed(userId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity feed:", error);
      res.status(500).json({ message: "Failed to fetch activity feed" });
    }
  });

  app.post('/api/achievements/:id/share', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { id: achievementId } = req.params;
      const { sharedWith = "friends", message } = req.body;
      
      const sharedAchievement = await storage.shareAchievement({
        userId,
        achievementId,
        sharedWith,
        message,
      });

      // Create activity feed entry for sharing
      await storage.createActivity({
        userId,
        activityType: "achievement_shared",
        data: { achievementId, sharedWith },
        message: message || `Shared an achievement with ${sharedWith}`,
        isPublic: true,
      });

      res.status(201).json(sharedAchievement);
    } catch (error) {
      console.error("Error sharing achievement:", error);
      res.status(500).json({ message: "Failed to share achievement" });
    }
  });

  app.get('/api/shared-achievements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const sharedAchievements = await storage.getSharedAchievements(userId);
      res.json(sharedAchievements);
    } catch (error) {
      console.error("Error fetching shared achievements:", error);
      res.status(500).json({ message: "Failed to fetch shared achievements" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { limit } = req.query;
      const notifications = await storage.getUserNotifications(userId, limit ? parseInt(limit) : undefined);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const count = await storage.getUnreadNotificationsCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ message: "Failed to fetch notification count" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const notification = await storage.markNotificationAsRead(id, userId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found or unauthorized" });
      }
      
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const deleted = await storage.deleteNotification(id, userId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Notification not found or unauthorized" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.get('/api/notifications/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      let preferences = await storage.getUserNotificationPreferences(userId);
      
      // Create default preferences if none exist
      if (!preferences) {
        preferences = await storage.upsertUserNotificationPreferences({ userId });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  app.put('/api/notifications/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { goalReminders, achievementCelebrations, friendActivity, weeklyRecap, reminderTime } = req.body;
      
      const preferences = await storage.upsertUserNotificationPreferences({
        userId,
        goalReminders,
        achievementCelebrations,
        friendActivity,
        weeklyRecap,
        reminderTime,
      });
      
      res.json(preferences);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  app.post('/api/notifications/reminders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const reminders = await storage.scheduleGoalReminders(userId);
      res.json({ 
        message: `Created ${reminders.length} goal reminders`,
        reminders 
      });
    } catch (error) {
      console.error("Error scheduling goal reminders:", error);
      res.status(500).json({ message: "Failed to schedule goal reminders" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
