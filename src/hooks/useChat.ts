"use client";

import { useState, useCallback } from "react";
import { Message, ClaudeModel, CLAUDE_MODELS, SearchQuery, Citation } from "@/types/chat";
import { useStreamResponse } from "./useStreamResponse";

interface UseChatOptions {
  apiKey?: string | null;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  streamingContent: string;
  streamingSearchQueries: SearchQuery[];
  streamingCitations: Citation[];
  selectedModel: ClaudeModel;
  setSelectedModel: (model: ClaudeModel) => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: (enabled: boolean) => void;
  sendMessage: (content: string) => Promise<boolean>;
  stopGeneration: () => void;
  clearMessages: () => void;
  clearError: () => void;
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { apiKey } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<ClaudeModel>(
    CLAUDE_MODELS[0].id
  );
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

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

      try {
        const result = await startStream({
          messages: apiMessages,
          model: selectedModel,
          webSearchEnabled,
          apiKey: apiKey || undefined,
        });

        // 중단된 경우 사용자 메시지 제거
        if (result.aborted) {
          setMessages((prev) => prev.slice(0, -1));
          return true; // aborted
        }

        // Add assistant message after stream completes
        const assistantMessage: Message = {
          id: generateId(),
          role: "assistant",
          content: result.text,
          createdAt: new Date(),
          searchQueries: result.searchQueries.length > 0 ? result.searchQueries : undefined,
          citations: result.citations.length > 0 ? result.citations : undefined,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        return false; // not aborted
      } catch {
        // Error is already handled by useStreamResponse
        return false;
      }
    },
    [messages, selectedModel, webSearchEnabled, isStreaming, startStream, resetStream, apiKey]
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
    webSearchEnabled,
    setWebSearchEnabled,
    sendMessage,
    stopGeneration,
    clearMessages,
    clearError,
  };
}
