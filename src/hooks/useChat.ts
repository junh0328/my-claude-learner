"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Message,
  AIModel,
  Provider,
  DEFAULT_MODELS,
  SearchQuery,
  Citation,
  FallbackInfo,
} from "@/types/chat";
import { useStreamResponse } from "./useStreamResponse";

interface UseChatOptions {
  apiKey?: string | null;
  provider: Provider;
  fallbackApiKeys?: Partial<Record<Provider, string>>;
  initialMessages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  streamingContent: string;
  streamingSearchQueries: SearchQuery[];
  streamingCitations: Citation[];
  selectedModel: AIModel;
  provider: Provider;
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
  const {
    apiKey,
    provider: initialProvider,
    fallbackApiKeys,
    initialMessages,
    onMessagesChange,
  } = options;
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [selectedModel, setSelectedModel] = useState<AIModel>(
    DEFAULT_MODELS[initialProvider]
  );
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [fallbackInfo, setFallbackInfo] = useState<FallbackInfo | null>(null);

  const clearFallbackInfo = useCallback(() => {
    setFallbackInfo(null);
  }, []);

  // onMessagesChange 참조를 ref로 저장 (dependency 문제 방지)
  const onMessagesChangeRef = useRef(onMessagesChange);
  onMessagesChangeRef.current = onMessagesChange;

  // initialMessages의 첫 메시지 ID를 추적하여 세션 전환 감지
  const initialMessagesIdRef = useRef<string | null>(null);

  // initialProvider 변경 시 내부 상태 동기화
  useEffect(() => {
    setProvider(initialProvider);
    setSelectedModel(DEFAULT_MODELS[initialProvider]);
  }, [initialProvider]);

  // initialMessages 변경 시 messages 동기화 (세션 전환 시)
  useEffect(() => {
    if (initialMessages) {
      // 첫 메시지 ID로 세션 전환 감지 (같은 세션이면 업데이트 안 함)
      const newFirstId = initialMessages[0]?.id || null;
      if (newFirstId !== initialMessagesIdRef.current) {
        initialMessagesIdRef.current = newFirstId;
        setMessages(initialMessages);
      }
    } else {
      // initialMessages가 없으면 빈 배열로 초기화
      if (initialMessagesIdRef.current !== null) {
        initialMessagesIdRef.current = null;
        setMessages([]);
      }
    }
  }, [initialMessages]);

  // messages 변경 시 onMessagesChange 콜백 호출
  useEffect(() => {
    if (onMessagesChangeRef.current && messages.length > 0) {
      onMessagesChangeRef.current(messages);
    }
  }, [messages]);

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

      // 현재 provider에 맞는 API 키 결정
      // 폴백 후에는 provider가 변경될 수 있으므로 fallbackApiKeys에서 찾음
      const effectiveApiKey = fallbackApiKeys?.[provider] || apiKey || undefined;

      try {
        const result = await startStream({
          messages: apiMessages,
          model: selectedModel,
          provider,
          webSearchEnabled: provider === "groq" ? false : webSearchEnabled,
          apiKey: effectiveApiKey,
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
          setSelectedModel(DEFAULT_MODELS[newProvider]);
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
    provider,
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
