"use client";

import { useState, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { useApiKey } from "@/hooks/useApiKey";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ErrorBanner } from "./ErrorBanner";
import { ApiKeyDialog } from "./ApiKeyDialog";

export function ChatContainer() {
  const { apiKey, needsApiKey, isLoading: isLoadingApiKey, setApiKey, clearApiKey } = useApiKey();
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

  const {
    messages,
    isLoading,
    error,
    streamingContent,
    streamingSearchQueries,
    selectedModel,
    setSelectedModel,
    webSearchEnabled,
    setWebSearchEnabled,
    sendMessage,
    stopGeneration,
    clearMessages,
    clearError,
  } = useChat({ apiKey });

  // API 키가 필요하면 자동으로 다이얼로그 열기
  useEffect(() => {
    if (needsApiKey) {
      setIsApiKeyDialogOpen(true);
    }
  }, [needsApiKey]);

  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
    setIsApiKeyDialogOpen(false);
  };

  const handleApiKeyDelete = () => {
    clearApiKey();
    clearMessages();
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
        open={isApiKeyDialogOpen}
        onOpenChange={setIsApiKeyDialogOpen}
        onSubmit={handleApiKeySubmit}
        onDelete={handleApiKeyDelete}
        hasExistingKey={!!apiKey}
      />

      <div className="flex h-screen flex-col bg-background">
        <ChatHeader
          onClear={clearMessages}
          onOpenApiKeySettings={() => setIsApiKeyDialogOpen(true)}
          messageCount={messages.length}
        />

        {error && <ErrorBanner error={error} onDismiss={clearError} />}

        <div className="flex-1 min-h-0 overflow-hidden">
          <MessageList
            messages={messages}
            isLoading={isLoading}
            streamingContent={streamingContent}
            streamingSearchQueries={streamingSearchQueries}
          />
        </div>

        <ChatInput
          onSend={sendMessage}
          onStop={stopGeneration}
          isLoading={isLoading}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          webSearchEnabled={webSearchEnabled}
          onWebSearchChange={setWebSearchEnabled}
        />
      </div>
    </>
  );
}
