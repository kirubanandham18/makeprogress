import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";
import goalFlowIcon from "@/assets/goalflow-icon.png";

// Lazy load pages for better performance
const NotFound = lazy(() => import("@/pages/not-found"));
const Landing = lazy(() => import("@/pages/landing"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const GoalSelection = lazy(() => import("@/pages/goal-selection"));
const Analytics = lazy(() => import("@/pages/analytics"));
const Social = lazy(() => import("@/pages/social"));

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img 
          src={goalFlowIcon} 
          alt="Loading" 
          className="w-12 h-12 animate-pulse"
        />
      </div>
    );
  }

  const LoadingFallback = () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <img 
        src={goalFlowIcon} 
        alt="Loading" 
        className="w-12 h-12 animate-pulse"
      />
    </div>
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        {!isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={Dashboard} />
            <Route path="/goals" component={GoalSelection} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/social" component={Social} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
