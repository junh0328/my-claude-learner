"use client";

import { useState } from "react";
import { useChat } from "@/hooks/useChat";
import { useApiKey } from "@/hooks/useApiKey";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ErrorBanner } from "./ErrorBanner";
import { InfoBanner } from "./InfoBanner";
import { ApiKeyDialog } from "./ApiKeyDialog";
import { Provider } from "@/types/chat";

export function ChatContainer() {
  const {
    selectedProvider,
    currentApiKey,
    needsAnyApiKey,
    isLoading: isLoadingApiKey,
    setApiKey,
    clearApiKey,
    hasApiKey,
    getFallbackApiKeys,
  } = useApiKey();

  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

  // 폴백용 API 키들 가져오기
  const fallbackApiKeys = getFallbackApiKeys();

  const {
    messages,
    isLoading,
    error,
    streamingContent,
    streamingSearchQueries,
    provider,
    webSearchEnabled,
    setWebSearchEnabled,
    sendMessage,
    stopGeneration,
    clearMessages,
    clearError,
    fallbackInfo,
    clearFallbackInfo,
  } = useChat({
    apiKey: currentApiKey,
    provider: selectedProvider,
    fallbackApiKeys,
  });

  // API 키가 필요한지 확인 (다이얼로그 자동 표시용)
  const shouldShowApiKeyDialog = isApiKeyDialogOpen || needsAnyApiKey;

  const handleApiKeySubmit = (providerKey: Provider, key: string) => {
    setApiKey(providerKey, key);
    setIsApiKeyDialogOpen(false);
  };

  const handleApiKeyDelete = (providerKey: Provider) => {
    clearApiKey(providerKey);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !needsAnyApiKey) {
      // 키가 하나라도 있으면 닫기 허용
      setIsApiKeyDialogOpen(false);
    } else if (open) {
      setIsApiKeyDialogOpen(true);
    }
    // 키가 하나도 없으면 닫지 않음
  };

  // API 키 로딩 중일 때 로딩 표시
  if (isLoadingApiKey) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <ApiKeyDialog
        open={shouldShowApiKeyDialog}
        onOpenChange={handleDialogOpenChange}
        onSubmit={handleApiKeySubmit}
        onDelete={handleApiKeyDelete}
        hasClaudeKey={hasApiKey("claude")}
        hasGeminiKey={hasApiKey("gemini")}
        hasGroqKey={hasApiKey("groq")}
      />

      <div className="flex h-screen flex-col bg-background">
        <ChatHeader
          onClear={clearMessages}
          onOpenApiKeySettings={() => setIsApiKeyDialogOpen(true)}
          messageCount={messages.length}
        />

        {error && <ErrorBanner error={error} onDismiss={clearError} />}

        {fallbackInfo?.occurred && (
          <InfoBanner
            message={`요청 한도 초과로 ${
              fallbackInfo.toProvider === "claude"
                ? "Claude"
                : fallbackInfo.toProvider === "groq"
                ? "Groq"
                : "Gemini"
            }로 자동 전환되었습니다.`}
            onDismiss={clearFallbackInfo}
          />
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            streamingContent={streamingContent}
            streamingSearchQueries={streamingSearchQueries}
            provider={provider}
          />
        </div>

        <ChatInput
          onSend={sendMessage}
          onStop={stopGeneration}
          isLoading={isLoading}
          provider={provider}
          webSearchEnabled={webSearchEnabled}
          onWebSearchChange={setWebSearchEnabled}
        />
      </div>
    </>
  );
}
