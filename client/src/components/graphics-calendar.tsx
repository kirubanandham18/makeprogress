import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import personalIcon from "@assets/personal_1758464140980.png";
import innerPeaceIcon from "@assets/innerpeace_1758464155112.png";
import healthIcon from "@assets/health1_1758464133360.png";
import familyIcon from "@assets/family1_1758464115422.png";
import careerIcon from "@assets/carrer1_1758464107256.png";
import funIcon from "@assets/fun1_1758464127001.png";

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

interface GraphicsCalendarProps {
  userGoals: UserGoal[];
  onToggleGoal: (userGoalId: string) => void;
}

interface RealTimeClockProps {
  className?: string;
}

function RealTimeClock({ className = "" }: RealTimeClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`text-center ${className}`} data-testid="real-time-clock">
      <div className="text-lg font-semibold text-foreground">
        {format(currentTime, "HH:mm:ss")}
      </div>
      <div className="text-sm text-muted-foreground">
        {format(currentTime, "EEEE, MMMM do, yyyy")}
      </div>
    </div>
  );
}

export default function GraphicsCalendar({ userGoals, onToggleGoal }: GraphicsCalendarProps) {
  const [currentWeek] = useState(() => {
    const now = new Date();
    return startOfWeek(now, { weekStartsOn: 1 }); // Start week on Monday
  });

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

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(currentWeek, i);
    return day;
  });

  const today = new Date();

  const getGoalsForDay = (day: Date) => {
    // For now, show all goals each day - in a real app you might filter by day
    return userGoals;
  };

  const getCompletedGoalsCount = () => {
    return userGoals.filter(goal => goal.completed).length;
  };

  const getTotalGoalsCount = () => {
    return userGoals.length;
  };

  return (
    <Card className="w-full" data-testid="graphics-calendar">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-foreground">
            📅 Weekly Goal Calendar
          </CardTitle>
          <RealTimeClock className="ml-4" />
        </div>
        <div className="text-sm text-muted-foreground">
          Week of {format(currentWeek, "MMM do")} - {format(addDays(currentWeek, 6), "MMM do, yyyy")}
        </div>
        <div className="text-sm font-medium text-accent">
          Progress: {getCompletedGoalsCount()}/{getTotalGoalsCount()} goals completed this week
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map((day, index) => {
            const isToday = isSameDay(day, today);
            const dayGoals = getGoalsForDay(day);
            const completedCount = dayGoals.filter(goal => goal.completed).length;
            
            return (
              <div
                key={index}
                className={`p-3 rounded-lg border text-center ${
                  isToday 
                    ? 'bg-accent text-accent-foreground border-accent shadow-lg' 
                    : 'bg-card text-card-foreground border-border hover:bg-muted'
                }`}
                data-testid={`calendar-day-${index}`}
              >
                <div className="font-semibold text-sm mb-1">
                  {format(day, "EEE")}
                </div>
                <div className={`text-lg font-bold mb-2 ${isToday ? 'text-accent-foreground' : 'text-foreground'}`}>
                  {format(day, "d")}
                </div>
                <div className="text-xs">
                  <div className={`w-2 h-2 rounded-full mx-auto ${
                    completedCount === dayGoals.length && dayGoals.length > 0
                      ? 'success-gradient shadow-lg' 
                      : completedCount > 0 
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-md'
                        : 'bg-gray-300'
                  }`} title={`${completedCount}/${dayGoals.length} goals completed`}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Today's Goals Section */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center">
            🎯 Today's Goals ({format(today, "EEEE")})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {userGoals.map((userGoal) => (
              <div
                key={userGoal.id}
                className={`p-3 rounded-lg border transition-all duration-300 ${
                  userGoal.completed 
                    ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-700 shadow-md' 
                    : 'bg-card border-border hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 dark:hover:from-violet-900/20 dark:hover:to-purple-900/20 hover:border-violet-200 dark:hover:border-violet-700 hover:shadow-lg'
                }`}
                data-testid={`goal-card-${userGoal.id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 category-${userGoal.goal.category.color} rounded-full flex items-center justify-center`}>
                    <img 
                      src={getCategoryIcon(userGoal.goal.category.name)} 
                      alt={`${userGoal.goal.category.name} icon`}
                      className="w-5 h-5 object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {userGoal.goal.category.name}
                    </div>
                    <div className={`text-sm ${
                      userGoal.completed 
                        ? 'text-muted-foreground line-through' 
                        : 'text-foreground'
                    }`}>
                      {userGoal.goal.description}
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleGoal(userGoal.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      userGoal.completed
                        ? 'success-gradient border-emerald-400 text-white shadow-lg'
                        : 'border-gray-300 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'
                    }`}
                    data-testid={`button-toggle-goal-${userGoal.id}`}
                  >
                    {userGoal.completed && <span className="text-xs">✓</span>}
                  </button>
                </div>
                {userGoal.completed && userGoal.completedAt && (
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                    ✨ Completed at {format(new Date(userGoal.completedAt), "HH:mm")}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {userGoals.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-lg mb-2">📝 No goals selected for this week</p>
              <p className="text-sm text-muted-foreground">
                Visit the Goal Selection page to choose your weekly goals
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}