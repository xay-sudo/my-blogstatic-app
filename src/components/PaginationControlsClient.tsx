
'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface PaginationControlsClientProps {
  currentPage: number;
  totalPages: number;
  currentSearchTerm?: string; // To preserve search term during pagination
}

export default function PaginationControlsClient({
  currentPage,
  totalPages,
  currentSearchTerm,
}: PaginationControlsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams(); // To get other existing params

  if (totalPages <= 1) {
    return null;
  }

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('page', page.toString());
    if (currentSearchTerm) {
      newParams.set('search', currentSearchTerm);
    } else {
      newParams.delete('search'); // Remove search if it's empty/undefined
    }
    router.push(`/?${newParams.toString()}`);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex justify-center items-center space-x-4 mt-12">
      <Button
        variant="outline"
        onClick={handlePrevious}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" />
        Previous
      </Button>
      <span className="text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        Next
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}

    