import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookOpen, Clock, TrendingUp, Target, Award, Calendar as CalendarIcon, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface StatsOverviewResponse {
  totals: {
    pages: number;
    minutes: number;
    sessions: number;
  };
  goals: {
    targetPages: number;
    targetMinutes: number;
    biteTargetPerDay: number;
  };
  streak: {
    current: number;
    best: number;
  };
  finishedBooks: Array<{
    id: number;
    title: string;
    daysToFinish: number;
    avgPph: number;
  }>;
  activeEtas: Array<{
    bookId: number;
    title: string;
    progressPct: number;
    etaDate: string | null;
    bitePages: number;
  }>;
  sparkline: Array<{
    date: string;
    pages: number;
  }>;
  heatmap: Array<{
    date: string;
    pages: number;
    minutes: number;
  }>;
  range: {
    from: string;
    to: string;
  };
}

function OverviewTab({ data }: { data: StatsOverviewResponse }) {
  const { totals, goals, streak, finishedBooks, activeEtas, range } = data;
  
  // Calculate actual days in selected range
  const fromDate = new Date(range.from);
  const toDate = new Date(range.to);
  const daysInRange = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  
  const goalProgress = goals.targetPages > 0 ? Math.round((totals.pages / goals.targetPages) * 100) : 0;
  const avgPagesPerDay = totals.pages / daysInRange;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-pages">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pages Read</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-pages">{totals.pages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {totals.sessions} reading sessions
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-reading-time">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reading Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-reading-time">
              {Math.floor(totals.minutes / 60)}h {totals.minutes % 60}m
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(totals.minutes / Math.max(1, totals.sessions))} min/session avg
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-daily-average">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-daily-average">{avgPagesPerDay.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Pages per day
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-current-streak">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-current-streak">{streak.current}</div>
            <p className="text-xs text-muted-foreground">
              Best: {streak.best} days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reading Goal Progress */}
        <Card data-testid="card-reading-goal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Reading Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Pages Goal</span>
              <span className="text-sm text-muted-foreground">
                {totals.pages.toLocaleString()} / {goals.targetPages.toLocaleString()}
              </span>
            </div>
            <Progress value={Math.min(100, goalProgress)} className="h-3" data-testid="progress-pages-goal" />
            <div className="text-center">
              <div className="text-2xl font-bold" data-testid="text-goal-progress">{goalProgress}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
            <div className="text-xs text-muted-foreground">
              Daily target: {goals.biteTargetPerDay} pages
            </div>
          </CardContent>
        </Card>

        {/* Active Books ETAs */}
        <Card data-testid="card-active-etas">
          <CardHeader>
            <CardTitle>Currently Reading</CardTitle>
          </CardHeader>
          <CardContent>
            {activeEtas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No books currently being read</p>
            ) : (
              <div className="space-y-3">
                {activeEtas.slice(0, 3).map((book) => (
                  <div key={book.bookId} className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium line-clamp-1" data-testid={`text-active-book-${book.bookId}`}>
                        {book.title}
                      </span>
                      <Badge variant="outline" data-testid={`badge-progress-${book.bookId}`}>
                        {book.progressPct}%
                      </Badge>
                    </div>
                    <Progress value={book.progressPct} className="h-2" data-testid={`progress-book-${book.bookId}`} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{book.bitePages} pages/day target</span>
                      {book.etaDate && (
                        <span data-testid={`text-eta-${book.bookId}`}>
                          ETA: {format(new Date(book.etaDate), "MMM d")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Finished Books */}
      {finishedBooks.length > 0 && (
        <Card data-testid="card-finished-books">
          <CardHeader>
            <CardTitle>Recently Finished</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {finishedBooks.slice(0, 5).map((book) => (
                <div key={book.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30" data-testid={`finished-book-${book.id}`}>
                  <div className="flex-1">
                    <div className="font-medium" data-testid={`finished-book-title-${book.id}`}>
                      {book.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Finished in {book.daysToFinish} days • {book.avgPph.toFixed(1)} pages/hour avg
                    </div>
                  </div>
                  <Badge variant="secondary" data-testid={`badge-days-${book.id}`}>
                    {book.daysToFinish}d
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TrendsTab({ data }: { data: StatsOverviewResponse }) {
  const { sparkline, heatmap } = data;

  // Guard against empty or insufficient data
  if (!sparkline || sparkline.length === 0) {
    return (
      <div className="space-y-6">
        <Card data-testid="card-no-data">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              No data available for the selected range
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate trend metrics with guards
  const recentDays = sparkline.slice(-7);
  const weekTotal = recentDays.length > 0 ? recentDays.reduce((sum, day) => sum + day.pages, 0) : 0;
  const weekAvg = recentDays.length > 0 ? weekTotal / recentDays.length : 0;
  
  const prevWeekDays = sparkline.slice(-14, -7);
  const prevWeekTotal = prevWeekDays.length > 0 ? prevWeekDays.reduce((sum, day) => sum + day.pages, 0) : 0;
  const prevWeekAvg = prevWeekDays.length > 0 ? prevWeekTotal / prevWeekDays.length : 0;
  
  const weekTrend = prevWeekAvg > 0 ? ((weekAvg - prevWeekAvg) / prevWeekAvg) * 100 : 0;
  
  const maxPages = sparkline.length > 0 ? Math.max(0, ...sparkline.map(d => d.pages)) : 0;

  return (
    <div className="space-y-6">
      {/* Trend Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-week-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-week-total">{weekTotal}</div>
            <p className="text-xs text-muted-foreground">
              {weekAvg.toFixed(1)} pages/day avg
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-week-trend">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Week Trend</CardTitle>
            <TrendingUp className={cn("h-4 w-4", weekTrend >= 0 ? "text-green-500" : "text-red-500")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", weekTrend >= 0 ? "text-green-600" : "text-red-600")} data-testid="text-week-trend">
              {weekTrend >= 0 ? '+' : ''}{weekTrend.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              vs last week
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-best-day">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Day</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-best-day">
              {maxPages}
            </div>
            <p className="text-xs text-muted-foreground">
              Pages in one day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simple Sparkline Visualization */}
      <Card data-testid="card-reading-chart">
        <CardHeader>
          <CardTitle>Daily Reading Pattern</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-end justify-between h-32 gap-1" data-testid="sparkline-chart">
              {sparkline.slice(-30).map((day, index) => {
                const chartMaxPages = Math.max(1, maxPages);
                const height = (day.pages / chartMaxPages) * 100;
                return (
                  <div
                    key={day.date}
                    className="bg-primary/20 hover:bg-primary/40 transition-colors flex-1 min-w-[2px] rounded-t"
                    style={{ height: `${Math.max(2, height)}%` }}
                    title={`${day.date}: ${day.pages} pages`}
                    data-testid={`bar-${index}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{sparkline.length > 30 ? format(new Date(sparkline[sparkline.length - 30].date), "MMM d") : format(new Date(sparkline[0]?.date || new Date()), "MMM d")}</span>
              <span>Last 30 days</span>
              <span>{format(new Date(sparkline[sparkline.length - 1]?.date || new Date()), "MMM d")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BreakdownTab({ data }: { data: StatsOverviewResponse }) {
  const { finishedBooks, totals, goals, range } = data;
  
  // Calculate actual days in selected range
  const fromDate = new Date(range.from);
  const toDate = new Date(range.to);
  const daysInRange = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  return (
    <div className="space-y-6">
      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-reading-efficiency">
          <CardHeader>
            <CardTitle>Reading Efficiency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Pages per session</span>
              <span className="font-medium" data-testid="text-pages-per-session">
                {totals.sessions > 0 ? (totals.pages / totals.sessions).toFixed(1) : '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Minutes per page</span>
              <span className="font-medium" data-testid="text-minutes-per-page">
                {totals.pages > 0 ? (totals.minutes / totals.pages).toFixed(1) : '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Session frequency</span>
              <span className="font-medium" data-testid="text-session-frequency">
                {(totals.sessions / daysInRange).toFixed(1)}/day
              </span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-goal-breakdown">
          <CardHeader>
            <CardTitle>Goal Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Daily target</span>
              <span className="font-medium" data-testid="text-daily-target">
                {goals.biteTargetPerDay} pages
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Progress to goal</span>
              <span className="font-medium" data-testid="text-goal-percentage">
                {goals.targetPages > 0 ? Math.round((totals.pages / goals.targetPages) * 100) : 0}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Pages remaining</span>
              <span className="font-medium" data-testid="text-pages-remaining">
                {Math.max(0, goals.targetPages - totals.pages).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Finished Books List */}
      <Card data-testid="card-all-finished-books">
        <CardHeader>
          <CardTitle>All Finished Books</CardTitle>
        </CardHeader>
        <CardContent>
          {finishedBooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books finished in this period</p>
          ) : (
            <div className="space-y-3">
              {finishedBooks.map((book, index) => (
                <div key={book.id} className="flex items-center justify-between p-3 rounded-lg border" data-testid={`detailed-book-${book.id}`}>
                  <div className="flex-1">
                    <div className="font-medium" data-testid={`detailed-book-title-${book.id}`}>
                      {book.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Reading pace: {book.avgPph.toFixed(1)} pages/hour
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="outline" data-testid={`detailed-badge-days-${book.id}`}>
                      {book.daysToFinish} days
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      #{index + 1} fastest
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Stats() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Format dates for API query
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const { data, isLoading, error } = useQuery<StatsOverviewResponse>({
    queryKey: ['/api/stats/overview', formatDate(dateRange.from), formatDate(dateRange.to)],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: formatDate(dateRange.from),
        to: formatDate(dateRange.to),
      });
      const response = await fetch(`/api/stats/overview?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      return response.json();
    },
  });

  if (error) {
    return (
      <div className="space-y-6" data-testid="page-stats">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Reading Statistics</h1>
          <p className="text-muted-foreground mt-1">
            Track your reading habits and achievements
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Failed to load statistics. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-stats">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Reading Statistics</h1>
          <p className="text-muted-foreground mt-1">
            Track your reading habits and achievements
          </p>
        </div>
        
        {/* Date Range Picker */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-auto justify-start text-left font-normal" data-testid="button-date-range">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 space-y-3">
              <div className="text-sm font-medium">Select date range</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDateRange({
                      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                      to: new Date(),
                    });
                    setCalendarOpen(false);
                  }}
                  data-testid="button-last-7-days"
                >
                  Last 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDateRange({
                      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                      to: new Date(),
                    });
                    setCalendarOpen(false);
                  }}
                  data-testid="button-last-30-days"
                >
                  Last 30 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDateRange({
                      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                      to: new Date(),
                    });
                    setCalendarOpen(false);
                  }}
                  data-testid="button-last-90-days"
                >
                  Last 90 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    setDateRange({
                      from: new Date(currentYear, 0, 1),
                      to: now,
                    });
                    setCalendarOpen(false);
                  }}
                  data-testid="button-this-year"
                >
                  This year
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : data ? (
        <Tabs defaultValue="overview" className="space-y-6" data-testid="tabs-stats">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-list">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
            <TabsTrigger value="breakdown" data-testid="tab-breakdown">Breakdown</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" data-testid="tab-content-overview">
            <OverviewTab data={data} />
          </TabsContent>
          
          <TabsContent value="trends" data-testid="tab-content-trends">
            <TrendsTab data={data} />
          </TabsContent>
          
          <TabsContent value="breakdown" data-testid="tab-content-breakdown">
            <BreakdownTab data={data} />
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}