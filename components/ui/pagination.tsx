import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  const getPageNumbers = () => {
    let pages = [];
    const showPages = 5;

    if (totalPages <= showPages) {
      // If total pages is less than or equal to showPages, show all pages
      pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // Calculate the start and end of the page window
      let start = Math.max(currentPage - 2, 1);
      let end = start + showPages - 1;

      // Adjust if end exceeds totalPages
      if (end > totalPages) {
        end = totalPages;
        start = Math.max(end - showPages + 1, 1);
      }

      pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 p-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {getPageNumbers().map(pageNum => (
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentPage === pageNum ? 'bg-black text-white' : 'hover:bg-gray-100'
          }`}
        >
          {pageNum}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-full disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Pagination;
