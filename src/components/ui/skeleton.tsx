import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-card-elevated motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
