
import { Skeleton } from "@/components/ui/skeleton";

const POSTS_PER_PAGE = 6; // Consistent with home page

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="flex justify-center mb-12">
        <Skeleton className="h-10 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(POSTS_PER_PAGE)].map((_, index) => (
          <div key={index} className="flex flex-col space-y-3 p-4 border rounded-lg bg-card shadow">
            <Skeleton className="h-[200px] w-full rounded-xl" />
            <div className="space-y-2 pt-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center items-center space-x-4 mt-12">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

    