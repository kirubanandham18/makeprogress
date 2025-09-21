import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import AppHeader from "@/components/app-header";
import CategoryCard from "@/components/category-card";
import GraphicsCalendar from "@/components/graphics-calendar";
import ProgressCircle from "@/components/ui/progress-circle";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface CategoryStats {
  completed: number;
  total: number;
  name: string;
  color: string;
}

interface ProgressData {
  weekStart: string;
  totalGoals: number;
  completedGoals: number;
  categories: CategoryStats[];
  categoriesCompleted: number;
  achievement: any;
  progressPercentage: number;
}

interface UserGoal {
  id: string;
  userId: string;
  goalId: string;
  weekStart: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  goal: {
    id: string;
    categoryId: string;
    description: string;
    createdAt: string;
    category: {
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      color: string | null;
      createdAt: string;
    };
  };
}

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // User will automatically see the landing page with login form
      // No need to redirect since App.tsx handles this routing
      return;
    }
  }, [isAuthenticated, authLoading]);

  const { data: progress, isLoading: progressLoading } = useQuery<ProgressData>({
    queryKey: ["/api/user/progress"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: userGoals, isLoading: goalsLoading } = useQuery<UserGoal[]>({
    queryKey: ["/api/user/goals/week"],
    enabled: isAuthenticated,
    retry: false,
  });

  const toggleGoalMutation = useMutation({
    mutationFn: async (userGoalId: string) => {
      const response = await apiRequest("PATCH", `/api/user-goals/${userGoalId}/complete`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/goals/week"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session Expired",
          description: "Please sign in again to continue.",
          variant: "destructive",
        });
        // App.tsx will automatically redirect to landing page for unauthenticated users
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update goal completion",
        variant: "destructive",
      });
    },
  });

  const getAchievementMessage = (level: string | undefined, categoriesCompleted: number) => {
    if (!level || level === "none") return null;
    
    switch (level) {
      case "slayed":
        return { title: "OMG! You Slayed It! 🎉", description: "6 categories completed this week" };
      case "rock":
        return { title: "You Rock! 🎉", description: "4 categories completed this week" };
      case "track":
        return { title: "You're on the right track! 👍", description: "2 categories completed this week" };
      default:
        return null;
    }
  };

  const getNextLevelMessage = (categoriesCompleted: number) => {
    if (categoriesCompleted >= 6) return "Maximum level achieved!";
    if (categoriesCompleted >= 4) return "6 categories";
    if (categoriesCompleted >= 2) return "4 categories";
    return "2 categories";
  };

  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const startStr = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    return `Week of ${startStr}-${endStr}`;
  };

  const handleToggleGoal = (userGoalId: string) => {
    toggleGoalMutation.mutate(userGoalId);
  };

  const handleSelectGoals = () => {
    setLocation("/goals");
  };

  if (authLoading || progressLoading || goalsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center animate-pulse">
          <i className="fas fa-bullseye text-white text-sm"></i>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader user={user} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Failed to load progress data</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const achievementMessage = getAchievementMessage(progress.achievement?.level, progress.categoriesCompleted);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Weekly Overview */}
        <section className="mb-8">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1" data-testid="text-week-range">
                  {formatWeekRange(progress.weekStart)}
                </h2>
                <p className="text-muted-foreground">Track your progress across all life categories</p>
              </div>
              
              <div className="mt-4 lg:mt-0 flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary" data-testid="text-completed-goals">
                    {progress.completedGoals}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary" data-testid="text-remaining-goals">
                    {progress.totalGoals - progress.completedGoals}
                  </div>
                  <div className="text-xs text-muted-foreground">Remaining</div>
                </div>
                <ProgressCircle 
                  percentage={progress.progressPercentage} 
                  size={64}
                  data-testid="progress-circle-weekly"
                />
              </div>
            </div>
            
            {/* Achievement Status */}
            {achievementMessage && (
              <div className="bg-muted rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center achievement-badge">
                      <i className="fas fa-trophy text-white"></i>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground" data-testid="text-achievement-title">
                        {achievementMessage.title}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid="text-achievement-description">
                        {achievementMessage.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Next level at</div>
                    <div className="font-semibold text-foreground" data-testid="text-next-level">
                      {getNextLevelMessage(progress.categoriesCompleted)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Graphics Calendar */}
        <section className="mb-8">
          <GraphicsCalendar 
            userGoals={userGoals || []} 
            onToggleGoal={handleToggleGoal}
          />
        </section>

        {/* Categories Grid */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-foreground">Goal Categories</h2>
            <div className="flex gap-3">
              <Button 
                onClick={handleSelectGoals}
                className="button-gradient text-white border-0 hover:opacity-90 px-6 py-2"
                data-testid="button-select-goals"
              >
                <i className="fas fa-plus mr-2"></i>Select This Week's Goals
              </Button>
              <Button 
                onClick={() => setLocation("/analytics")}
                variant="outline"
                className="button-gradient text-white border-0 hover:opacity-90"
                data-testid="button-analytics"
              >
                <i className="fas fa-chart-line mr-2"></i>Analytics
              </Button>
              <Button 
                onClick={() => setLocation("/social")}
                variant="outline"
                className="success-gradient text-white hover:opacity-90 border-0"
                data-testid="button-social"
              >
                <i className="fas fa-users mr-2"></i>Social
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {progress.categories.map((category) => {
              const categoryGoals = userGoals?.filter(
                ug => ug.goal.category.name === category.name
              ) || [];

              return (
                <CategoryCard
                  key={category.name}
                  category={{
                    name: category.name,
                    color: category.color,
                    completed: category.completed,
                    total: category.total,
                  }}
                  goals={categoryGoals}
                  onToggleGoal={handleToggleGoal}
                  onCategoryClick={handleSelectGoals}
                />
              );
            })}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4" data-testid="list-recent-activity">
                {userGoals?.filter(ug => ug.completed)
                  .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
                  .slice(0, 5)
                  .map((userGoal) => (
                    <div key={userGoal.id} className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-check text-white text-xs"></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          Completed "{userGoal.goal.description}"
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {userGoal.goal.category.name} • {
                            userGoal.completedAt 
                              ? new Date(userGoal.completedAt).toLocaleDateString()
                              : 'Recently'
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                
                {(!userGoals || userGoals.filter(ug => ug.completed).length === 0) && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No completed goals yet this week</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Start completing your goals to see your activity here
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

      </main>
    </div>
  );
}
