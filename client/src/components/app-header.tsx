import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, removeStoredToken } from "@/lib/queryClient";
import goalFlowIcon from "@/assets/goalflow-icon.png";
import { useState } from "react";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      removeStoredToken();
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    },
    onError: (error: any) => {
      // Even if logout fails on server, clear local token
      removeStoredToken();
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Signed Out",
        description: "You have been signed out.",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
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

  const handleMobileNavigation = (path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border-b border-border shadow-lg backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <img 
              src={goalFlowIcon} 
              alt="makeprogress Icon" 
              className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLocation("/")}
              data-testid="image-logo"
            />
            <h1 
              className="text-xl font-bold gradient-text cursor-pointer hover:opacity-80"
              onClick={() => setLocation("/")}
              data-testid="link-home"
            >
              makeprogress
            </h1>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => setLocation("/")}
              className={`flex items-center space-x-2 ${location === "/" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"} transition-colors`}
              data-testid="link-dashboard"
            >
              <i className="fas fa-tachometer-alt"></i>
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setLocation("/goals")}
              className={`flex items-center space-x-2 ${location === "/goals" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"} transition-colors`}
              data-testid="link-goals"
            >
              <i className="fas fa-bullseye"></i>
              <span>Goals</span>
            </button>
            <button
              onClick={() => setLocation("/analytics")}
              className={`flex items-center space-x-2 ${location === "/analytics" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"} transition-colors`}
              data-testid="link-analytics"
            >
              <i className="fas fa-chart-line"></i>
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setLocation("/social")}
              className={`flex items-center space-x-2 ${location === "/social" ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"} transition-colors`}
              data-testid="link-social"
            >
              <i className="fas fa-users"></i>
              <span>Social</span>
            </button>
          </nav>
          
          <div className="flex items-center space-x-3">
            {/* Mobile Navigation Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden" data-testid="button-mobile-menu">
                  <i className="fas fa-bars text-lg"></i>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Navigation</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col space-y-4">
                  <button
                    onClick={() => handleMobileNavigation("/")}
                    className={`flex items-center space-x-3 p-3 rounded-lg text-left ${location === "/" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"} transition-colors`}
                    data-testid="mobile-link-dashboard"
                  >
                    <i className="fas fa-tachometer-alt w-5"></i>
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => handleMobileNavigation("/goals")}
                    className={`flex items-center space-x-3 p-3 rounded-lg text-left ${location === "/goals" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"} transition-colors`}
                    data-testid="mobile-link-goals"
                  >
                    <i className="fas fa-bullseye w-5"></i>
                    <span>Goals</span>
                  </button>
                  <button
                    onClick={() => handleMobileNavigation("/analytics")}
                    className={`flex items-center space-x-3 p-3 rounded-lg text-left ${location === "/analytics" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"} transition-colors`}
                    data-testid="mobile-link-analytics"
                  >
                    <i className="fas fa-chart-line w-5"></i>
                    <span>Analytics</span>
                  </button>
                  <button
                    onClick={() => handleMobileNavigation("/social")}
                    className={`flex items-center space-x-3 p-3 rounded-lg text-left ${location === "/social" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"} transition-colors`}
                    data-testid="mobile-link-social"
                  >
                    <i className="fas fa-users w-5"></i>
                    <span>Social</span>
                  </button>
                  
                  <div className="border-t pt-4 mt-6">
                    <div className="flex items-center space-x-3 p-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={user?.profileImageUrl || ""} alt="Profile" />
                        <AvatarFallback className="text-sm">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm" data-testid="mobile-text-user-name">
                          {getDisplayName()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors mt-2"
                      data-testid="mobile-button-logout"
                    >
                      <i className="fas fa-sign-out-alt w-5"></i>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
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
