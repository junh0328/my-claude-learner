"use client";

import { useCallback, useSyncExternalStore, useState, useEffect } from "react";
import {
  Provider,
  Message,
  ChatSession,
  SerializedMessage,
  SerializedChatSession,
} from "@/types/chat";

const HISTORY_STORAGE_KEY = "chat_history";
const CURRENT_SESSION_KEY = "current_session_id";
const MAX_SESSIONS = 50;

interface UseHistoryReturn {
  sessions: ChatSession[];
  currentSessionId: string | null;
  currentSession: ChatSession | null;
  createSession: (provider: Provider) => string;
  updateSession: (id: string, messages: Message[]) => void;
  deleteSession: (id: string) => void;
  selectSession: (id: string) => void;
}

// 직렬화: Message -> SerializedMessage
function serializeMessage(message: Message): SerializedMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    searchQueries: message.searchQueries,
    citations: message.citations,
  };
}

// 역직렬화: SerializedMessage -> Message
function deserializeMessage(serialized: SerializedMessage): Message {
  return {
    id: serialized.id,
    role: serialized.role,
    content: serialized.content,
    createdAt: new Date(serialized.createdAt),
    searchQueries: serialized.searchQueries,
    citations: serialized.citations,
  };
}

// 직렬화: ChatSession -> SerializedChatSession
function serializeSession(session: ChatSession): SerializedChatSession {
  return {
    id: session.id,
    title: session.title,
    messages: session.messages.map(serializeMessage),
    provider: session.provider,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

// 역직렬화: SerializedChatSession -> ChatSession
function deserializeSession(serialized: SerializedChatSession): ChatSession {
  return {
    id: serialized.id,
    title: serialized.title,
    messages: serialized.messages.map(deserializeMessage),
    provider: serialized.provider,
    createdAt: new Date(serialized.createdAt),
    updatedAt: new Date(serialized.updatedAt),
  };
}

// localStorage에서 세션 목록 가져오기
function getStoredSessions(): ChatSession[] {
  if (typeof window === "undefined") {
    return [];
  }
  const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
  if (stored) {
    try {
      const parsed: SerializedChatSession[] = JSON.parse(stored);
      return parsed.map(deserializeSession);
    } catch {
      return [];
    }
  }
  return [];
}

// localStorage에 세션 목록 저장
function setStoredSessions(sessions: ChatSession[]) {
  if (typeof window === "undefined") return;
  try {
    const serialized = sessions.map(serializeSession);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(serialized));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    // QuotaExceededError 처리: 오래된 세션 삭제 후 재시도
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      const trimmed = sessions.slice(0, Math.floor(sessions.length / 2));
      const serialized = trimmed.map(serializeSession);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(serialized));
      window.dispatchEvent(new Event("storage"));
    }
  }
}

// 현재 세션 ID 가져오기
function getCurrentSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CURRENT_SESSION_KEY);
}

// 현재 세션 ID 저장
function setCurrentSessionId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(CURRENT_SESSION_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_SESSION_KEY);
  }
  window.dispatchEvent(new Event("storage"));
}

// 제목 생성 (첫 메시지 30자 요약)
function generateTitle(content: string): string {
  const trimmed = content.trim().replace(/\n/g, " ");
  if (trimmed.length <= 30) {
    return trimmed;
  }
  return trimmed.slice(0, 30) + "...";
}

// 세션 ID 생성
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// localStorage 상태를 구독하기 위한 함수들
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): string {
  const sessions = localStorage.getItem(HISTORY_STORAGE_KEY) || "[]";
  const currentId = localStorage.getItem(CURRENT_SESSION_KEY) || "";
  return `${sessions}|${currentId}`;
}

function getServerSnapshot(): string {
  return "[]|";
}

export function useHistory(): UseHistoryReturn {
  // useSyncExternalStore를 사용하여 localStorage 동기화
  const storedData = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  // 세션 목록과 현재 세션 ID 파싱
  const [sessionsString] = storedData.split("|");

  const sessions: ChatSession[] = (() => {
    try {
      const parsed: SerializedChatSession[] = JSON.parse(sessionsString || "[]");
      return parsed.map(deserializeSession);
    } catch {
      return [];
    }
  })();

  // 현재 세션 ID는 별도 상태로 관리 (hydration 불일치 방지)
  const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(null);

  // 클라이언트에서만 현재 세션 ID 로드
  useEffect(() => {
    const id = getCurrentSessionId();
    setCurrentSessionIdState(id);
  }, [storedData]);

  // 현재 세션 찾기
  const currentSession = currentSessionId
    ? sessions.find((s) => s.id === currentSessionId) || null
    : null;

  // 새 세션 생성
  const createSession = useCallback((provider: Provider): string => {
    const id = generateSessionId();
    const newSession: ChatSession = {
      id,
      title: "새 대화",
      messages: [],
      provider,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const currentSessions = getStoredSessions();
    // 최신 세션을 맨 앞에 추가, 최대 개수 제한
    const updatedSessions = [newSession, ...currentSessions].slice(0, MAX_SESSIONS);
    setStoredSessions(updatedSessions);
    setCurrentSessionId(id);
    setCurrentSessionIdState(id);

    return id;
  }, []);

  // 세션 업데이트
  const updateSession = useCallback((id: string, messages: Message[]) => {
    const currentSessions = getStoredSessions();
    const sessionIndex = currentSessions.findIndex((s) => s.id === id);

    if (sessionIndex === -1) return;

    const session = currentSessions[sessionIndex];
    const updatedSession: ChatSession = {
      ...session,
      messages,
      updatedAt: new Date(),
    };

    // 첫 사용자 메시지가 있으면 제목 업데이트
    if (session.title === "새 대화" && messages.length > 0) {
      const firstUserMessage = messages.find((m) => m.role === "user");
      if (firstUserMessage) {
        updatedSession.title = generateTitle(firstUserMessage.content);
      }
    }

    // 업데이트된 세션을 맨 앞으로 이동
    const otherSessions = currentSessions.filter((s) => s.id !== id);
    const updatedSessions = [updatedSession, ...otherSessions];
    setStoredSessions(updatedSessions);
  }, []);

  // 세션 삭제
  const deleteSession = useCallback((id: string) => {
    const currentSessions = getStoredSessions();
    const updatedSessions = currentSessions.filter((s) => s.id !== id);
    setStoredSessions(updatedSessions);

    // 현재 세션이 삭제되면 첫 번째 세션 선택
    const currentId = getCurrentSessionId();
    if (currentId === id) {
      const newCurrentId = updatedSessions[0]?.id || null;
      setCurrentSessionId(newCurrentId);
      setCurrentSessionIdState(newCurrentId);
    }
  }, []);

  // 세션 선택
  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    setCurrentSessionIdState(id);
  }, []);

  return {
    sessions,
    currentSessionId,
    currentSession,
    createSession,
    updateSession,
    deleteSession,
    selectSession,
  };
}
