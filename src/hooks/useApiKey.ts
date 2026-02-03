"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Provider, FALLBACK_CHAIN } from "@/types/chat";

const API_KEYS_STORAGE_KEY = "ai_api_keys";

interface ApiKeys {
  claude: string | null;
  gemini: string | null;
  groq: string | null;
}

interface UseApiKeyReturn {
  apiKeys: ApiKeys;
  selectedProvider: Provider;
  currentApiKey: string | null;
  needsApiKey: (provider: Provider) => boolean;
  needsAnyApiKey: boolean;
  isLoading: boolean;
  setApiKey: (provider: Provider, key: string) => void;
  clearApiKey: (provider: Provider) => void;
  hasApiKey: (provider: Provider) => boolean;
  getFallbackApiKeys: () => Partial<Record<Provider, string>>;
}

// localStorage에서 API 키 가져오기
function getStoredApiKeys(): ApiKeys {
  if (typeof window === "undefined") {
    return { claude: null, gemini: null, groq: null };
  }
  const storedKeys = localStorage.getItem(API_KEYS_STORAGE_KEY);
  if (storedKeys) {
    try {
      const parsed = JSON.parse(storedKeys);
      return {
        claude: parsed.claude || null,
        gemini: parsed.gemini || null,
        groq: parsed.groq || null,
      };
    } catch {
      return { claude: null, gemini: null, groq: null };
    }
  }
  return { claude: null, gemini: null, groq: null };
}

// localStorage 상태를 구독하기 위한 함수들
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): string {
  return localStorage.getItem(API_KEYS_STORAGE_KEY) || "{}";
}

function getServerSnapshot(): string {
  return "{}";
}

// API 키가 있는 첫 번째 Provider 반환 (FALLBACK_CHAIN 순서)
function getFirstAvailableProvider(apiKeys: ApiKeys): Provider {
  for (const provider of FALLBACK_CHAIN) {
    if (apiKeys[provider]) {
      return provider;
    }
  }
  return FALLBACK_CHAIN[0]; // 기본값: gemini
}

export function useApiKey(): UseApiKeyReturn {
  // useSyncExternalStore를 사용하여 localStorage 동기화
  const storedKeysString = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const apiKeys: ApiKeys = (() => {
    try {
      const parsed = JSON.parse(storedKeysString);
      return {
        claude: parsed.claude || null,
        gemini: parsed.gemini || null,
        groq: parsed.groq || null,
      };
    } catch {
      return { claude: null, gemini: null, groq: null };
    }
  })();

  // API 키가 있는 첫 번째 Provider를 자동 선택
  const selectedProvider = getFirstAvailableProvider(apiKeys);
  const isLoading = false;

  // 어떤 API 키도 없는 상태인지 확인
  const needsAnyApiKey = !apiKeys.claude && !apiKeys.gemini && !apiKeys.groq;

  const setApiKey = useCallback((provider: Provider, key: string) => {
    const current = getStoredApiKeys();
    const newKeys = { ...current, [provider]: key };
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(newKeys));
    // storage 이벤트 트리거 (같은 탭에서는 자동으로 발생하지 않음)
    window.dispatchEvent(new Event("storage"));
  }, []);

  const clearApiKey = useCallback((provider: Provider) => {
    const current = getStoredApiKeys();
    const newKeys = { ...current, [provider]: null };
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(newKeys));
    window.dispatchEvent(new Event("storage"));
  }, []);

  const hasApiKey = useCallback(
    (provider: Provider) => !!apiKeys[provider],
    [apiKeys]
  );

  const needsApiKey = useCallback(
    (provider: Provider) => !apiKeys[provider],
    [apiKeys]
  );

  // 폴백에 사용할 API 키들 반환 (FALLBACK_CHAIN 순서로)
  const getFallbackApiKeys = useCallback(() => {
    const keys: Partial<Record<Provider, string>> = {};
    if (apiKeys.gemini) keys.gemini = apiKeys.gemini;
    if (apiKeys.groq) keys.groq = apiKeys.groq;
    if (apiKeys.claude) keys.claude = apiKeys.claude;
    return keys;
  }, [apiKeys]);

  // 현재 선택된 provider의 API 키
  const currentApiKey = apiKeys[selectedProvider];

  return {
    apiKeys,
    selectedProvider,
    currentApiKey,
    needsApiKey,
    needsAnyApiKey,
    isLoading,
    setApiKey,
    clearApiKey,
    hasApiKey,
    getFallbackApiKeys,
  };
}
