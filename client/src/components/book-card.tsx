import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MoreHorizontal, Play, BookOpen, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  genre: string;
  topics?: string[];
  usefulness?: string;
  totalPages?: number;
  currentPage?: number;
  isCurrentlyReading?: boolean;
  onStartReading?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function BookCard({
  id,
  title,
  author,
  genre,
  topics = [],
  usefulness,
  totalPages = 0,
  currentPage = 0,
  isCurrentlyReading = false,
  onStartReading,
  onViewDetails,
  onDelete,
}: BookCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  const handleStartReading = async () => {
    setIsLoading(true);
    console.log(`Starting to read book: ${title}`);
    onStartReading?.(id);
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleViewDetails = () => {
    console.log(`Viewing details for book: ${title}`);
    onViewDetails?.(id);
  };

  const handleDelete = () => {
    console.log(`Deleting book: ${title}`);
    onDelete?.(id);
  };

  return (
    <Card className="hover-elevate" data-testid={`card-book-${id}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex-1">
          <CardTitle className="text-base font-serif line-clamp-2" data-testid={`text-book-title-${id}`}>
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-book-author-${id}`}>
            by {author}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-book-menu-${id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleViewDetails} data-testid={`button-view-details-${id}`}>
              <BookOpen className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-destructive" data-testid={`button-delete-book-${id}`}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" data-testid={`badge-genre-${id}`}>{genre}</Badge>
          {isCurrentlyReading && (
            <Badge variant="default" data-testid={`badge-reading-status-${id}`}>Currently Reading</Badge>
          )}
        </div>
        
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-1" data-testid={`topics-display-${id}`}>
            {topics.slice(0, 4).map((topic, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs"
                data-testid={`topic-badge-${id}-${index}`}
              >
                {topic}
              </Badge>
            ))}
            {topics.length > 4 && (
              <Badge variant="secondary" className="text-xs" data-testid={`topic-more-${id}`}>
                +{topics.length - 4} more
              </Badge>
            )}
          </div>
        )}
        
        {usefulness && (
          <p className="text-sm text-muted-foreground" data-testid={`text-usefulness-${id}`}>
            <strong>Useful for:</strong> {usefulness}
          </p>
        )}

        {isCurrentlyReading && totalPages > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span data-testid={`text-progress-pages-${id}`}>
                {currentPage} of {totalPages} pages
              </span>
              <span data-testid={`text-progress-percent-${id}`}>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" data-testid={`progress-reading-${id}`} />
          </div>
        )}

        {!isCurrentlyReading && (
          <Button 
            onClick={handleStartReading} 
            disabled={isLoading}
            className="w-full"
            data-testid={`button-start-reading-${id}`}
          >
            <Play className="mr-2 h-4 w-4" />
            {isLoading ? "Starting..." : "Start Reading"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}