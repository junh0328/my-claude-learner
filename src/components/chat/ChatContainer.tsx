"use client";

import { useState, useRef, useEffect } from "react";
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
    setSelectedProvider,
    currentApiKey,
    needsApiKey,
    isLoading: isLoadingApiKey,
    setApiKey,
    clearApiKey,
    hasApiKey,
    getFallbackApiKeys,
  } = useApiKey();

  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  // Provider 변경 시 이전 provider 저장 (다이얼로그 취소 시 복원용)
  const previousProviderRef = useRef<Provider | null>(null);

  // 폴백용 API 키들 가져오기
  const fallbackApiKeys = getFallbackApiKeys();

  const {
    messages,
    isLoading,
    error,
    streamingContent,
    streamingSearchQueries,
    selectedModel,
    setSelectedModel,
    provider,
    setProvider,
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
  const shouldShowApiKeyDialog = isApiKeyDialogOpen || needsApiKey(selectedProvider);

  // 폴백으로 인해 provider가 변경되면 useApiKey의 selectedProvider도 동기화
  useEffect(() => {
    if (provider !== selectedProvider) {
      setSelectedProvider(provider);
    }
  }, [provider, selectedProvider, setSelectedProvider]);

  // Provider 변경 시 useChat과 useApiKey 동기화
  const handleProviderChange = (newProvider: Provider) => {
    // 새 provider에 API 키가 없으면 이전 provider 저장 후 다이얼로그 열기
    if (needsApiKey(newProvider)) {
      previousProviderRef.current = selectedProvider;
      setSelectedProvider(newProvider);
      setProvider(newProvider);
      setIsApiKeyDialogOpen(true);
    } else {
      previousProviderRef.current = null;
      setSelectedProvider(newProvider);
      setProvider(newProvider);
    }
  };

  const handleApiKeySubmit = (providerKey: Provider, key: string) => {
    setApiKey(providerKey, key);
    // 저장한 provider로 전환하고 다이얼로그 닫기
    if (providerKey !== selectedProvider) {
      setSelectedProvider(providerKey);
      setProvider(providerKey);
    }
    previousProviderRef.current = null;
    setIsApiKeyDialogOpen(false);
  };

  const handleApiKeyDelete = (providerKey: Provider) => {
    clearApiKey(providerKey);
    if (providerKey === selectedProvider) {
      clearMessages();
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      // 다이얼로그 닫기 시
      if (needsApiKey(selectedProvider) && previousProviderRef.current && hasApiKey(previousProviderRef.current)) {
        // 현재 provider에 키가 없고, 이전 provider가 있고, 이전 provider에 키가 있으면 복원
        setSelectedProvider(previousProviderRef.current);
        setProvider(previousProviderRef.current);
        previousProviderRef.current = null;
        setIsApiKeyDialogOpen(false);
      } else if (!needsApiKey(selectedProvider)) {
        // 현재 provider에 키가 있으면 그냥 닫기
        previousProviderRef.current = null;
        setIsApiKeyDialogOpen(false);
      }
      // 그 외의 경우(둘 다 키 없음)는 닫지 않음
    } else {
      setIsApiKeyDialogOpen(true);
    }
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
          selectedProvider={provider}
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
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          selectedProvider={provider}
          onProviderChange={handleProviderChange}
          webSearchEnabled={webSearchEnabled}
          onWebSearchChange={setWebSearchEnabled}
        />
      </div>
    </>
  );
}
