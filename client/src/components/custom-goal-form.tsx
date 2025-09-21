import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CustomGoalFormProps {
  categoryId: string;
  categoryName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CustomGoalForm({ 
  categoryId, 
  categoryName, 
  isOpen, 
  onClose, 
  onSuccess 
}: CustomGoalFormProps) {
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createGoalMutation = useMutation({
    mutationFn: async (goalDescription: string) => {
      const response = await apiRequest("POST", `/api/categories/${categoryId}/goals`, {
        description: goalDescription,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Custom goal created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/goals/all"] });
      setDescription("");
      onSuccess();
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create custom goal",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a goal description",
        variant: "destructive",
      });
      return;
    }
    if (description.length > 200) {
      toast({
        title: "Validation Error",
        description: "Goal description must be 200 characters or less",
        variant: "destructive",
      });
      return;
    }
    createGoalMutation.mutate(description.trim());
  };

  const handleClose = () => {
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Custom Goal for {categoryName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Enter your custom goal description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              disabled={createGoalMutation.isPending}
              data-testid="input-custom-goal-description"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {description.length}/200 characters
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={createGoalMutation.isPending}
              data-testid="button-cancel-custom-goal"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createGoalMutation.isPending || description.trim().length === 0}
              data-testid="button-save-custom-goal"
            >
              {createGoalMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creating...
                </>
              ) : (
                'Create Goal'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}