import { AddBookDialog } from '../add-book-dialog';

export default function AddBookDialogExample() {
  // todo: remove mock functionality
  const handleAddBook = (book: any) => {
    console.log('Book added:', book);
  };

  return (
    <div className="p-4">
      <AddBookDialog onAddBook={handleAddBook} />
    </div>
  );
}