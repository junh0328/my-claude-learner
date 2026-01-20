"use client";

import { cn } from "@/lib/utils";

interface LoadingDotsProps {
  className?: string;
}

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
      <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
      <span className="size-2 animate-bounce rounded-full bg-muted-foreground" />
    </div>
  );
}
