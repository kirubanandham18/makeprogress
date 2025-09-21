import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, UserPlus, MessageSquare, Award, Clock, Check, X } from "lucide-react";

interface Friend {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
}

interface FriendRequest {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  createdAt: string;
  requester: Friend;
  addressee: Friend;
}

interface ActivityFeedItem {
  id: string;
  userId: string;
  activityType: string;
  data: any;
  message: string;
  isPublic: boolean;
  createdAt: string;
  user: Friend;
}

interface SharedAchievement {
  id: string;
  userId: string;
  achievementId: string;
  sharedWith: string;
  message?: string;
  createdAt: string;
  user: Friend;
  achievement: {
    id: string;
    level: string;
    categoriesCompleted: number;
    weekStart: string;
  };
}

export default function Social() {
  const [friendEmail, setFriendEmail] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [selectedAchievement, setSelectedAchievement] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: friends, isLoading: friendsLoading } = useQuery<Friend[]>({
    queryKey: ["/api/friends"],
    queryFn: () => fetch("/api/friends").then(res => res.json()),
  });

  const { data: friendRequests, isLoading: requestsLoading } = useQuery<FriendRequest[]>({
    queryKey: ["/api/friends/requests"],
    queryFn: () => fetch("/api/friends/requests").then(res => res.json()),
  });

  const { data: activityFeed, isLoading: activityLoading } = useQuery<ActivityFeedItem[]>({
    queryKey: ["/api/activity-feed"],
    queryFn: () => fetch("/api/activity-feed").then(res => res.json()),
  });

  const { data: sharedAchievements, isLoading: achievementsLoading } = useQuery<SharedAchievement[]>({
    queryKey: ["/api/shared-achievements"],
    queryFn: () => fetch("/api/shared-achievements").then(res => res.json()),
  });

  const { data: userAchievements } = useQuery({
    queryKey: ["/api/user/achievements"],
    queryFn: () => fetch("/api/user/achievements").then(res => res.json()),
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: (email: string) => 
      apiRequest("/api/friends/request", "POST", { email }),
    onSuccess: () => {
      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent successfully.",
      });
      setFriendEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request.",
        variant: "destructive",
      });
    },
  });

  const respondToRequestMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "accepted" | "declined" }) =>
      apiRequest(`/api/friends/requests/${id}`, "PATCH", { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({
        title: "Friend Request Updated",
        description: "Friend request has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update friend request.",
        variant: "destructive",
      });
    },
  });

  const removeFriendMutation = useMutation({
    mutationFn: (friendId: string) =>
      apiRequest(`/api/friends/${friendId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({
        title: "Friend Removed",
        description: "Friend has been removed from your list.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove friend.",
        variant: "destructive",
      });
    },
  });

  const shareAchievementMutation = useMutation({
    mutationFn: ({ achievementId, message }: { achievementId: string; message: string }) =>
      apiRequest(`/api/achievements/${achievementId}/share`, "POST", { 
        sharedWith: "friends", 
        message 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shared-achievements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-feed"] });
      toast({
        title: "Achievement Shared",
        description: "Your achievement has been shared with friends!",
      });
      setShareMessage("");
      setSelectedAchievement(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to share achievement.",
        variant: "destructive",
      });
    },
  });

  const handleSendFriendRequest = () => {
    if (friendEmail.trim()) {
      sendFriendRequestMutation.mutate(friendEmail.trim());
    }
  };

  const handleRespondToRequest = (id: string, status: "accepted" | "declined") => {
    respondToRequestMutation.mutate({ id, status });
  };

  const handleShareAchievement = () => {
    if (selectedAchievement) {
      shareAchievementMutation.mutate({
        achievementId: selectedAchievement,
        message: shareMessage,
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "slayed": return "bg-green-500";
      case "rock": return "bg-yellow-500";
      case "track": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "slayed": return "🏆";
      case "rock": return "💪";
      case "track": return "🎯";
      default: return "📊";
    }
  };

  if (friendsLoading || requestsLoading || activityLoading || achievementsLoading) {
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
          <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="heading-social">
            Social Hub
          </h1>
          <p className="text-muted-foreground">
            Connect with friends, share achievements, and stay motivated together
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Friends</p>
                  <p className="text-2xl font-bold text-foreground">{friends?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="text-2xl font-bold text-foreground">{friendRequests?.length || 0}</p>
                </div>
                <UserPlus className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Shared Achievements</p>
                  <p className="text-2xl font-bold text-foreground">{sharedAchievements?.length || 0}</p>
                </div>
                <Award className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="friends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="friends" data-testid="tab-friends">Friends</TabsTrigger>
            <TabsTrigger value="requests" data-testid="tab-requests">
              Requests
              {friendRequests && friendRequests.length > 0 && (
                <Badge className="ml-2 text-xs">{friendRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">Activity Feed</TabsTrigger>
            <TabsTrigger value="achievements" data-testid="tab-shared-achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Friends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Input
                    placeholder="Enter friend's email address"
                    value={friendEmail}
                    onChange={(e) => setFriendEmail(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendFriendRequest()}
                    data-testid="input-friend-email"
                  />
                  <Button 
                    onClick={handleSendFriendRequest}
                    disabled={!friendEmail.trim() || sendFriendRequestMutation.isPending}
                    data-testid="button-send-friend-request"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send Request
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Friends ({friends?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {friends && friends.length > 0 ? (
                  <div className="space-y-4">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                            {friend.firstName?.[0]}{friend.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium">{friend.firstName} {friend.lastName}</p>
                            <p className="text-sm text-muted-foreground">{friend.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFriendMutation.mutate(friend.id)}
                          disabled={removeFriendMutation.isPending}
                          data-testid={`button-remove-friend-${friend.id}`}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No friends yet. Start by sending some friend requests!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Friend Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {friendRequests && friendRequests.length > 0 ? (
                  <div className="space-y-4">
                    {friendRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                            {request.requester.firstName?.[0]}{request.requester.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium">{request.requester.firstName} {request.requester.lastName}</p>
                            <p className="text-sm text-muted-foreground">{request.requester.email}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleRespondToRequest(request.id, "accepted")}
                            disabled={respondToRequestMutation.isPending}
                            data-testid={`button-accept-request-${request.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRespondToRequest(request.id, "declined")}
                            disabled={respondToRequestMutation.isPending}
                            data-testid={`button-decline-request-${request.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No pending friend requests.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Activity Feed</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button data-testid="button-share-achievement">
                    <Award className="w-4 h-4 mr-2" />
                    Share Achievement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Achievement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {userAchievements && userAchievements.length > 0 ? (
                      <>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Select Achievement</label>
                          <div className="space-y-2">
                            {userAchievements.map((achievement: any) => (
                              <div 
                                key={achievement.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedAchievement === achievement.id 
                                    ? "border-primary bg-primary/10" 
                                    : "border-border hover:border-primary/50"
                                }`}
                                onClick={() => setSelectedAchievement(achievement.id)}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`w-8 h-8 rounded ${getLevelColor(achievement.level)} flex items-center justify-center text-white text-sm`}>
                                    {getLevelIcon(achievement.level)}
                                  </div>
                                  <div>
                                    <p className="font-medium capitalize">{achievement.level}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {achievement.categoriesCompleted} categories completed
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Message (Optional)</label>
                          <Textarea
                            placeholder="Add a message to share with your achievement..."
                            value={shareMessage}
                            onChange={(e) => setShareMessage(e.target.value)}
                            data-testid="textarea-share-message"
                          />
                        </div>
                        <Button 
                          onClick={handleShareAchievement}
                          disabled={!selectedAchievement || shareAchievementMutation.isPending}
                          className="w-full"
                          data-testid="button-confirm-share"
                        >
                          Share with Friends
                        </Button>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Complete your weekly goals to earn achievements that you can share with friends!
                        </p>
                        <Button variant="outline" onClick={() => setSelectedAchievement(null)}>
                          <i className="fas fa-bullseye mr-2"></i>
                          Start Goal Tracking
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {activityFeed && activityFeed.length > 0 ? (
                activityFeed.map((activity) => (
                  <Card key={activity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                          {activity.user.firstName?.[0]}{activity.user.lastName?.[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium">{activity.user.firstName} {activity.user.lastName}</p>
                            <Badge variant="secondary" className="text-xs">
                              {activity.activityType.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{activity.message}</p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDate(activity.createdAt)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No activity yet. Connect with friends to see their achievements and progress!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shared Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                {sharedAchievements && sharedAchievements.length > 0 ? (
                  <div className="space-y-4">
                    {sharedAchievements.map((shared) => (
                      <Card key={shared.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                                {shared.user.firstName?.[0]}{shared.user.lastName?.[0]}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <p className="font-medium">{shared.user.firstName} {shared.user.lastName}</p>
                                  <div className={`px-2 py-1 rounded text-xs text-white ${getLevelColor(shared.achievement.level)}`}>
                                    {getLevelIcon(shared.achievement.level)} {shared.achievement.level.toUpperCase()}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">
                                  Completed {shared.achievement.categoriesCompleted} categories
                                </p>
                                {shared.message && (
                                  <p className="text-sm bg-muted p-2 rounded italic">"{shared.message}"</p>
                                )}
                                <div className="flex items-center text-xs text-muted-foreground mt-2">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDate(shared.createdAt)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No shared achievements yet. Share your accomplishments with friends!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}