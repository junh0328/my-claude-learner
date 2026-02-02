"use client";

import { useState, useCallback, useRef } from "react";
import {
  ChatRequest,
  SearchQuery,
  Citation,
  WebSearchResult,
  Provider,
  FallbackInfo,
  FALLBACK_CHAIN,
  MODELS_BY_PROVIDER,
} from "@/types/chat";

interface StreamResult {
  text: string;
  searchQueries: SearchQuery[];
  citations: Citation[];
  aborted?: boolean;
  fallbackInfo?: FallbackInfo;
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

// Gemini 검색 결과 타입
interface GeminiGroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

interface GeminiGroundingSupport {
  segment?: {
    text?: string;
  };
  groundingChunkIndices?: number[];
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

  // Claude 스트림 파싱
  const parseClaudeStream = useCallback(
    async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
      decoder: TextDecoder,
      onText: (text: string) => void,
      onSearchQuery: (query: SearchQuery) => void,
      onCitation: (citation: Citation) => void
    ): Promise<{ fullText: string; queries: SearchQuery[]; allCitations: Citation[] }> => {
      let buffer = "";
      let fullText = "";
      const queries: SearchQuery[] = [];
      const allCitations: Citation[] = [];

      let currentSearchQuery: string | null = null;
      let currentSearchId: string | null = null;
      let partialJsonBuffer = "";

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

              if (event.type === "content_block_start") {
                const block = event.content_block;

                if (block?.type === "server_tool_use" && block?.name === "web_search") {
                  currentSearchId = block.id;
                }

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
                    onSearchQuery(query);
                  }
                  currentSearchQuery = null;
                  currentSearchId = null;
                }
              }

              if (event.type === "content_block_delta") {
                if (event.delta?.type === "text_delta" && event.delta?.text) {
                  fullText += event.delta.text;
                  onText(fullText);

                  if (event.delta.citations) {
                    for (const citation of event.delta.citations) {
                      if (citation.type === "web_search_result_location") {
                        allCitations.push(citation);
                        onCitation(citation);
                      }
                    }
                  }
                }

                if (event.delta?.type === "input_json_delta" && currentSearchId) {
                  partialJsonBuffer += event.delta.partial_json || "";
                  try {
                    const input = JSON.parse(partialJsonBuffer);
                    if (input.query) {
                      currentSearchQuery = input.query;
                    }
                  } catch {
                    // 아직 불완전한 JSON
                  }
                }
              }

              if (event.type === "content_block_stop") {
                partialJsonBuffer = "";
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      return { fullText, queries, allCitations };
    },
    []
  );

  // Gemini 스트림 파싱
  const parseGeminiStream = useCallback(
    async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
      decoder: TextDecoder,
      onText: (text: string) => void,
      onSearchQuery: (query: SearchQuery) => void,
      onCitation: (citation: Citation) => void
    ): Promise<{ fullText: string; queries: SearchQuery[]; allCitations: Citation[] }> => {
      let buffer = "";
      let fullText = "";
      const queries: SearchQuery[] = [];
      const allCitations: Citation[] = [];
      const processedChunkUrls = new Set<string>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data);

              // 텍스트 추출
              const parts = event.candidates?.[0]?.content?.parts;
              if (parts) {
                for (const part of parts) {
                  if (part.text) {
                    fullText += part.text;
                    onText(fullText);
                  }
                }
              }

              // Grounding metadata 처리
              const groundingMetadata = event.candidates?.[0]?.groundingMetadata;
              if (groundingMetadata) {
                const chunks: GeminiGroundingChunk[] = groundingMetadata.groundingChunks || [];
                const supports: GeminiGroundingSupport[] = groundingMetadata.groundingSupports || [];

                // 검색 결과 추출
                if (chunks.length > 0) {
                  const newResults: WebSearchResult[] = [];
                  for (const chunk of chunks) {
                    if (chunk.web && !processedChunkUrls.has(chunk.web.uri)) {
                      processedChunkUrls.add(chunk.web.uri);
                      newResults.push({
                        url: chunk.web.uri,
                        title: chunk.web.title,
                      });
                    }
                  }

                  if (newResults.length > 0) {
                    const query: SearchQuery = {
                      query: "Google Search",
                      results: newResults,
                    };
                    queries.push(query);
                    onSearchQuery(query);
                  }
                }

                // Citation 추출
                for (const support of supports) {
                  if (support.segment?.text && support.groundingChunkIndices) {
                    for (const idx of support.groundingChunkIndices) {
                      const chunk = chunks[idx];
                      if (chunk?.web) {
                        const citation: Citation = {
                          type: "web_search_result_location",
                          url: chunk.web.uri,
                          title: chunk.web.title,
                          cited_text: support.segment.text,
                        };
                        allCitations.push(citation);
                        onCitation(citation);
                      }
                    }
                  }
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      return { fullText, queries, allCitations };
    },
    []
  );

  // Groq (OpenAI 호환 형식) 스트림 파싱
  const parseGroqStream = useCallback(
    async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
      decoder: TextDecoder,
      onText: (text: string) => void
    ): Promise<{ fullText: string; queries: SearchQuery[]; allCitations: Citation[] }> => {
      let buffer = "";
      let fullText = "";
      const queries: SearchQuery[] = [];
      const allCitations: Citation[] = [];

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
            if (!data) continue;

            try {
              const event = JSON.parse(data);
              const content = event.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                onText(fullText);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      return { fullText, queries, allCitations };
    },
    []
  );

  const startStream = useCallback(
    async (request: ChatRequest): Promise<StreamResult> => {
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
      let queries: SearchQuery[] = [];
      let allCitations: Citation[] = [];
      let fallbackInfo: FallbackInfo | undefined;

      // 스트림 시도 함수 (체인 폴백 지원)
      const attemptStream = async (
        req: ChatRequest,
        attemptedProviders: Provider[] = []
      ): Promise<StreamResult> => {
        const provider: Provider = req.provider;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...req,
            allowFallback: false, // API에서는 폴백 처리하지 않음
          }),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          const is429 =
            errorData.type === "rate_limit_error" ||
            errorData.type === "gemini_error_429" ||
            response.status === 429;

          // 체인 폴백 조건: 429 + 폴백 허용 + 시도하지 않은 provider 있음
          if (is429 && req.allowFallback && req.fallbackApiKeys) {
            const currentIndex = FALLBACK_CHAIN.indexOf(req.provider);
            const newAttemptedProviders = [...attemptedProviders, req.provider];

            // FALLBACK_CHAIN에서 다음 provider 찾기
            for (let i = currentIndex + 1; i < FALLBACK_CHAIN.length; i++) {
              const nextProvider = FALLBACK_CHAIN[i];
              const nextApiKey = req.fallbackApiKeys[nextProvider];

              // 이미 시도한 provider는 스킵
              if (newAttemptedProviders.includes(nextProvider)) continue;

              if (nextApiKey) {
                const firstModel = MODELS_BY_PROVIDER[nextProvider][0];
                const fallbackRequest: ChatRequest = {
                  ...req,
                  provider: nextProvider,
                  model: firstModel.id,
                  apiKey: nextApiKey,
                  webSearchEnabled: nextProvider === "groq" ? false : req.webSearchEnabled,
                };

                fallbackInfo = {
                  occurred: true,
                  fromProvider: req.provider,
                  toProvider: nextProvider,
                  reason: "요청 한도 초과",
                };

                return attemptStream(fallbackRequest, newAttemptedProviders);
              }
            }
          }

          throw new Error(JSON.stringify(errorData));
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();

        // Provider별 파싱
        if (provider === "claude") {
          const result = await parseClaudeStream(
            reader,
            decoder,
            (text) => setStreamText(text),
            (query) => setSearchQueries((prev) => [...prev, query]),
            () => setCitations((prev) => [...prev])
          );
          fullText = result.fullText;
          queries = result.queries;
          allCitations = result.allCitations;
        } else if (provider === "gemini") {
          const result = await parseGeminiStream(
            reader,
            decoder,
            (text) => setStreamText(text),
            (query) => setSearchQueries((prev) => [...prev, query]),
            () => setCitations((prev) => [...prev])
          );
          fullText = result.fullText;
          queries = result.queries;
          allCitations = result.allCitations;
        } else if (provider === "groq") {
          const result = await parseGroqStream(
            reader,
            decoder,
            (text) => setStreamText(text)
          );
          fullText = result.fullText;
          queries = result.queries;
          allCitations = result.allCitations;
        }

        return {
          text: fullText,
          searchQueries: queries,
          citations: allCitations,
          fallbackInfo,
        };
      };

      try {
        return await attemptStream(request, []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return {
            text: fullText,
            searchQueries: queries,
            citations: allCitations,
            aborted: true,
          };
        }
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        throw err;
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [parseClaudeStream, parseGeminiStream, parseGroqStream]
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
