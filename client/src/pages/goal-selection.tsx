import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import AppHeader from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  createdAt: string;
}

interface Goal {
  id: string;
  categoryId: string;
  description: string;
  createdAt: string;
}

export default function GoalSelection() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedGoals, setSelectedGoals] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: allGoals, isLoading: goalsLoading } = useQuery<Goal[][]>({
    queryKey: ["/api/goals/all"],
    queryFn: async () => {
      if (!categories) return [];
      const goalPromises = categories.map(category =>
        fetch(`/api/categories/${category.id}/goals`, { credentials: "include" })
          .then(res => res.json())
      );
      return Promise.all(goalPromises);
    },
    enabled: isAuthenticated && !!categories,
    retry: false,
  });

  const selectGoalsMutation = useMutation({
    mutationFn: async (goalIds: string[]) => {
      const response = await apiRequest("POST", "/api/user/select-goals", {
        goalIds,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Your weekly goals have been selected!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/goals/week"] });
      setLocation("/");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to select goals",
        variant: "destructive",
      });
    },
  });

  const getCategoryIcon = (categoryName: string) => {
    const iconMap: Record<string, string> = {
      'Personal': 'fas fa-user',
      'Inner Peace': 'fas fa-leaf',
      'Health': 'fas fa-heart',
      'Family': 'fas fa-home',
      'Career': 'fas fa-briefcase',
      'Fun': 'fas fa-gamepad',
    };
    return iconMap[categoryName] || 'fas fa-circle';
  };

  const handleGoalToggle = (categoryId: string, goalId: string, checked: boolean) => {
    setSelectedGoals(prev => {
      const categoryGoals = prev[categoryId] || [];
      
      if (checked) {
        if (categoryGoals.length >= 2) {
          toast({
            title: "Limit Reached",
            description: "You can only select 2 goals per category",
            variant: "destructive",
          });
          return prev;
        }
        return {
          ...prev,
          [categoryId]: [...categoryGoals, goalId],
        };
      } else {
        return {
          ...prev,
          [categoryId]: categoryGoals.filter(id => id !== goalId),
        };
      }
    });
  };

  const getTotalSelectedGoals = () => {
    return Object.values(selectedGoals).reduce((total, goals) => total + goals.length, 0);
  };

  const canSubmit = () => {
    if (!categories) return false;
    
    // Check if each category has exactly 2 goals selected
    return categories.every(category => {
      const categoryGoals = selectedGoals[category.id] || [];
      return categoryGoals.length === 2;
    });
  };

  const handleSubmit = () => {
    const allSelectedGoals = Object.values(selectedGoals).flat();
    selectGoalsMutation.mutate(allSelectedGoals);
  };

  if (authLoading || categoriesLoading || goalsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center animate-pulse">
          <i className="fas fa-bullseye text-white text-sm"></i>
        </div>
      </div>
    );
  }

  if (!categories || !allGoals) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader user={user} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Failed to load categories and goals</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
              Select Your Weekly Goals
            </h1>
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              data-testid="button-back-dashboard"
            >
              Back to Dashboard
            </Button>
          </div>
          <p className="text-muted-foreground">
            Choose 2 goals from each category for this week ({getTotalSelectedGoals()}/12 selected)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {categories.map((category, categoryIndex) => {
            const categoryGoals = allGoals[categoryIndex] || [];
            const selectedInCategory = selectedGoals[category.id] || [];
            
            return (
              <Card key={category.id} className="hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className={`w-6 h-6 category-${category.color} rounded mr-3 flex items-center justify-center`}>
                      <i className={`${getCategoryIcon(category.name)} text-white text-sm`}></i>
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">
                      {category.name} Goals ({selectedInCategory.length}/2 selected)
                    </h3>
                  </div>
                  
                  <div className="space-y-3" data-testid={`list-goals-${category.name.toLowerCase().replace(' ', '-')}`}>
                    {categoryGoals.map((goal) => {
                      const isSelected = selectedInCategory.includes(goal.id);
                      const isDisabled = !isSelected && selectedInCategory.length >= 2;
                      
                      return (
                        <label 
                          key={goal.id}
                          className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-muted border border-primary' 
                              : isDisabled
                              ? 'bg-background opacity-50 cursor-not-allowed'
                              : 'bg-background hover:bg-accent hover:bg-opacity-10'
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={isDisabled}
                            onCheckedChange={(checked) => 
                              handleGoalToggle(category.id, goal.id, checked as boolean)
                            }
                            data-testid={`checkbox-goal-${goal.id}`}
                          />
                          <span className={`text-sm ${isSelected ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {goal.description}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            disabled={!canSubmit() || selectGoalsMutation.isPending}
            onClick={handleSubmit}
            className="bg-primary text-primary-foreground hover:opacity-90 px-8"
            data-testid="button-save-goals"
          >
            {selectGoalsMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Saving Goals...
              </>
            ) : (
              'Save Goals for This Week'
            )}
          </Button>
        </div>

        {!canSubmit() && getTotalSelectedGoals() > 0 && (
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Please select exactly 2 goals from each category to continue
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
