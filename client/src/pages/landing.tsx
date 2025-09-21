import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
                <i className="fas fa-bullseye text-white text-sm"></i>
              </div>
              <h1 className="text-xl font-bold text-foreground">GoalFlow</h1>
            </div>
            <Button onClick={handleLogin} data-testid="button-login">
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-24 h-24 gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-8">
            <i className="fas fa-bullseye text-white text-4xl"></i>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Track Your Personal
            <span className="gradient-bg bg-clip-text text-transparent"> Development</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Set weekly goals across six life categories, track your progress, and achieve holistic personal growth with our gamified goal tracking system.
          </p>

          <Card className="max-w-2xl mx-auto mb-8">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 category-personal rounded-lg flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-user text-white"></i>
                  </div>
                  <span className="text-sm font-medium text-foreground">Personal</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 category-peace rounded-lg flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-leaf text-white"></i>
                  </div>
                  <span className="text-sm font-medium text-foreground">Inner Peace</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 category-health rounded-lg flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-heart text-white"></i>
                  </div>
                  <span className="text-sm font-medium text-foreground">Health</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 category-family rounded-lg flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-home text-white"></i>
                  </div>
                  <span className="text-sm font-medium text-foreground">Family</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 category-career rounded-lg flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-briefcase text-white"></i>
                  </div>
                  <span className="text-sm font-medium text-foreground">Career</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 category-fun rounded-lg flex items-center justify-center mx-auto mb-2">
                    <i className="fas fa-gamepad text-white"></i>
                  </div>
                  <span className="text-sm font-medium text-foreground">Fun</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Button 
              size="lg" 
              className="gradient-bg text-white hover:opacity-90 px-8 py-4 text-lg"
              onClick={handleLogin}
              data-testid="button-get-started"
            >
              Get Started - It's Free
            </Button>
            <p className="text-sm text-muted-foreground">
              No email verification required • Start tracking goals instantly
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
