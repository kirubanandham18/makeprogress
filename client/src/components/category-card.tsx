import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import personalIcon from "@assets/personal_1758464140980.png";
import innerPeaceIcon from "@assets/innerpeace_1758464155112.png";
import healthIcon from "@assets/health1_1758464133360.png";
import familyIcon from "@assets/family1_1758464115422.png";
import careerIcon from "@assets/carrer1_1758464107256.png";
import funIcon from "@assets/fun1_1758464127001.png";

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
  onCategoryClick?: () => void;
}

export default function CategoryCard({ category, goals, onToggleGoal, onCategoryClick }: CategoryCardProps) {
  const getCategoryIcon = (categoryName: string) => {
    const iconMap: Record<string, string> = {
      'Personal': personalIcon,
      'Inner Peace': innerPeaceIcon, 
      'Health': healthIcon,
      'Family': familyIcon,
      'Career': careerIcon,
      'Fun': funIcon,
    };
    return iconMap[categoryName] || personalIcon;
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
    <Card 
      className="hover-lift cursor-pointer transition-all duration-300 hover:shadow-xl border-2 hover:border-primary/20 group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      onClick={onCategoryClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCategoryClick?.();
        }
      }}
      role="button"
      tabIndex={0}
      data-testid={`card-category-${category.name.toLowerCase().replace(' ', '-')}`}
    >
      <div className={`category-${category.color} h-32 rounded-t-xl flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300`}>
        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-lg group-hover:bg-white/30 transition-all duration-300">
          <img 
            src={getCategoryIcon(category.name)} 
            alt={`${category.name} icon`}
            className="w-14 h-14 object-contain rounded-full group-hover:scale-110 transition-transform duration-300"
          />
        </div>
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <i className="fas fa-arrow-right text-white text-xs"></i>
          </div>
        </div>
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
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleGoal(userGoal.id);
                }}
                aria-label={`Mark goal ${userGoal.completed ? 'incomplete' : 'complete'}: ${userGoal.goal.description}`}
                aria-pressed={userGoal.completed}
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
                Click to select goals for this week
              </p>
              <div className="mt-2">
                <i className="fas fa-hand-pointer text-primary/60 text-lg animate-pulse"></i>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
