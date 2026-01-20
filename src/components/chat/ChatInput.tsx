"use client";

import { useState, useCallback, useRef, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClaudeModel, CLAUDE_MODELS } from "@/types/chat";

interface ChatInputProps {
  onSend: (content: string) => Promise<boolean>;
  onStop: () => void;
  isLoading: boolean;
  selectedModel: ClaudeModel;
  onModelChange: (model: ClaudeModel) => void;
  webSearchEnabled: boolean;
  onWebSearchChange: (enabled: boolean) => void;
}

export function ChatInput({
  onSend,
  onStop,
  isLoading,
  selectedModel,
  onModelChange,
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

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-4 mb-3">
          <Select
            value={selectedModel}
            onValueChange={(value) => onModelChange(value as ClaudeModel)}
          >
            <SelectTrigger className="w-auto gap-2 border-none bg-muted/50 hover:bg-muted px-3 py-1.5 h-auto text-sm font-medium">
              <SelectValue placeholder="모델 선택">
                {CLAUDE_MODELS.find((m) => m.id === selectedModel)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CLAUDE_MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id} className="py-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {model.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch
              id="web-search"
              checked={webSearchEnabled}
              onCheckedChange={onWebSearchChange}
            />
            <label
              htmlFor="web-search"
              className={`text-sm cursor-pointer select-none ${
                webSearchEnabled ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              웹 검색
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
              className="h-auto px-4"
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
