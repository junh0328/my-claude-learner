"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ErrorBannerProps {
  error: string;
  onDismiss?: () => void;
}

interface ParsedError {
  type: string;
  message: string;
  errorCode?: string;
}

function parseError(error: string): ParsedError {
  try {
    const parsed = JSON.parse(error);
    return {
      type: parsed.type || "error",
      message: parsed.message || error,
      errorCode: parsed.errorCode,
    };
  } catch {
    return {
      type: "error",
      message: error,
    };
  }
}

function getErrorIcon(type: string) {
  switch (type) {
    case "rate_limit_error":
      return (
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "authentication_error":
      return (
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
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      );
    case "overloaded_error":
      return (
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
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      );
    default:
      return (
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
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );
  }
}

function getErrorLabel(type: string): string {
  switch (type) {
    case "rate_limit_error":
      return "요청 한도 초과";
    case "authentication_error":
      return "인증 오류";
    case "invalid_request_error":
      return "잘못된 요청";
    case "overloaded_error":
      return "서버 과부하";
    case "api_error":
      return "API 오류";
    default:
      return "오류";
  }
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  const [showDetails, setShowDetails] = useState(false);
  const parsed = parseError(error);

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="text-destructive shrink-0 mt-0.5">
            {getErrorIcon(parsed.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-destructive">
                {getErrorLabel(parsed.type)}
              </span>
              {parsed.errorCode && (
                <span className="text-xs text-muted-foreground">
                  #{parsed.errorCode.slice(-8)}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground mt-0.5">{parsed.message}</p>
            {parsed.type === "rate_limit_error" && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-muted-foreground hover:text-foreground mt-1 underline"
              >
                {showDetails ? "상세 정보 숨기기" : "상세 정보 보기"}
              </button>
            )}
            {showDetails && (
              <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                분당 입력 토큰 한도에 도달했습니다. 메시지 길이를 줄이거나 잠시
                후 다시 시도해주세요.
              </p>
            )}
          </div>
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
