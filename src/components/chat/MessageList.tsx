"use client";

import { useEffect, useRef } from "react";
import { Message, SearchQuery } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { SearchResults } from "./SearchResults";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingDots } from "@/components/ui/loading-dots";

// Streaming text component with cursor effect
function StreamingText({ content }: { content: string }) {
  return (
    <div className="relative">
      <MarkdownRenderer content={content} />
      <span className="inline-block w-2 h-4 bg-current animate-pulse ml-0.5 align-middle" />
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  streamingContent: string;
  streamingSearchQueries?: SearchQuery[];
}

export function MessageList({
  messages,
  isLoading,
  streamingContent,
  streamingSearchQueries = [],
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, streamingSearchQueries]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">Claude와 대화를 시작하세요</p>
          <p className="text-sm mt-1">아래 입력창에 메시지를 입력해주세요</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full px-4" ref={scrollRef}>
      <div className="flex flex-col gap-4 py-4 max-w-3xl mx-auto">
        {messages.map((message, index) => {
          const isLastAssistant =
            message.role === "assistant" && index === messages.length - 1;
          const showStreaming = isLastAssistant && isLoading;

          return (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={showStreaming}
              streamingContent={showStreaming ? streamingContent : undefined}
            />
          );
        })}

        {/* Show streaming search results and content when waiting for response */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex flex-col">
            {/* 검색 결과 표시 */}
            {streamingSearchQueries.length > 0 && (
              <SearchResults searchQueries={streamingSearchQueries} />
            )}

            {/* 응답 또는 로딩 표시 */}
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl bg-bubble-assistant text-bubble-assistant-foreground px-4 py-3">
                {streamingContent ? (
                  <StreamingText content={streamingContent} />
                ) : (
                  <LoadingDots />
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
