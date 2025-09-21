import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CategoryGoal {
  id: string;
  goal: {
    id: string;
    description: string;
  };
  completed: boolean;
}

interface CategoryCardProps {
  category: {
    name: string;
    color: string;
    completed: number;
    total: number;
  };
  goals: CategoryGoal[];
  onToggleGoal: (userGoalId: string) => void;
}

export default function CategoryCard({ category, goals, onToggleGoal }: CategoryCardProps) {
  const getCategoryIcon = (categoryName: string) => {
    const iconMap: Record<string, string> = {
      'Personal': '🧠', // Brain for personal development
      'Inner Peace': '🧘‍♀️', // Meditation pose for inner peace
      'Health': '💪', // Flexed bicep for health
      'Family': '👨‍👩‍👧‍👦', // Family emoji
      'Career': '💼', // Briefcase for career
      'Fun': '🎮', // Game controller for fun
    };
    return iconMap[categoryName] || '⭐';
  };

  const getProgressDots = () => {
    return Array.from({ length: category.total }, (_, index) => (
      <div
        key={index}
        className={`w-2 h-2 rounded-full ${
          index < category.completed ? 'bg-accent' : 'bg-border'
        }`}
      />
    ));
  };

  return (
    <Card className="hover-lift cursor-pointer">
      <div className={`category-${category.color} h-24 rounded-t-xl flex items-center justify-center`}>
        <span className="text-white text-3xl">{getCategoryIcon(category.name)}</span>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground mb-2">{category.name}</h3>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">
            {category.completed}/{category.total} goals completed
          </span>
          <div className="flex space-x-1">
            {getProgressDots()}
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {goals.map((userGoal) => (
            <div key={userGoal.id} className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto text-xs"
                onClick={() => onToggleGoal(userGoal.id)}
                data-testid={`button-toggle-goal-${userGoal.id}`}
              >
                <i 
                  className={`${
                    userGoal.completed 
                      ? 'fas fa-check-circle text-accent' 
                      : 'far fa-circle text-border'
                  } text-xs`}
                ></i>
              </Button>
              <span 
                className={`${
                  userGoal.completed 
                    ? 'text-muted-foreground line-through' 
                    : 'text-foreground'
                }`}
                data-testid={`text-goal-${userGoal.id}`}
              >
                {userGoal.goal.description}
              </span>
            </div>
          ))}
          
          {goals.length === 0 && (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm">No goals selected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Select goals for this week to get started
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
