import { useQuery } from '@tanstack/react-query';
import type { ReadingSession } from '@shared/schema';

interface SessionFilters {
  state?: string;
  sessionType?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export function useBookSessions(bookId: string, filters?: SessionFilters) {
  return useQuery({
    queryKey: ['bookSessions', bookId, filters],
    queryFn: async (): Promise<ReadingSession[]> => {
      const params = new URLSearchParams();
      if (filters?.state) params.append('state', filters.state);
      if (filters?.sessionType) params.append('sessionType', filters.sessionType);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const url = `/api/books/${bookId}/sessions?${params.toString()}`;
      console.log('Fetching book sessions from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch book sessions');
      }
      
      const data = await response.json();
      console.log('Book sessions response:', data);
      return data.map((session: any) => ({
        ...session,
        startedAt: new Date(session.startedAt),
        sessionDate: new Date(session.sessionDate),
        pausedAt: session.pausedAt ? new Date(session.pausedAt) : null,
        resumedAt: session.resumedAt ? new Date(session.resumedAt) : null,
        endedAt: session.endedAt ? new Date(session.endedAt) : null,
      })) as ReadingSession[];
    },
    enabled: !!bookId,
  });
}
