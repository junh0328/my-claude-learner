"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { Provider } from "@/types/chat";

const API_KEYS_STORAGE_KEY = "ai_api_keys";

interface ApiKeys {
  claude: string | null;
  gemini: string | null;
}

interface UseApiKeyReturn {
  apiKeys: ApiKeys;
  selectedProvider: Provider;
  setSelectedProvider: (provider: Provider) => void;
  currentApiKey: string | null;
  needsApiKey: (provider: Provider) => boolean;
  isLoading: boolean;
  setApiKey: (provider: Provider, key: string) => void;
  clearApiKey: (provider: Provider) => void;
  hasApiKey: (provider: Provider) => boolean;
}

// localStorage에서 API 키 가져오기
function getStoredApiKeys(): ApiKeys {
  if (typeof window === "undefined") {
    return { claude: null, gemini: null };
  }
  const storedKeys = localStorage.getItem(API_KEYS_STORAGE_KEY);
  if (storedKeys) {
    try {
      const parsed = JSON.parse(storedKeys);
      return {
        claude: parsed.claude || null,
        gemini: parsed.gemini || null,
      };
    } catch {
      return { claude: null, gemini: null };
    }
  }
  return { claude: null, gemini: null };
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
      };
    } catch {
      return { claude: null, gemini: null };
    }
  })();

  const [selectedProvider, setSelectedProvider] = useState<Provider>("claude");
  const [isLoading] = useState(false);

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

  // 현재 선택된 provider의 API 키
  const currentApiKey = apiKeys[selectedProvider];

  return {
    apiKeys,
    selectedProvider,
    setSelectedProvider,
    currentApiKey,
    needsApiKey,
    isLoading,
    setApiKey,
    clearApiKey,
    hasApiKey,
  };
}
