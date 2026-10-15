import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "shadow-card relative flex w-full flex-col overflow-clip rounded-2xl bg-white",
        className
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2 p-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("border-card-border flex flex-wrap items-center gap-2 border-t p-4", className)}
      {...props}
    />
  );
}
