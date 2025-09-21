import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Target, Calendar, BookOpen, TrendingUp, Plus, Edit, Trash2, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Book, ReadingGoal, InsertReadingGoal } from "@shared/schema";

interface ReadingGoalsProps {
  books: Book[];
}

export function ReadingGoals({ books }: ReadingGoalsProps) {
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<ReadingGoal | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery<ReadingGoal[]>({
    queryKey: ['/api/reading-goals'],
    queryFn: async () => {
      const response = await fetch('/api/reading-goals');
      if (!response.ok) throw new Error('Failed to fetch reading goals');
      return response.json();
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goal: InsertReadingGoal) => {
      const response = await apiRequest('POST', '/api/reading-goals', goal);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reading-goals'] });
      setShowGoalDialog(false);
      setEditingGoal(null);
      toast({ title: "Reading goal created successfully" });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ReadingGoal> }) => {
      const response = await apiRequest('PATCH', `/api/reading-goals/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reading-goals'] });
      setShowGoalDialog(false);
      setEditingGoal(null);
      toast({ title: "Reading goal updated successfully" });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/reading-goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reading-goals'] });
      toast({ title: "Reading goal deleted successfully" });
    },
  });

  const [goalForm, setGoalForm] = useState<{
    title: string;
    description: string;
    type: 'books' | 'pages' | 'minutes';
    target: number;
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>({
    title: '',
    description: '',
    type: 'books',
    target: 12,
    period: 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear() + 1, 0, 1).toISOString().split('T')[0],
    isActive: true,
  });

  const resetForm = () => {
    setGoalForm({
      title: '',
      description: '',
      type: 'books',
      target: 12,
      period: 'yearly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().getFullYear() + 1, 0, 1).toISOString().split('T')[0],
      isActive: true,
    });
  };

  const handleCreateGoal = async () => {
    if (!goalForm.title || goalForm.target <= 0) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!goalForm.startDate || !goalForm.endDate) {
      toast({
        title: "Please select valid start and end dates",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingGoal) {
        await updateGoalMutation.mutateAsync({
          id: editingGoal.id,
          updates: goalForm,
        });
      } else {
        await createGoalMutation.mutateAsync(goalForm);
      }
    } catch (error) {
      console.error("Error saving goal:", error);
      toast({
        title: "Failed to save reading goal",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (goal: ReadingGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      description: goal.description || '',
      type: goal.type,
      target: goal.target,
      period: goal.period,
      startDate: goal.startDate,
      endDate: goal.endDate,
      isActive: goal.isActive,
    });
    setShowGoalDialog(true);
  };

  const getGoalProgress = (goal: ReadingGoal) => {
    const now = new Date();
    const startDate = new Date(goal.startDate);
    const endDate = new Date(goal.endDate);
    
    if (now < startDate || now > endDate) {
      return { current: 0, percentage: 0, isOverdue: now > endDate };
    }

    let current = 0;
    
    switch (goal.type) {
      case 'books':
        current = books.filter(book => 
          book.status === 'finished' && 
          book.completedAt &&
          new Date(book.completedAt) >= startDate &&
          new Date(book.completedAt) <= endDate
        ).length;
        break;
      case 'pages':
        current = books
          .filter(book => 
            book.completedAt &&
            new Date(book.completedAt) >= startDate &&
            new Date(book.completedAt) <= endDate
          )
          .reduce((total, book) => total + (book.totalPages || 0), 0);
        break;
      case 'minutes':
        // This would require reading sessions data
        current = 0;
        break;
    }

    const percentage = Math.min((current / goal.target) * 100, 100);
    return { current, percentage, isOverdue: false };
  };

  const getGoalTypeLabel = (type: string) => {
    switch (type) {
      case 'books': return 'Books';
      case 'pages': return 'Pages';
      case 'minutes': return 'Minutes';
      default: return type;
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';  
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      default: return period;
    }
  };

  return (
    <div className="space-y-6" data-testid="reading-goals">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-semibold">Reading Goals</h2>
          <p className="text-muted-foreground">Track your reading progress and stay motivated</p>
        </div>
        <Dialog open={showGoalDialog} onOpenChange={(open) => {
          setShowGoalDialog(open);
          if (!open) {
            setEditingGoal(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-goal">
              <Plus className="h-4 w-4 mr-2" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-goal-form">
            <DialogHeader>
              <DialogTitle>
                {editingGoal ? 'Edit Reading Goal' : 'Create Reading Goal'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="goal-title">Goal Title *</Label>
                <Input
                  id="goal-title"
                  placeholder="e.g., Read 12 books this year"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, title: e.target.value }))}
                  data-testid="input-goal-title"
                />
              </div>

              <div>
                <Label htmlFor="goal-description">Description</Label>
                <Textarea
                  id="goal-description"
                  placeholder="Optional description for your goal"
                  value={goalForm.description}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, description: e.target.value }))}
                  data-testid="textarea-goal-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Goal Type</Label>
                  <Select value={goalForm.type} onValueChange={(value: any) => setGoalForm(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger data-testid="select-goal-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="books">Books</SelectItem>
                      <SelectItem value="pages">Pages</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="goal-target">Target *</Label>
                  <Input
                    id="goal-target"
                    type="number"
                    min="1"
                    value={goalForm.target}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, target: parseInt(e.target.value) || 0 }))}
                    data-testid="input-goal-target"
                  />
                </div>
              </div>

              <div>
                <Label>Time Period</Label>
                <Select value={goalForm.period} onValueChange={(value: any) => setGoalForm(prev => ({ ...prev, period: value }))}>
                  <SelectTrigger data-testid="select-goal-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={goalForm.startDate}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, startDate: e.target.value }))}
                    data-testid="input-start-date"
                  />
                </div>

                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={goalForm.endDate}
                    onChange={(e) => setGoalForm(prev => ({ ...prev, endDate: e.target.value }))}
                    data-testid="input-end-date"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowGoalDialog(false)}
                  data-testid="button-cancel-goal"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGoal}
                  disabled={createGoalMutation.isPending || updateGoalMutation.isPending}
                  data-testid="button-save-goal"
                >
                  {createGoalMutation.isPending || updateGoalMutation.isPending ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Saving...
                    </>
                  ) : (
                    editingGoal ? 'Update Goal' : 'Create Goal'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Reading Goals Yet</h3>
            <p className="text-muted-foreground mb-4">
              Set reading goals to track your progress and stay motivated
            </p>
            <Button onClick={() => setShowGoalDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const progress = getGoalProgress(goal);
            const isCompleted = progress.percentage >= 100;
            
            return (
              <Card key={goal.id} className={`hover-elevate ${!goal.isActive ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{goal.title}</CardTitle>
                    <div className="flex items-center gap-1">
                      {isCompleted && <Award className="h-4 w-4 text-yellow-500" />}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(goal)}
                        data-testid={`button-edit-goal-${goal.id}`}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteGoalMutation.mutate(goal.id)}
                        data-testid={`button-delete-goal-${goal.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>{progress.current} / {goal.target} {getGoalTypeLabel(goal.type)}</span>
                      <span className={isCompleted ? 'text-green-600 font-medium' : ''}>
                        {Math.round(progress.percentage)}%
                      </span>
                    </div>
                    <Progress 
                      value={progress.percentage} 
                      className="h-2"
                    />
                  </div>

                  {/* Goal Details */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      {getPeriodLabel(goal.period)}
                    </Badge>
                    <Badge variant="outline">
                      <Target className="h-3 w-3 mr-1" />
                      {getGoalTypeLabel(goal.type)}
                    </Badge>
                    {isCompleted && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <Award className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="text-xs text-muted-foreground">
                    {new Date(goal.startDate).toLocaleDateString()} - {new Date(goal.endDate).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}