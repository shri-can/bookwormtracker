import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, TrendingUp, Target, Award, Calendar } from "lucide-react";

// todo: remove mock functionality
const mockStats = {
  totalBooks: 12,
  booksRead: 7,
  currentlyReading: 3,
  totalPages: 3840,
  pagesRead: 2156,
  averagePagesPerDay: 23.5,
  readingStreak: 15,
  favoriteGenres: [
    { genre: "Programming", count: 4, percentage: 33 },
    { genre: "Business", count: 3, percentage: 25 },
    { genre: "Psychology", count: 2, percentage: 17 },
    { genre: "Design", count: 2, percentage: 17 },
    { genre: "History", count: 1, percentage: 8 },
  ],
  monthlyGoal: {
    target: 4,
    completed: 2,
    progress: 50,
  },
  recentAchievements: [
    { title: "Speed Reader", description: "Read 50 pages in one day", earned: "2 days ago" },
    { title: "Consistency Master", description: "Read for 7 consecutive days", earned: "1 week ago" },
    { title: "Genre Explorer", description: "Read books from 5 different genres", earned: "2 weeks ago" },
  ],
};

export default function Stats() {
  const { 
    totalBooks, 
    booksRead, 
    currentlyReading, 
    totalPages, 
    pagesRead, 
    averagePagesPerDay,
    readingStreak,
    favoriteGenres,
    monthlyGoal,
    recentAchievements
  } = mockStats;

  const readingProgress = (pagesRead / totalPages) * 100;

  return (
    <div className="space-y-6" data-testid="page-stats">
      <div>
        <h1 className="text-3xl font-serif font-semibold">Reading Statistics</h1>
        <p className="text-muted-foreground mt-1">
          Track your reading habits and achievements
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-books">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-books">{totalBooks}</div>
            <p className="text-xs text-muted-foreground">
              {booksRead} completed, {currentlyReading} in progress
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-pages-read">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pages Read</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pages-read">{pagesRead.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(readingProgress)}% of total pages
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-reading-pace">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-daily-average">{averagePagesPerDay}</div>
            <p className="text-xs text-muted-foreground">
              Pages per day
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-reading-streak">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reading Streak</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-reading-streak">{readingStreak}</div>
            <p className="text-xs text-muted-foreground">
              Consecutive days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Goal */}
        <Card data-testid="card-monthly-goal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Monthly Reading Goal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {monthlyGoal.completed} / {monthlyGoal.target} books
              </span>
            </div>
            <Progress value={monthlyGoal.progress} className="h-3" data-testid="progress-monthly-goal" />
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="text-monthly-progress">{monthlyGoal.progress}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </CardContent>
        </Card>

        {/* Favorite Genres */}
        <Card data-testid="card-favorite-genres">
          <CardHeader>
            <CardTitle>Favorite Genres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {favoriteGenres.map((genre, index) => (
                <div key={genre.genre} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" data-testid={`text-genre-${index}`}>
                      {genre.genre}
                    </span>
                    <Badge variant="outline" data-testid={`badge-genre-count-${index}`}>
                      {genre.count}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 w-24">
                    <Progress value={genre.percentage} className="h-2" data-testid={`progress-genre-${index}`} />
                    <span className="text-xs text-muted-foreground w-8" data-testid={`text-genre-percentage-${index}`}>
                      {genre.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Achievements */}
      <Card data-testid="card-achievements">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAchievements.map((achievement, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50" data-testid={`achievement-${index}`}>
                <Award className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium" data-testid={`achievement-title-${index}`}>
                    {achievement.title}
                  </div>
                  <div className="text-sm text-muted-foreground" data-testid={`achievement-description-${index}`}>
                    {achievement.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1" data-testid={`achievement-earned-${index}`}>
                    Earned {achievement.earned}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}