import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AppHeaderProps {
  user?: User;
}

export default function AppHeader({ user }: AppHeaderProps) {
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.email) {
      return user.email;
    }
    return "User";
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 gradient-bg rounded-lg flex items-center justify-center">
              <i className="fas fa-bullseye text-white text-sm"></i>
            </div>
            <h1 
              className="text-xl font-bold text-foreground cursor-pointer hover:opacity-80"
              onClick={() => setLocation("/")}
              data-testid="link-home"
            >
              GoalFlow
            </h1>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => setLocation("/")}
              className={`${location === "/" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"} transition-colors`}
              data-testid="link-dashboard"
            >
              Dashboard
            </button>
            <button
              onClick={() => setLocation("/goals")}
              className={`${location === "/goals" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"} transition-colors`}
              data-testid="link-goals"
            >
              Goals
            </button>
          </nav>
          
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2" data-testid="button-user-menu">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.profileImageUrl || ""} alt="Profile" />
                    <AvatarFallback className="text-xs">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium" data-testid="text-user-name">
                    {getDisplayName()}
                  </span>
                  <i className="fas fa-chevron-down text-xs text-muted-foreground"></i>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
