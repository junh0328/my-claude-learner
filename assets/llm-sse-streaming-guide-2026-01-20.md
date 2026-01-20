---
title: "[Next.js] Claude AI 챗봇을 만들며 배우는 LLM의 SSE 스트리밍 전략"
category: 웹 개발
tags: SSE, Server-Sent Events, LLM, Claude API, Next.js, React, 스트리밍, 챗봇, 실시간, TypeScript
description: ChatGPT나 Claude처럼 실시간으로 응답이 출력되는 LLM 챗봇을 직접 구현하며 SSE 스트리밍의 동작 원리와 구현 전략을 깊이 있게 알아봅니다.
---

# Claude AI 챗봇을 만들며 배우는 LLM의 SSE 스트리밍 전략

## 들어가며

ChatGPT나 Claude를 사용해 보셨다면 텍스트가 한 글자씩 타이핑되듯 출력되는 것을 경험해 보셨을 것입니다. 이런 UX는 단순히 시각적 효과가 아닙니다. LLM이 토큰 단위로 응답을 생성하는 특성을 활용한 **스트리밍 응답** 방식입니다.

LLM 응답은 수 초에서 수십 초까지 걸릴 수 있습니다. 사용자가 빈 화면을 보며 기다리게 하는 것보다, 생성되는 즉시 텍스트를 보여주는 것이 훨씬 나은 경험을 제공합니다.

이 글에서는 Next.js와 React를 사용해 Claude API 기반 챗봇을 직접 구현하면서 **SSE(Server-Sent Events)** 스트리밍의 동작 원리와 실전 구현 전략을 살펴봅니다.

### 이 글의 대상

- LLM API를 활용한 서비스 개발에 관심 있는 개발자
- 실시간 스트리밍 UI를 구현하고 싶은 프론트엔드 개발자
- Next.js 환경에서 SSE를 적용하고 싶은 개발자

---

## 1. 왜 LLM 응답에 SSE가 필요한가?

### 일반 HTTP 요청의 한계

일반적인 REST API 호출 방식을 생각해 봅시다.

```
클라이언트 → 요청 → 서버 → (처리) → 완전한 응답 → 클라이언트
```

이 방식에서 클라이언트는 서버가 **모든 처리를 완료할 때까지** 기다려야 합니다. LLM의 경우 긴 응답을 생성하는 데 10초 이상 걸릴 수 있어, 사용자는 그동안 아무것도 볼 수 없습니다.

### SSE의 장점

SSE(Server-Sent Events)는 서버에서 클라이언트로 **단방향 실시간 데이터 스트림**을 전송하는 HTTP 기반 프로토콜입니다.

```
클라이언트 → 요청 → 서버 → 데이터1 → 데이터2 → ... → 데이터N → 종료
                          ↓         ↓              ↓
                       즉시 표시  즉시 표시      즉시 표시
```

LLM은 토큰(단어 또는 단어 조각) 단위로 응답을 생성합니다. SSE를 사용하면 토큰이 생성될 때마다 즉시 클라이언트에 전달할 수 있습니다.

### WebSocket과의 비교

| 특성 | SSE | WebSocket |
|------|-----|-----------|
| 통신 방향 | 단방향 (서버 → 클라이언트) | 양방향 |
| 프로토콜 | HTTP | WS (별도 프로토콜) |
| 연결 복잡도 | 낮음 | 높음 |
| 자동 재연결 | 브라우저 내장 지원 | 직접 구현 필요 |
| LLM 응답 용도 | **적합** | 과도함 |

LLM 응답 스트리밍은 서버에서 클라이언트로의 단방향 전송이므로 SSE가 적합합니다. WebSocket은 채팅방처럼 **양방향 실시간 통신**이 필요한 경우에 사용합니다.

---

## 2. SSE 프로토콜 이해하기

### SSE 메시지 형식

SSE는 텍스트 기반의 단순한 프로토콜입니다. 각 이벤트는 `field: value` 형식으로 전송됩니다.

```
data: {"type": "content_block_delta", "delta": {"text": "안녕"}}

data: {"type": "content_block_delta", "delta": {"text": "하세요"}}

data: [DONE]
```

**주요 필드:**
- `data`: 이벤트 데이터 (필수)
- `event`: 이벤트 타입 (선택)
- `id`: 이벤트 ID (선택, 재연결 시 사용)
- `retry`: 재연결 대기 시간 (선택)

각 이벤트는 빈 줄(`\n\n`)로 구분됩니다.

### HTTP 응답 헤더

SSE 응답에는 다음 헤더가 필요합니다.

```typescript
return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",  // SSE 명시
    "Cache-Control": "no-cache",           // 캐싱 방지
    "Connection": "keep-alive",            // 연결 유지
  },
});
```

### 브라우저에서 SSE 소비하기: EventSource vs fetch

브라우저에서 SSE를 소비하는 방법은 두 가지입니다.

**1. EventSource API (전통적인 방식)**

```javascript
const eventSource = new EventSource("/api/notifications");

eventSource.onmessage = (event) => {
  console.log(event.data);  // 자동 파싱
};

eventSource.onerror = () => {
  // 자동 재연결 시도
};

eventSource.close();  // 연결 종료
```

`EventSource`는 브라우저 내장 API로, 이벤트 파싱과 재연결을 자동으로 처리합니다.

**2. fetch + ReadableStream (이 글에서 사용하는 방식)**

```javascript
const response = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify({ messages }),
  signal: abortController.signal,
});

const reader = response.body.getReader();
// 수동으로 스트림 읽기 및 파싱...
```

**왜 LLM API에서는 fetch를 사용해야 할까요?**

| 특성 | EventSource | fetch + ReadableStream |
|------|-------------|------------------------|
| HTTP 메서드 | **GET만 지원** | POST, GET 등 모두 지원 |
| 요청 본문 | 전송 불가 | JSON 등 전송 가능 |
| 헤더 커스터마이징 | 불가 | 가능 |
| 이벤트 파싱 | 자동 | 수동 (버퍼 기반) |
| 자동 재연결 | 내장 지원 | 직접 구현 필요 |
| 중단 제어 | `.close()` | `AbortController` |

LLM API는 대화 히스토리(`messages` 배열)를 **POST 본문으로 전송**해야 합니다. `EventSource`는 GET 요청만 지원하므로 사용할 수 없습니다. 따라서 이 글에서는 `fetch` + `ReadableStream` 방식으로 구현합니다.

> **참고**: 단순한 알림이나 실시간 피드처럼 서버에서 일방적으로 데이터를 푸시하는 경우에는 `EventSource`가 더 간편합니다.

---

## 3. 전체 아키텍처 설계

Claude API를 직접 브라우저에서 호출하면 API 키가 노출됩니다. 따라서 백엔드를 통한 **프록시 패턴**이 필요합니다.

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  브라우저    │ ──▶  │  Next.js    │ ──▶  │  Claude     │
│  (React)    │      │  API Route  │      │  API        │
│             │ ◀──  │  (프록시)    │ ◀──  │             │
└─────────────┘      └─────────────┘      └─────────────┘
     fetch            ReadableStream      SSE Stream
   + AbortController
```

**데이터 흐름:**
1. 브라우저에서 사용자 메시지와 함께 API Route 호출
2. API Route가 Claude API에 스트리밍 요청
3. Claude API의 SSE 응답을 그대로 클라이언트에 전달
4. 브라우저에서 스트림을 읽어 UI 업데이트

---

## 4. 백엔드 구현: SSE 프록시

### API Route 기본 구조

Next.js App Router의 Route Handler로 SSE 프록시를 구현합니다.

`src/app/api/chat/route.ts`

```typescript
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { messages, model } = body;

  // 1. Claude API 호출 (스트리밍 모드)
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 4096,
      stream: true,  // 스트리밍 활성화
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({ error: errorText }), {
      status: response.status,
    });
  }

  // 2. ReadableStream으로 SSE 프록시 구축
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Claude API 응답을 그대로 클라이언트에 전달
          const chunk = decoder.decode(value, { stream: true });
          controller.enqueue(new TextEncoder().encode(chunk));
        }
      } finally {
        controller.close();
      }
    },
  });

  // 3. SSE 헤더와 함께 응답
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### 코드 설명

1. **`stream: true`**: Claude API에 스트리밍 모드를 요청합니다. 이 옵션이 없으면 전체 응답이 완료될 때까지 기다립니다.

2. **`ReadableStream`**: Web Streams API의 읽기 가능한 스트림입니다. `start` 메서드 내에서 데이터를 점진적으로 `enqueue`합니다.

3. **`TextDecoder`/`TextEncoder`**: 바이너리 데이터(`Uint8Array`)와 문자열 간 변환을 담당합니다. `{ stream: true }` 옵션은 멀티바이트 문자(한글 등)가 청크 경계에서 잘리는 문제를 방지합니다.

---

## 5. 프론트엔드 구현: 스트림 소비

### Custom Hook 설계

스트리밍 로직을 재사용 가능한 훅으로 분리합니다.

`src/hooks/useStreamResponse.ts`

```typescript
"use client";

import { useState, useCallback, useRef } from "react";

interface UseStreamResponseReturn {
  streamText: string;
  isStreaming: boolean;
  error: string | null;
  startStream: (messages: Array<{ role: string; content: string }>) => Promise<string>;
  abortStream: () => void;
}

export function useStreamResponse(): UseStreamResponseReturn {
  const [streamText, setStreamText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const startStream = useCallback(async (messages) => {
    // 이전 스트림 중단
    abortStream();
    abortControllerRef.current = new AbortController();

    setIsStreaming(true);
    setError(null);
    setStreamText("");

    let fullText = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: abortControllerRef.current.signal,  // 중단 시그널 연결
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // ReadableStream 소비
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 청크를 버퍼에 추가
        buffer += decoder.decode(value, { stream: true });

        // 줄 단위로 파싱
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";  // 마지막 불완전한 줄은 버퍼에 유지

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);

              // 텍스트 델타 이벤트 처리
              if (event.type === "content_block_delta" &&
                  event.delta?.type === "text_delta") {
                fullText += event.delta.text;
                setStreamText(fullText);
              }
            } catch {
              // JSON 파싱 실패 무시
            }
          }
        }
      }

      return fullText;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return fullText;  // 사용자가 중단한 경우
      }
      setError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [abortStream]);

  return { streamText, isStreaming, error, startStream, abortStream };
}
```

### 핵심 파싱 로직 상세 설명

SSE 스트림을 올바르게 파싱하려면 **버퍼 기반 처리**가 필요합니다.

```typescript
buffer += decoder.decode(value, { stream: true });
const lines = buffer.split("\n");
buffer = lines.pop() || "";  // 마지막 불완전한 줄은 버퍼에 유지
```

**왜 버퍼가 필요한가?**

네트워크에서 데이터는 임의의 크기로 도착합니다. 하나의 SSE 이벤트가 여러 청크에 걸쳐 도착할 수 있습니다.

```
청크 1: "data: {\"type\": \"content_bl"
청크 2: "ock_delta\", \"delta\": {\"text\": \"안녕\"}}\n\n"
```

버퍼를 사용해 불완전한 줄을 보관하고, 다음 청크와 합쳐서 완전한 이벤트를 만들어야 합니다.

### Claude API 이벤트 타입

Claude API는 다양한 이벤트 타입을 전송합니다.

| 이벤트 타입 | 설명 |
|------------|------|
| `message_start` | 메시지 시작 |
| `content_block_start` | 컨텐츠 블록 시작 |
| `content_block_delta` | 텍스트 델타 (핵심) |
| `content_block_stop` | 컨텐츠 블록 종료 |
| `message_delta` | 메시지 메타데이터 변경 |
| `message_stop` | 메시지 종료 |

실제 텍스트는 `content_block_delta` 이벤트의 `delta.text`에 담겨 옵니다.

```json
{
  "type": "content_block_delta",
  "index": 0,
  "delta": {
    "type": "text_delta",
    "text": "안녕하세요"
  }
}
```

---

## 6. 실전 고려사항

### 6.1 AbortController로 스트림 중단

사용자가 "정지" 버튼을 누르면 진행 중인 스트림을 즉시 중단해야 합니다.

```typescript
const abortControllerRef = useRef<AbortController | null>(null);

// 스트림 시작 시
abortControllerRef.current = new AbortController();
await fetch("/api/chat", {
  signal: abortControllerRef.current.signal,
  // ...
});

// 중단 시
const abortStream = () => {
  abortControllerRef.current?.abort();
};
```

`AbortController.abort()`를 호출하면 `fetch`가 `AbortError`를 throw합니다. 이를 catch해서 정상적인 중단으로 처리합니다.

```typescript
} catch (err) {
  if (err instanceof Error && err.name === "AbortError") {
    return fullText;  // 정상 중단, 에러 아님
  }
  setError(err.message);
}
```

### 6.2 에러 처리 전략

API 에러는 크게 세 단계에서 발생합니다.

**1단계: HTTP 에러 (fetch 실패)**

```typescript
if (!response.ok) {
  const errorData = await response.json();
  // 에러 타입에 따른 사용자 친화적 메시지
  switch (errorData.type) {
    case "rate_limit_error":
      throw new Error("요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.");
    case "authentication_error":
      throw new Error("API 인증에 실패했습니다.");
    default:
      throw new Error(errorData.message);
  }
}
```

**2단계: 스트림 중 에러**

Claude API는 스트리밍 중에도 에러 이벤트를 전송할 수 있습니다.

```typescript
if (event.type === "error") {
  throw new Error(event.error?.message || "스트리밍 중 에러 발생");
}
```

**3단계: 네트워크 에러**

```typescript
try {
  const { done, value } = await reader.read();
} catch (err) {
  // 네트워크 연결 끊김 등
  setError("네트워크 연결이 끊어졌습니다.");
}
```

### 6.3 타입 안전성

TypeScript로 이벤트 타입을 정의하면 안전하게 파싱할 수 있습니다.

```typescript
// src/types/chat.ts

export interface StreamEvent {
  type: string;
  index?: number;
  delta?: {
    type: string;
    text?: string;
  };
  content_block?: {
    type: string;
    text?: string;
  };
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}
```

---

## 7. 전체 데이터 흐름 정리

```
1. 사용자 입력
   └─ "안녕하세요"

2. useChat.sendMessage()
   ├─ 사용자 메시지를 messages 배열에 추가
   └─ useStreamResponse.startStream() 호출

3. startStream()
   ├─ fetch("/api/chat", { messages, signal })
   └─ AbortController 연결

4. API Route (route.ts)
   ├─ Claude API 호출 (stream: true)
   └─ ReadableStream으로 SSE 프록시

5. Claude API
   └─ data: {"type": "content_block_delta", "delta": {"text": "안"}}
      data: {"type": "content_block_delta", "delta": {"text": "녕"}}
      data: {"type": "content_block_delta", "delta": {"text": "하세요"}}
      data: [DONE]

6. startStream() - 스트림 소비
   ├─ 버퍼 기반 줄 파싱
   ├─ JSON.parse로 이벤트 파싱
   └─ setStreamText(fullText) → UI 업데이트

7. React 컴포넌트
   └─ streamText 표시 → "안" → "안녕" → "안녕하세요"
```

---

## 정리

### 핵심 포인트

1. **SSE는 LLM 응답에 최적화된 프로토콜입니다.** 단방향 스트리밍만 필요하므로 WebSocket보다 단순하고 효율적입니다.

2. **프록시 패턴은 필수입니다.** API 키 보호를 위해 브라우저에서 직접 LLM API를 호출하면 안 됩니다.

3. **버퍼 기반 파싱이 필요합니다.** 네트워크 청크 경계가 이벤트 경계와 일치하지 않기 때문입니다.

4. **AbortController로 정지 기능을 구현합니다.** 사용자 경험을 위해 스트림을 즉시 중단할 수 있어야 합니다.

5. **에러는 여러 단계에서 발생합니다.** HTTP 에러, 스트리밍 에러, 네트워크 에러를 각각 처리해야 합니다.

### 더 알아보기

- [MDN: Server-Sent Events](https://developer.mozilla.org/ko/docs/Web/API/Server-sent_events)
- [Anthropic Claude API 문서](https://docs.anthropic.com/en/api/messages-streaming)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

> 이 글에서 사용한 전체 코드는 실제 Claude 챗봇 프로젝트를 구현하며 작성되었습니다. 웹 검색 기능, 코드 구문 강조, 에러 처리 등 추가 기능 구현에 관심이 있다면 프로젝트 저장소를 참고해 주세요.
