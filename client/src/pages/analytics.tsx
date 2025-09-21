import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Target, Calendar, Award } from "lucide-react";

interface WeeklyStats {
  week: string;
  totalGoals: number;
  completedGoals: number;
  completionRate: number;
  categoriesCompleted: number;
}

interface CategoryPerformance {
  categoryId: string;
  categoryName: string;
  totalGoals: number;
  completedGoals: number;
  completionRate: number;
}

interface CompletionTrend {
  date: string;
  completedCount: number;
}

interface AchievementProgression {
  week: string;
  level: string;
  categoriesCompleted: number;
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("12");
  const [trendsRange, setTrendsRange] = useState("30");

  const { data: weeklyStats, isLoading: weeklyLoading } = useQuery<WeeklyStats[]>({
    queryKey: ["/api/analytics/weekly-stats", timeRange],
    queryFn: () => fetch(`/api/analytics/weekly-stats?weeks=${timeRange}`).then(res => res.json()),
  });

  const { data: categoryPerformance, isLoading: categoryLoading } = useQuery<CategoryPerformance[]>({
    queryKey: ["/api/analytics/category-performance", timeRange],
    queryFn: () => fetch(`/api/analytics/category-performance?weeks=${timeRange}`).then(res => res.json()),
  });

  const { data: completionTrends, isLoading: trendsLoading } = useQuery<CompletionTrend[]>({
    queryKey: ["/api/analytics/completion-trends", trendsRange],
    queryFn: () => fetch(`/api/analytics/completion-trends?days=${trendsRange}`).then(res => res.json()),
  });

  const { data: achievementProgression, isLoading: achievementLoading } = useQuery<AchievementProgression[]>({
    queryKey: ["/api/analytics/achievement-progression"],
    queryFn: () => fetch(`/api/analytics/achievement-progression`).then(res => res.json()),
  });

  // Calculate summary statistics
  const summaryStats = weeklyStats && Array.isArray(weeklyStats) && weeklyStats.length > 0 ? {
    averageCompletion: weeklyStats.reduce((sum, week) => sum + week.completionRate, 0) / weeklyStats.length || 0,
    totalWeeks: weeklyStats.length,
    bestWeek: weeklyStats.reduce((best, week) => week.completionRate > best.completionRate ? week : best, weeklyStats[0]),
    totalGoalsCompleted: weeklyStats.reduce((sum, week) => sum + week.completedGoals, 0),
  } : null;

  // Color schemes for charts
  const categoryColors = {
    "Personal": "#8B5CF6",
    "Inner Peace": "#10B981", 
    "Health": "#EF4444",
    "Family": "#F59E0B",
    "Career": "#3B82F6",
    "Fun": "#EC4899"
  };

  const levelColors = {
    "slayed": "#10B981",
    "rock": "#F59E0B", 
    "track": "#8B5CF6",
    "none": "#6B7280"
  };

  if (weeklyLoading || categoryLoading || trendsLoading || achievementLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="heading-analytics">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track your progress trends, insights, and performance over time
          </p>
        </div>

        {/* Summary Stats Cards */}
        {summaryStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average Completion</p>
                    <p className="text-2xl font-bold text-foreground">
                      {summaryStats.averageCompletion.toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Goals Completed</p>
                    <p className="text-2xl font-bold text-foreground">
                      {summaryStats.totalGoalsCompleted}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Best Week</p>
                    <p className="text-2xl font-bold text-foreground">
                      {summaryStats.bestWeek?.completionRate.toFixed(1)}%
                    </p>
                  </div>
                  <Award className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Weeks Tracked</p>
                    <p className="text-2xl font-bold text-foreground">
                      {summaryStats.totalWeeks}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Time Range Controls */}
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Weekly/Category View:</label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32" data-testid="select-time-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 weeks</SelectItem>
                <SelectItem value="8">8 weeks</SelectItem>
                <SelectItem value="12">12 weeks</SelectItem>
                <SelectItem value="24">24 weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Daily Trends:</label>
            <Select value={trendsRange} onValueChange={setTrendsRange}>
              <SelectTrigger className="w-32" data-testid="select-trends-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="weekly" data-testid="tab-weekly">Weekly Progress</TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">Category Performance</TabsTrigger>
            <TabsTrigger value="trends" data-testid="tab-trends">Daily Trends</TabsTrigger>
            <TabsTrigger value="achievements" data-testid="tab-achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Completion Rate */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weeklyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="completionRate" 
                        stroke="#8B5CF6" 
                        strokeWidth={2}
                        name="Completion Rate (%)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Performance Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Category Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryPerformance}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ categoryName, completionRate }) => `${categoryName}: ${completionRate.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="completionRate"
                      >
                        {categoryPerformance?.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={categoryColors[entry.categoryName as keyof typeof categoryColors] || "#8884d8"} 
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Goal Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={weeklyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="completedGoals" fill="#10B981" name="Completed Goals" />
                    <Bar dataKey="totalGoals" fill="#E5E7EB" name="Total Goals" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Performance Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={categoryPerformance} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="categoryName" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="completionRate" fill="#8B5CF6" name="Completion Rate (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Goal Completion Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={completionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="completedCount" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="Goals Completed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Achievement Progression</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={achievementProgression}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="categoriesCompleted" fill="#F59E0B" name="Categories Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {achievementProgression?.map((achievement, index) => (
                <Card key={index} className="border-l-4" style={{ borderLeftColor: levelColors[achievement.level as keyof typeof levelColors] }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Week {achievement.week}</p>
                        <p className="text-lg font-semibold capitalize">{achievement.level}</p>
                        <p className="text-sm">{achievement.categoriesCompleted} categories</p>
                      </div>
                      <Award className="h-8 w-8" style={{ color: levelColors[achievement.level as keyof typeof levelColors] }} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}