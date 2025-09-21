import { BookCard } from '../book-card';

export default function BookCardExample() {
  // todo: remove mock functionality
  const handleStartReading = (id: string) => {
    console.log('Start reading book:', id);
  };

  const handleViewDetails = (id: string) => {
    console.log('View details for book:', id);
  };

  const handleDelete = (id: string) => {
    console.log('Delete book:', id);
  };

  return (
    <div className="max-w-sm">
      <BookCard
        id="1"
        title="The Design of Everyday Things"
        author="Don Norman"
        genre="Design"
        topics={["Design", "UX", "Psychology"]}
        tags={["Essential", "Design Thinking"]}
        status="reading"
        priority={4}
        format="paper"
        language="English"
        progress={0.34}
        usefulness="Learning user experience principles and design thinking"
        totalPages={368}
        currentPage={125}
        addedAt={new Date()}
        lastReadAt={new Date()}
        notes={["Great insights on design psychology"]}
        startedAt={new Date()}
        completedAt={null}
        coverUrl={null}
        isCurrentlyReading={true}
        onStartReading={handleStartReading}
        onViewDetails={handleViewDetails}
        onDelete={handleDelete}
      />
    </div>
  );
}