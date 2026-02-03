"use client";

import { useState, useCallback, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Provider } from "@/types/chat";

interface ChatInputProps {
  onSend: (content: string) => Promise<boolean>;
  onStop: () => void;
  isLoading: boolean;
  provider: Provider;
  webSearchEnabled: boolean;
  onWebSearchChange: (enabled: boolean) => void;
}

export function ChatInput({
  onSend,
  onStop,
  isLoading,
  provider,
  webSearchEnabled,
  onWebSearchChange,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const pendingInputRef = useRef<string>("");

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    pendingInputRef.current = input;
    setInput("");
    const aborted = await onSend(input);
    if (aborted) {
      setInput(pendingInputRef.current);
    }
    pendingInputRef.current = "";
  }, [input, isLoading, onSend]);

  const handleStop = useCallback(() => {
    onStop();
  }, [onStop]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const providerColorMap: Record<Provider, string> = {
    claude: "bg-provider-claude hover:bg-provider-claude/90",
    gemini: "bg-provider-gemini hover:bg-provider-gemini/90",
    groq: "bg-provider-groq hover:bg-provider-groq/90",
  };
  const providerColor = providerColorMap[provider];

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-4 mb-3">
          {/* 웹 검색 토글 */}
          <div className="flex items-center gap-2">
            <Switch
              id="web-search"
              checked={webSearchEnabled && provider !== "groq"}
              onCheckedChange={onWebSearchChange}
              disabled={provider === "groq"}
              className={
                provider === "gemini"
                  ? "data-[state=checked]:bg-provider-gemini hover:data-[state=checked]:bg-provider-gemini/90"
                  : provider === "groq"
                  ? "opacity-50 cursor-not-allowed"
                  : "data-[state=checked]:bg-provider-claude hover:data-[state=checked]:bg-provider-claude/90"
              }
            />
            <label
              htmlFor="web-search"
              className={`text-sm cursor-pointer select-none ${
                provider === "groq"
                  ? "text-muted-foreground/50"
                  : webSearchEnabled
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              웹 검색{provider === "groq" && " (미지원)"}
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
            className="min-h-[60px] max-h-[60px] resize-none overflow-y-auto [field-sizing:fixed]"
            disabled={isLoading}
          />
          {isLoading ? (
            <Button
              onClick={handleStop}
              variant="secondary"
              className="h-auto px-4"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <rect x="64" y="64" width="128" height="128" rx="8" />
              </svg>
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`h-auto px-4 ${providerColor} disabled:opacity-40`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z" />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
