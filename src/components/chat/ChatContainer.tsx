"use client";

import { useState, useCallback, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { useApiKey } from "@/hooks/useApiKey";
import { useHistory } from "@/hooks/useHistory";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ErrorBanner } from "./ErrorBanner";
import { InfoBanner } from "./InfoBanner";
import { ApiKeyDialog } from "./ApiKeyDialog";
import { HistorySidebar } from "./HistorySidebar";
import { Provider, Message } from "@/types/chat";

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

  const {
    sessions,
    currentSessionId,
    currentSession,
    createSession,
    updateSession,
    deleteSession,
    selectSession,
  } = useHistory();

  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // 폴백용 API 키들 가져오기
  const fallbackApiKeys = getFallbackApiKeys();

  // 메시지 변경 시 세션 업데이트
  const handleMessagesChange = useCallback(
    (messages: Message[]) => {
      if (currentSessionId && messages.length > 0) {
        updateSession(currentSessionId, messages);
      }
    },
    [currentSessionId, updateSession]
  );

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
    initialMessages: currentSession?.messages,
    onMessagesChange: handleMessagesChange,
  });

  // 앱 시작 시 세션이 없으면 자동 생성
  useEffect(() => {
    if (!isLoadingApiKey && !needsAnyApiKey && !currentSessionId && sessions.length === 0) {
      createSession(selectedProvider);
    }
  }, [isLoadingApiKey, needsAnyApiKey, currentSessionId, sessions.length, createSession, selectedProvider]);

  // 새 대화 시작 (대화 초기화 버튼)
  const handleNewSession = useCallback(() => {
    createSession(selectedProvider);
    clearMessages();
  }, [createSession, selectedProvider, clearMessages]);

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

      <HistorySidebar
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        onNewSession={handleNewSession}
      />

      <div className="flex h-screen flex-col bg-background">
        <ChatHeader
          onClear={handleNewSession}
          onOpenApiKeySettings={() => setIsApiKeyDialogOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
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
