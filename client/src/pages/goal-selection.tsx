import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import AppHeader from "@/components/app-header";
import CustomGoalForm from "@/components/custom-goal-form";
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

interface Recommendation {
  goalId: string;
  goal: Goal & { category: Category };
  score: number;
  reason: string;
}

export default function GoalSelection() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedGoals, setSelectedGoals] = useState<Record<string, string[]>>({});
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [customGoalForm, setCustomGoalForm] = useState<{
    isOpen: boolean;
    categoryId: string;
    categoryName: string;
  }>({
    isOpen: false,
    categoryId: "",
    categoryName: "",
  });

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
      const goalPromises = categories.map(async category => {
        const response = await apiRequest("GET", `/api/categories/${category.id}/goals`);
        return response.json();
      });
      return Promise.all(goalPromises);
    },
    enabled: isAuthenticated && !!categories,
    retry: false,
  });

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery<Recommendation[]>({
    queryKey: ["/api/goals/recommendations"],
    enabled: isAuthenticated && showRecommendations,
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

  const openCustomGoalForm = (categoryId: string, categoryName: string) => {
    setCustomGoalForm({
      isOpen: true,
      categoryId,
      categoryName,
    });
  };

  const closeCustomGoalForm = () => {
    setCustomGoalForm({
      isOpen: false,
      categoryId: "",
      categoryName: "",
    });
  };

  const handleCustomGoalSuccess = () => {
    // The query will be invalidated by the CustomGoalForm component
    // This ensures the new goal appears in the list
  };

  const handleSelectRecommendation = (recommendation: Recommendation) => {
    const { goalId, goal } = recommendation;
    const categoryId = goal.category.id;
    
    // Check if we can add this goal
    const categoryGoals = selectedGoals[categoryId] || [];
    if (categoryGoals.length >= 2) {
      toast({
        title: "Category Full",
        description: `You already have 2 goals selected for ${goal.category.name}`,
        variant: "destructive",
      });
      return;
    }

    if (categoryGoals.includes(goalId)) {
      toast({
        title: "Already Selected",
        description: "This goal is already in your selection",
        variant: "destructive",
      });
      return;
    }

    // Add the goal to selected goals
    setSelectedGoals(prev => ({
      ...prev,
      [categoryId]: [...categoryGoals, goalId],
    }));

    toast({
      title: "Goal Added",
      description: `Added "${goal.description}" to ${goal.category.name}`,
    });
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
            <div className="flex gap-2">
              <Button
                variant={showRecommendations ? "default" : "outline"}
                onClick={() => setShowRecommendations(!showRecommendations)}
                data-testid="button-toggle-recommendations"
              >
                <i className="fas fa-lightbulb mr-2"></i>
                {showRecommendations ? "Hide" : "Show"} Recommendations
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/")}
                data-testid="button-back-dashboard"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">
            Choose 2 goals from each category for this week ({getTotalSelectedGoals()}/12 selected)
          </p>
        </div>

        {/* Recommendations Section */}
        {showRecommendations && (
          <div className="mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded mr-3 flex items-center justify-center">
                    <i className="fas fa-sparkles text-white text-sm"></i>
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Personalized Goal Recommendations
                  </h2>
                </div>
                
                {recommendationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-muted-foreground">Loading recommendations...</span>
                  </div>
                ) : recommendations && recommendations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendations.slice(0, 8).map((rec) => (
                      <div
                        key={rec.goalId}
                        className="p-4 bg-accent bg-opacity-30 rounded-lg border border-accent hover:border-primary transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <div className={`w-4 h-4 category-${rec.goal.category.color} rounded mr-2 flex items-center justify-center`}>
                              <i className={`${getCategoryIcon(rec.goal.category.name)} text-white text-xs`}></i>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                              {rec.goal.category.name}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectRecommendation(rec)}
                            disabled={
                              (selectedGoals[rec.goal.category.id] || []).length >= 2 ||
                              (selectedGoals[rec.goal.category.id] || []).includes(rec.goalId)
                            }
                            data-testid={`button-select-recommendation-${rec.goalId}`}
                          >
                            <i className="fas fa-plus mr-1 text-xs"></i>
                            Select
                          </Button>
                        </div>
                        <p className="text-sm text-foreground mb-2">
                          {rec.goal.description}
                        </p>
                        <div className="flex items-center">
                          <i className="fas fa-info-circle text-xs text-primary mr-1"></i>
                          <span className="text-xs text-muted-foreground">
                            {rec.reason}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <i className="fas fa-lightbulb text-4xl text-muted-foreground mb-4"></i>
                    <p className="text-muted-foreground">
                      Complete a few goals to get personalized recommendations!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {categories.map((category, categoryIndex) => {
            const categoryGoals = allGoals[categoryIndex] || [];
            const selectedInCategory = selectedGoals[category.id] || [];
            
            return (
              <Card key={category.id} className="hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`w-6 h-6 category-${category.color} rounded mr-3 flex items-center justify-center`}>
                        <i className={`${getCategoryIcon(category.name)} text-white text-sm`}></i>
                      </div>
                      <h3 className="font-semibold text-foreground text-lg">
                        {category.name} Goals ({selectedInCategory.length}/2 selected)
                      </h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCustomGoalForm(category.id, category.name)}
                      data-testid={`button-add-custom-goal-${category.name.toLowerCase().replace(' ', '-')}`}
                    >
                      <i className="fas fa-plus mr-1 text-xs"></i>
                      Add Custom
                    </Button>
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

        <CustomGoalForm
          categoryId={customGoalForm.categoryId}
          categoryName={customGoalForm.categoryName}
          isOpen={customGoalForm.isOpen}
          onClose={closeCustomGoalForm}
          onSuccess={handleCustomGoalSuccess}
        />
      </main>
    </div>
  );
}
