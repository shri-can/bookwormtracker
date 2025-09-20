import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Target, TrendingUp } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface ReadingProgressProps {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  startedAt?: string;
  onUpdateProgress?: (id: string, newPage: number) => void;
}

export function ReadingProgress({
  id,
  title,
  author,
  totalPages,
  currentPage,
  startedAt,
  onUpdateProgress,
}: ReadingProgressProps) {
  const [newPage, setNewPage] = useState(currentPage);
  const [isUpdating, setIsUpdating] = useState(false);

  const progress = (currentPage / totalPages) * 100;
  const remainingPages = totalPages - currentPage;
  const daysReading = startedAt ? differenceInDays(new Date(), new Date(startedAt)) + 1 : 1;
  const pagesPerDay = currentPage / daysReading;
  const estimatedDaysToFinish = pagesPerDay > 0 ? Math.ceil(remainingPages / pagesPerDay) : 0;

  const handleUpdateProgress = async () => {
    if (newPage === currentPage) return;
    
    setIsUpdating(true);
    console.log(`Updating progress for ${title}: page ${newPage}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onUpdateProgress?.(id, newPage);
    setIsUpdating(false);
  };

  return (
    <Card data-testid={`card-reading-progress-${id}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" />
          <div className="flex-1">
            <div className="font-serif" data-testid={`text-progress-title-${id}`}>{title}</div>
            <div className="text-sm font-normal text-muted-foreground" data-testid={`text-progress-author-${id}`}>
              by {author}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Reading Progress</span>
            <Badge variant="outline" data-testid={`badge-progress-percent-${id}`}>
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          <Progress value={progress} className="h-3" data-testid={`progress-bar-${id}`} />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span data-testid={`text-current-page-${id}`}>Page {currentPage}</span>
            <span data-testid={`text-total-pages-${id}`}>{totalPages} pages</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold" data-testid={`text-days-reading-${id}`}>{daysReading}</div>
            <div className="text-xs text-muted-foreground">Days Reading</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold" data-testid={`text-pages-per-day-${id}`}>
              {pagesPerDay.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Pages/Day</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold" data-testid={`text-estimated-days-${id}`}>
              {estimatedDaysToFinish}
            </div>
            <div className="text-xs text-muted-foreground">Days Left</div>
          </div>
        </div>

        {startedAt && (
          <div className="text-sm text-muted-foreground text-center" data-testid={`text-started-date-${id}`}>
            Started {format(new Date(startedAt), "MMM dd, yyyy")}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            type="number"
            value={newPage}
            onChange={(e) => setNewPage(parseInt(e.target.value) || 0)}
            min={0}
            max={totalPages}
            placeholder="Update page"
            className="flex-1"
            data-testid={`input-update-page-${id}`}
          />
          <Button 
            onClick={handleUpdateProgress}
            disabled={isUpdating || newPage === currentPage}
            data-testid={`button-update-progress-${id}`}
          >
            {isUpdating ? "Updating..." : "Update"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}