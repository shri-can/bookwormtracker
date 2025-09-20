import { ReadingProgress } from '../reading-progress';

export default function ReadingProgressExample() {
  // todo: remove mock functionality
  const handleUpdateProgress = (id: string, newPage: number) => {
    console.log('Updated progress for book', id, 'to page', newPage);
  };

  return (
    <div className="max-w-md">
      <ReadingProgress
        id="1"
        title="Atomic Habits"
        author="James Clear"
        totalPages={320}
        currentPage={187}
        startedAt="2024-01-15"
        onUpdateProgress={handleUpdateProgress}
      />
    </div>
  );
}