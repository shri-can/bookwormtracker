import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  MoreHorizontal, 
  Play, 
  BookOpen, 
  Trash2, 
  Edit,
  ArrowRight,
  Bookmark,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Book } from "@shared/schema";

interface BookCardProps extends Omit<Book, 'topics' | 'tags'> {
  topics: string[];
  tags: string[];
  // Selection features  
  isSelected?: boolean;
  showSelection?: boolean;
  onSelect?: () => void;
  // View mode
  viewMode?: "grid" | "list";
  // Actions
  onStartReading?: (id: string) => void;
  onContinueReading?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onStatusChange?: (id: string, newStatus: string) => void;
}

// Status configuration with colors and icons
const STATUS_CONFIG = {
  toRead: { 
    label: "To Read", 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", 
    icon: Bookmark 
  },
  reading: { 
    label: "Reading", 
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", 
    icon: BookOpen 
  },
  onHold: { 
    label: "On Hold", 
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", 
    icon: Clock 
  },
  dnf: { 
    label: "DNF", 
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", 
    icon: XCircle 
  },
  finished: { 
    label: "Finished", 
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", 
    icon: CheckCircle 
  },
};

export function BookCard({
  id,
  title,
  author,
  genre,
  topics = [],
  tags = [],
  status = "toRead",
  priority = 3,
  format = "paper",
  language = "English",
  progress = 0,
  totalPages,
  currentPage = 0,
  coverUrl,
  addedAt,
  lastReadAt,
  usefulness,
  isCurrentlyReading = false,
  isSelected = false,
  showSelection = false,
  viewMode = "grid",
  onSelect,
  onStartReading,
  onContinueReading,
  onViewDetails,
  onDelete,
  onEdit,
  onStatusChange,
}: BookCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  const StatusIcon = statusConfig?.icon || Bookmark;
  
  // Calculate reading progress
  const readingProgress = (progress || 0) * 100;
  const pageProgress = totalPages && currentPage 
    ? (currentPage / totalPages) * 100 
    : readingProgress;

  const handlePrimaryAction = async () => {
    setIsLoading(true);
    
    if (status === "reading" && onContinueReading) {
      onContinueReading(id);
    } else if (status !== "finished" && onStartReading) {
      onStartReading(id);
    }
    
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleViewDetails = () => {
    onViewDetails?.(id);
  };

  const handleDelete = () => {
    onDelete?.(id);
  };

  const handleEdit = () => {
    onEdit?.(id);
  };

  const handleStatusChange = () => {
    const nextStatus = status === "toRead" ? "reading" : "toRead";
    onStatusChange?.(id, nextStatus);
  };

  const handleStatusBadgeClick = () => {
    onStatusChange?.(id, getNextStatus(status));
  };

  const getNextStatus = (currentStatus: string) => {
    const statusOrder = ["toRead", "reading", "onHold", "finished", "dnf"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    return statusOrder[(currentIndex + 1) % statusOrder.length];
  };

  const getPrimaryButtonText = () => {
    if (status === "reading") return "Continue";
    if (status === "finished") return "Finished";
    return "Start";
  };

  const getPrimaryButtonIcon = () => {
    if (status === "reading") return ArrowRight;
    if (status === "finished") return CheckCircle;
    return Play;
  };

  const PrimaryIcon = getPrimaryButtonIcon();

  if (viewMode === "list") {
    return (
      <Card className={`hover-elevate ${isSelected ? 'ring-2 ring-primary' : ''}`} data-testid={`card-book-${id}`}>
        <CardContent className="flex items-center gap-4 p-4">
          {showSelection && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              data-testid={`checkbox-select-${id}`}
            />
          )}
          
          {/* Cover placeholder */}
          <div className="w-12 h-16 bg-muted rounded flex-shrink-0 flex items-center justify-center">
            {coverUrl ? (
              <img src={coverUrl} alt={title} className="w-full h-full object-cover rounded" />
            ) : (
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          
          {/* Book info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-serif font-medium truncate" data-testid={`text-book-title-${id}`}>
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground truncate" data-testid={`text-book-author-${id}`}>
                  by {author}
                </p>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                {/* Status badge */}
                <Badge 
                  className={`${statusConfig?.color} cursor-pointer hover-elevate`} 
                  onClick={handleStatusBadgeClick}
                  data-testid={`badge-status-${id}`}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig?.label}
                </Badge>
                
                {/* Priority indicator */}
                {priority && priority !== 3 && (
                  <Badge variant="outline" className="text-xs">
                    P{priority}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Progress bar */}
            {readingProgress > 0 && (
              <div className="mb-2">
                <Progress value={readingProgress} className="h-1" data-testid={`progress-reading-${id}`} />
              </div>
            )}
            
            {/* Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{genre}</Badge>
              {tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {status !== "finished" && (
              <Button
                size="sm"
                onClick={handlePrimaryAction}
                disabled={isLoading}
                data-testid={`button-primary-action-${id}`}
              >
                <PrimaryIcon className="h-4 w-4 mr-1" />
                {isLoading ? "..." : getPrimaryButtonText()}
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid={`button-book-menu-${id}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleViewDetails}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view (default)
  return (
    <Card className={`hover-elevate ${isSelected ? 'ring-2 ring-primary' : ''}`} data-testid={`card-book-${id}`}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-start gap-2 flex-1">
          {showSelection && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="mt-1"
              data-testid={`checkbox-select-${id}`}
            />
          )}
          
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-serif line-clamp-2" data-testid={`text-book-title-${id}`}>
              {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1" data-testid={`text-book-author-${id}`}>
              by {author}
            </p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" data-testid={`button-book-menu-${id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleViewDetails}>
              <BookOpen className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleStatusChange}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Move to {status === "toRead" ? "Reading" : "To-Read"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Cover image placeholder */}
        {coverUrl && (
          <div className="aspect-[3/4] rounded-md overflow-hidden bg-muted">
            <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
          </div>
        )}
        
        {/* Status and priority */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge 
            className={`${statusConfig?.color} cursor-pointer hover-elevate`} 
            onClick={handleStatusBadgeClick}
            data-testid={`badge-status-${id}`}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig?.label}
          </Badge>
          
          {priority && priority !== 3 && (
            <Badge variant="outline" className="text-xs">
              Priority {priority}
            </Badge>
          )}
          
          <Badge variant="outline" className="text-xs">{format}</Badge>
        </div>
        
        {/* Progress */}
        {readingProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span data-testid={`text-progress-percent-${id}`}>{Math.round(readingProgress)}%</span>
            </div>
            <Progress value={readingProgress} className="h-2" data-testid={`progress-reading-${id}`} />
          </div>
        )}
        
        {/* Topics */}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-1" data-testid={`topics-display-${id}`}>
            {topics.slice(0, 3).map((topic, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs"
                data-testid={`topic-badge-${id}-${index}`}
              >
                {topic}
              </Badge>
            ))}
            {topics.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{topics.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1" data-testid={`tags-display-${id}`}>
            {tags.slice(0, 3).map((tag, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-xs"
                data-testid={`tag-badge-${id}-${index}`}
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        {/* Usefulness */}
        {usefulness && (
          <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-usefulness-${id}`}>
            <strong>Why:</strong> {usefulness}
          </p>
        )}

        {/* Primary action button */}
        {status !== "finished" && (
          <Button 
            onClick={handlePrimaryAction} 
            disabled={isLoading}
            className="w-full"
            data-testid={`button-primary-action-${id}`}
          >
            <PrimaryIcon className="mr-2 h-4 w-4" />
            {isLoading ? "Loading..." : getPrimaryButtonText()}
          </Button>
        )}
        
        {status === "finished" && (
          <div className="text-center text-sm text-muted-foreground py-2">
            <CheckCircle className="h-4 w-4 inline mr-1" />
            Completed
          </div>
        )}
      </CardContent>
    </Card>
  );
}