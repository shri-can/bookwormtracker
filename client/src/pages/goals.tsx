import { useQuery } from "@tanstack/react-query";
import { ReadingGoals } from "@/components/reading-goals";
import type { Book } from "@shared/schema";

export default function Goals() {
  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ['/api/books'],
    queryFn: async () => {
      const response = await fetch('/api/books');
      if (!response.ok) throw new Error('Failed to fetch books');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <ReadingGoals books={books} />
    </div>
  );
}