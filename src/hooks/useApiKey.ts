"use client";

import { useState, useEffect, useCallback } from "react";

const API_KEY_STORAGE_KEY = "anthropic_api_key";

interface UseApiKeyReturn {
  apiKey: string | null;
  needsApiKey: boolean;
  isLoading: boolean;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

export function useApiKey(): UseApiKeyReturn {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 마운트 시 localStorage에서 API 키 확인
  useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      setApiKeyState(storedKey);
    }
    setIsLoading(false);
  }, []);

  const setApiKey = useCallback((key: string) => {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
    setApiKeyState(key);
  }, []);

  const clearApiKey = useCallback(() => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKeyState(null);
  }, []);

  // API 키가 필요한지 여부 (로딩 완료 후 키가 없으면 필요)
  const needsApiKey = !isLoading && !apiKey;

  return {
    apiKey,
    needsApiKey,
    isLoading,
    setApiKey,
    clearApiKey,
  };
}
