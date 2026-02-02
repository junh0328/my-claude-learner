"use client";

import { useState, useCallback } from "react";
import {
  Message,
  AIModel,
  Provider,
  MODELS_BY_PROVIDER,
  SearchQuery,
  Citation,
  FallbackInfo,
} from "@/types/chat";
import { useStreamResponse } from "./useStreamResponse";

interface UseChatOptions {
  apiKey?: string | null;
  provider: Provider;
  fallbackApiKeys?: Partial<Record<Provider, string>>;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  streamingContent: string;
  streamingSearchQueries: SearchQuery[];
  streamingCitations: Citation[];
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  provider: Provider;
  setProvider: (provider: Provider) => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: (enabled: boolean) => void;
  sendMessage: (content: string) => Promise<boolean>;
  stopGeneration: () => void;
  clearMessages: () => void;
  clearError: () => void;
  fallbackInfo: FallbackInfo | null;
  clearFallbackInfo: () => void;
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const { apiKey, provider: initialProvider, fallbackApiKeys } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [selectedModel, setSelectedModel] = useState<AIModel>(
    MODELS_BY_PROVIDER[initialProvider][0].id
  );
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [fallbackInfo, setFallbackInfo] = useState<FallbackInfo | null>(null);

  const clearFallbackInfo = useCallback(() => {
    setFallbackInfo(null);
  }, []);

  const {
    streamText,
    searchQueries,
    citations,
    isStreaming,
    error,
    startStream,
    abortStream,
    resetStream,
    clearError,
  } = useStreamResponse();

  // Provider 변경 시 해당 provider의 첫 번째 모델로 자동 선택
  const handleSetProvider = useCallback((newProvider: Provider) => {
    setProvider(newProvider);
    const firstModel = MODELS_BY_PROVIDER[newProvider][0];
    if (firstModel) {
      setSelectedModel(firstModel.id);
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!content.trim() || isStreaming) return false;

      // Add user message
      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      resetStream();

      // Prepare messages for API (exclude IDs and createdAt)
      const apiMessages = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // 새 메시지 전송 시 이전 폴백 정보 초기화
      setFallbackInfo(null);

      // 폴백 허용 여부: 다른 provider의 API 키가 있는 경우
      const hasFallbackKeys = fallbackApiKeys && Object.keys(fallbackApiKeys).some(
        (p) => p !== provider && fallbackApiKeys[p as Provider]
      );

      try {
        const result = await startStream({
          messages: apiMessages,
          model: selectedModel,
          provider,
          webSearchEnabled: provider === "groq" ? false : webSearchEnabled,
          apiKey: apiKey || undefined,
          fallbackApiKeys,
          allowFallback: !!hasFallbackKeys,
        });

        // 중단된 경우 사용자 메시지 제거
        if (result.aborted) {
          setMessages((prev) => prev.slice(0, -1));
          return true; // aborted
        }

        // 폴백 정보 저장 및 provider/model 변경
        if (result.fallbackInfo?.occurred) {
          setFallbackInfo(result.fallbackInfo);
          // 폴백된 provider로 UI 상태 변경
          const newProvider = result.fallbackInfo.toProvider;
          setProvider(newProvider);
          const firstModel = MODELS_BY_PROVIDER[newProvider][0];
          if (firstModel) {
            setSelectedModel(firstModel.id);
          }
          // Groq로 폴백된 경우 웹 검색 비활성화
          if (newProvider === "groq") {
            setWebSearchEnabled(false);
          }
        }

        // Add assistant message after stream completes
        const assistantMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: result.text,
          createdAt: new Date(),
          searchQueries:
            result.searchQueries.length > 0 ? result.searchQueries : undefined,
          citations:
            result.citations.length > 0 ? result.citations : undefined,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        return false; // not aborted
      } catch {
        // Error is already handled by useStreamResponse
        return false;
      }
    },
    [
      messages,
      selectedModel,
      provider,
      webSearchEnabled,
      isStreaming,
      startStream,
      resetStream,
      apiKey,
      fallbackApiKeys,
    ]
  );

  const stopGeneration = useCallback(() => {
    abortStream();
  }, [abortStream]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    resetStream();
  }, [resetStream]);

  return {
    messages,
    isLoading: isStreaming,
    error,
    streamingContent: streamText,
    streamingSearchQueries: searchQueries,
    streamingCitations: citations,
    selectedModel,
    setSelectedModel,
    provider,
    setProvider: handleSetProvider,
    webSearchEnabled,
    setWebSearchEnabled,
    sendMessage,
    stopGeneration,
    clearMessages,
    clearError,
    fallbackInfo,
    clearFallbackInfo,
  };
}
