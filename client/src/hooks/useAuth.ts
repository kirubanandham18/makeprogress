import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { removeStoredToken, getStoredToken } from "@/lib/queryClient";
import { useEffect } from "react";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Always call useEffect at the top level to follow Rules of Hooks
  useEffect(() => {
    if (error && error.message.includes('401')) {
      const hadToken = getStoredToken();
      // Token is expired or invalid, clear it from storage
      removeStoredToken();
      // Only reload if we had a token that became invalid
      // Don't reload if user was never authenticated (no infinite loop)
      if (hadToken) {
        window.location.reload();
      }
    }
  }, [error]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
