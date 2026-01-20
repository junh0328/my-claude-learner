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
import { AIModel, Provider, MODELS_BY_PROVIDER } from "@/types/chat";

interface ChatInputProps {
  onSend: (content: string) => Promise<boolean>;
  onStop: () => void;
  isLoading: boolean;
  selectedModel: AIModel;
  onModelChange: (model: AIModel) => void;
  selectedProvider: Provider;
  onProviderChange: (provider: Provider) => void;
  webSearchEnabled: boolean;
  onWebSearchChange: (enabled: boolean) => void;
}

// Gemini Sparkle SVG 컴포넌트
function GeminiIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 28 28"
      className={className}
      fill="currentColor"
    >
      <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z" />
    </svg>
  );
}

// Claude 아이콘 컴포넌트
function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M11.376 24L10.776 23.544L10.44 22.8L10.776 21.312L11.16 19.392L11.472 17.856L11.76 15.96L11.928 15.336L11.904 15.288L11.784 15.312L10.344 17.28L8.16 20.232L6.432 22.056L6.024 22.224L5.304 21.864L5.376 21.192L5.784 20.616L8.16 17.568L9.6 15.672L10.536 14.592L10.512 14.448H10.464L4.128 18.576L3 18.72L2.496 18.264L2.568 17.52L2.808 17.28L4.704 15.96L9.432 13.32L9.504 13.08L9.432 12.96H9.192L8.4 12.912L5.712 12.84L3.384 12.744L1.104 12.624L0.528 12.504L0 11.784L0.048 11.424L0.528 11.112L1.224 11.16L2.736 11.28L5.016 11.424L6.672 11.52L9.12 11.784H9.504L9.552 11.616L9.432 11.52L9.336 11.424L6.96 9.84L4.416 8.16L3.072 7.176L2.352 6.672L1.992 6.216L1.848 5.208L2.496 4.488L3.384 4.56L3.6 4.608L4.488 5.304L6.384 6.768L8.88 8.616L9.24 8.904L9.408 8.808V8.736L9.24 8.472L7.896 6.024L6.456 3.528L5.808 2.496L5.64 1.872C5.576 1.656 5.544 1.416 5.544 1.152L6.288 0.144001L6.696 0L7.704 0.144001L8.112 0.504001L8.736 1.92L9.72 4.152L11.28 7.176L11.736 8.088L11.976 8.904L12.072 9.168H12.24V9.024L12.36 7.296L12.6 5.208L12.84 2.52L12.912 1.752L13.296 0.840001L14.04 0.360001L14.616 0.624001L15.096 1.32L15.024 1.752L14.76 3.6L14.184 6.504L13.824 8.472H14.04L14.28 8.208L15.264 6.912L16.92 4.848L17.64 4.032L18.504 3.12L19.056 2.688H20.088L20.832 3.816L20.496 4.992L19.44 6.336L18.552 7.464L17.28 9.168L16.512 10.536L16.584 10.632H16.752L19.608 10.008L21.168 9.744L22.992 9.432L23.832 9.816L23.928 10.2L23.592 11.016L21.624 11.496L19.32 11.952L15.888 12.768L15.84 12.792L15.888 12.864L17.424 13.008L18.096 13.056H19.728L22.752 13.272L23.544 13.8L24 14.424L23.928 14.928L22.704 15.528L21.072 15.144L17.232 14.232L15.936 13.92H15.744V14.016L16.848 15.096L18.84 16.896L21.36 19.224L21.48 19.8L21.168 20.28L20.832 20.232L18.624 18.552L17.76 17.808L15.84 16.2H15.72V16.368L16.152 17.016L18.504 20.544L18.624 21.624L18.456 21.96L17.832 22.176L17.184 22.056L15.792 20.136L14.376 17.952L13.224 16.008L13.104 16.104L12.408 23.352L12.096 23.712L11.376 24Z" />
    </svg>
  );
}

export function ChatInput({
  onSend,
  onStop,
  isLoading,
  selectedModel,
  onModelChange,
  selectedProvider,
  onProviderChange,
  webSearchEnabled,
  onWebSearchChange,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const pendingInputRef = useRef<string>("");

  const models = MODELS_BY_PROVIDER[selectedProvider];

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

  const handleProviderChange = useCallback(
    (provider: Provider) => {
      onProviderChange(provider);
      // Provider 변경 시 해당 provider의 첫 번째 모델로 자동 선택
      const firstModel = MODELS_BY_PROVIDER[provider][0];
      if (firstModel) {
        onModelChange(firstModel.id);
      }
    },
    [onProviderChange, onModelChange]
  );

  const providerColor = selectedProvider === "claude"
    ? "bg-provider-claude"
    : "bg-provider-gemini";

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-4 mb-3">
          {/* Provider 선택 버튼 그룹 */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => handleProviderChange("claude")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedProvider === "claude"
                  ? "bg-provider-claude text-white"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              }`}
            >
              <ClaudeIcon className={`size-3.5 ${
                selectedProvider === "claude" ? "text-white" : "text-provider-claude"
              }`} />
              Claude
            </button>
            <button
              type="button"
              onClick={() => handleProviderChange("gemini")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedProvider === "gemini"
                  ? "bg-provider-gemini text-white"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground"
              }`}
            >
              <GeminiIcon className={`size-3.5 ${
                selectedProvider === "gemini" ? "text-white" : "text-provider-gemini"
              }`} />
              Gemini
            </button>
          </div>

          {/* 모델 선택 */}
          <Select
            value={selectedModel}
            onValueChange={(value) => onModelChange(value as AIModel)}
          >
            <SelectTrigger className="w-auto gap-2 border-none bg-muted/50 hover:bg-muted px-3 py-1.5 h-auto text-sm font-medium">
              <SelectValue placeholder="모델 선택">
                {models.find((m) => m.id === selectedModel)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
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

          {/* 웹 검색 토글 */}
          <div className="flex items-center gap-2">
            <Switch
              id="web-search"
              checked={webSearchEnabled}
              onCheckedChange={onWebSearchChange}
              className={
                selectedProvider === "gemini"
                  ? "data-[state=checked]:bg-provider-gemini hover:data-[state=checked]:bg-provider-gemini/90"
                  : "data-[state=checked]:bg-provider-claude hover:data-[state=checked]:bg-provider-claude/90"
              }
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
              className={`h-auto px-4 ${providerColor} hover:opacity-90`}
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
