"use client";

import { useState, useCallback, useRef } from "react";
import {
  ChatRequest,
  SearchQuery,
  Citation,
  WebSearchResult,
} from "@/types/chat";

interface StreamResult {
  text: string;
  searchQueries: SearchQuery[];
  citations: Citation[];
  aborted?: boolean;
}

interface UseStreamResponseReturn {
  streamText: string;
  searchQueries: SearchQuery[];
  citations: Citation[];
  isStreaming: boolean;
  error: string | null;
  startStream: (request: ChatRequest) => Promise<StreamResult>;
  abortStream: () => void;
  resetStream: () => void;
  clearError: () => void;
}

export function useStreamResponse(): UseStreamResponseReturn {
  const [streamText, setStreamText] = useState("");
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetStream = useCallback(() => {
    setStreamText("");
    setSearchQueries([]);
    setCitations([]);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const startStream = useCallback(
    async (request: ChatRequest): Promise<StreamResult> => {
      // 이전 스트림 중단
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsStreaming(true);
      setError(null);
      setStreamText("");
      setSearchQueries([]);
      setCitations([]);

      let fullText = "";
      const queries: SearchQuery[] = [];
      const allCitations: Citation[] = [];

      // 현재 검색 쿼리 추적
      let currentSearchQuery: string | null = null;
      let currentSearchId: string | null = null;
      let partialJsonBuffer = ""; // partial JSON 누적 버퍼

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          // 구조화된 에러 응답을 JSON 문자열로 전달
          throw new Error(JSON.stringify(errorData));
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const event = JSON.parse(data);

                // content_block_start: 검색 쿼리 또는 검색 결과 시작
                if (event.type === "content_block_start") {
                  const block = event.content_block;

                  // server_tool_use: 검색 쿼리
                  if (block?.type === "server_tool_use" && block?.name === "web_search") {
                    currentSearchId = block.id;
                  }

                  // web_search_tool_result: 검색 결과
                  if (block?.type === "web_search_tool_result" && block?.content) {
                    const results: WebSearchResult[] = block.content
                      .filter((r: { type: string }) => r.type === "web_search_result")
                      .map((r: WebSearchResult) => ({
                        url: r.url,
                        title: r.title,
                        page_age: r.page_age,
                      }));

                    if (currentSearchQuery && results.length > 0) {
                      const query: SearchQuery = {
                        query: currentSearchQuery,
                        results,
                      };
                      queries.push(query);
                      setSearchQueries([...queries]);
                    }
                    currentSearchQuery = null;
                    currentSearchId = null;
                  }
                }

                // content_block_delta: 텍스트 또는 검색 쿼리 입력
                if (event.type === "content_block_delta") {
                  // 텍스트 델타
                  if (event.delta?.type === "text_delta" && event.delta?.text) {
                    fullText += event.delta.text;
                    setStreamText(fullText);

                    // citations 추출
                    if (event.delta.citations) {
                      for (const citation of event.delta.citations) {
                        if (citation.type === "web_search_result_location") {
                          allCitations.push(citation);
                          setCitations([...allCitations]);
                        }
                      }
                    }
                  }

                  // 검색 쿼리 입력 (input_json_delta)
                  if (event.delta?.type === "input_json_delta" && currentSearchId) {
                    partialJsonBuffer += event.delta.partial_json || "";
                    // 완전한 JSON인지 확인 후 파싱 시도
                    try {
                      const input = JSON.parse(partialJsonBuffer);
                      if (input.query) {
                        currentSearchQuery = input.query;
                      }
                    } catch {
                      // 아직 불완전한 JSON - 계속 누적
                    }
                  }
                }

                // content_block_stop: 블록 종료 시 버퍼 리셋
                if (event.type === "content_block_stop") {
                  partialJsonBuffer = "";
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        return { text: fullText, searchQueries: queries, citations: allCitations };
      } catch (err) {
        // Abort 에러는 정상 종료로 처리
        if (err instanceof Error && err.name === "AbortError") {
          return { text: fullText, searchQueries: queries, citations: allCitations, aborted: true };
        }
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    []
  );

  return {
    streamText,
    searchQueries,
    citations,
    isStreaming,
    error,
    startStream,
    abortStream,
    resetStream,
    clearError,
  };
}
