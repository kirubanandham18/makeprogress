import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { removeStoredToken } from "@/lib/queryClient";
import { useEffect } from "react";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Always call useEffect at the top level to follow Rules of Hooks
  useEffect(() => {
    if (error && error.message.includes('401')) {
      // Token is expired or invalid, clear it from storage
      removeStoredToken();
      // Force a page reload to show the login page
      window.location.reload();
    }
  }, [error]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
