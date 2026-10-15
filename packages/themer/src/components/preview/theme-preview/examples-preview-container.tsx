// Wraps every preview tab body: the Suspense boundary (lazy demos suspend
// here, behind a skeleton and spinner) and the `@container` the demos' `@3xl:`
// style container queries resolve against.
import { Suspense } from "react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Spinner } from "@workspace/ui/components/spinner";
import { cn } from "@workspace/ui/lib/utils";

const LoadingSkeleton = () => (
  <div className="absolute inset-0 flex flex-col">
    <div className="flex flex-1 flex-col">
      <Skeleton className="w-full flex-1 opacity-50" />
    </div>

    <div className="absolute inset-0 flex items-center justify-center">
      <Spinner className="text-foreground/50 size-6" />
    </div>
  </div>
);

const ExamplesPreviewContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="@container mt-0 h-full w-full space-y-6">
        <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>
      </div>
    </div>
  );
};

export default ExamplesPreviewContainer;
