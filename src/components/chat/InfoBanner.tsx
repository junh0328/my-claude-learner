"use client";

import { Button } from "@/components/ui/button";

interface InfoBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function InfoBanner({ message, onDismiss }: InfoBannerProps) {
  return (
    <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="text-blue-500 shrink-0">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="flex-1 text-sm text-foreground">{message}</p>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
