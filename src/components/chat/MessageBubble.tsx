"use client";

import { Message, Provider } from "@/types/chat";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { SearchResults } from "./SearchResults";
import { LoadingDots } from "@/components/ui/loading-dots";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamingContent?: string;
  provider?: Provider;
}

export function MessageBubble({
  message,
  isStreaming,
  streamingContent,
  provider = "claude",
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const displayContent =
    isStreaming && message.role === "assistant"
      ? streamingContent || ""
      : message.content;

  // Provider별 사용자 버블 색상
  const userBubbleColor = provider === "gemini"
    ? "bg-provider-gemini"
    : "bg-provider-claude";

  // 사용자 메시지
  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-white", userBubbleColor)}>
          <p className="whitespace-pre-wrap break-words">{displayContent}</p>
        </div>
      </div>
    );
  }

  // AI 메시지
  return (
    <div className="flex flex-col w-full">
      {/* 검색 결과 표시 (저장된 메시지용) */}
      {message.searchQueries && message.searchQueries.length > 0 && (
        <SearchResults searchQueries={message.searchQueries} />
      )}

      {/* 메시지 내용 */}
      <div className="flex justify-start">
        <div
          className={cn(
            "max-w-[85%] rounded-2xl px-4 py-3",
            "bg-bubble-assistant text-bubble-assistant-foreground"
          )}
        >
          {displayContent ? (
            <MarkdownRenderer content={displayContent} />
          ) : isStreaming ? (
            <LoadingDots />
          ) : null}
        </div>
      </div>

      {/* Citations 표시 */}
      {message.citations && message.citations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {message.citations.slice(0, 5).map((citation, index) => (
            <a
              key={index}
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="bg-muted px-2 py-0.5 rounded">
                [{index + 1}] {citation.title.slice(0, 30)}
                {citation.title.length > 30 ? "..." : ""}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
