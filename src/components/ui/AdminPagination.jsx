import { ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminPagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const renderPageNumbers = () => {
    let pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages = [1, 2, 3, 4, 5];
      } else if (currentPage >= totalPages - 2) {
        pages = [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
      }
    }

    return pages.map(page => (
      <button
        key={page}
        onClick={() => onPageChange(page)}
        className={`w-7 h-7 flex items-center justify-center text-[10px] font-bold tracking-wider transition-all border ${
          currentPage === page
            ? "border-accent bg-accent/10 text-accent"
            : "border-transparent text-zinc-500 hover:text-white hover:border-zinc-800"
        }`}
      >
        {page}
      </button>
    ));
  };

  return (
    <div className="flex items-center justify-between border-t border-zinc-900 bg-zinc-950/40 p-4 select-none">
      <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 border border-transparent hover:border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-zinc-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 px-2">
          {renderPageNumbers()}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 border border-transparent hover:border-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-zinc-400 hover:text-white"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
