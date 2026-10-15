import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("bg-muted animate-pulse rounded-[10px]", className)}
      {...props}
    />
  );
}

export function AnswerSkeleton() {
  return (
    <div className="shadow-card relative flex w-full flex-col gap-3 overflow-clip rounded-2xl bg-white p-4">
      <div className="flex items-center gap-1.5">
        <Skeleton className="size-3.5 rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="ml-auto h-3 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex flex-col gap-2 pt-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-1.5 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="shadow-card relative flex w-full flex-col gap-3 overflow-clip rounded-2xl bg-white p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-[30px] rounded-[10px]" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-1.5 flex-1 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TilesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="shadow-card flex flex-col gap-3 rounded-2xl bg-white p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-12" />
        </div>
      ))}
    </div>
  );
}
