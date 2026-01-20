# Claude 챗봇 구현 작업 계획서

## 프로젝트 개요

- **목표**: Claude API 기반 실시간 스트리밍 챗봇 구현
- **기술 스택**: Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui
- **특징**: SSE 스트리밍, 마크다운 렌더링, 다크 테마

---

### Phase 완료 시 수행 작업

각 Phase가 완료될 때마다 **반드시** 아래 작업을 수행합니다:

1. **작업 내용 평가**: (ultrathink)모드를 통해 작업한 내용을 스스로 평가한다. 부족한 부분이 있거나, 고려할 부분이 있다면 사용자에게 확인을 받는다.
2. **사용자 확인**: Phase 완료 여부를 사용자에게 확인
3. **CLAUDE.md 업데이트**: 작업된 내용을 바탕으로 `## 단계별 구현 가이드` 체크리스트를 업데이트한다

## 구현 단계

### Phase 1: 기반 설정 ✅

- [x] 1.1 필수 패키지 설치 (react-markdown, remark-gfm)
- [x] 1.2 shadcn/ui 초기화 및 설정
- [x] 1.3 환경변수 설정 (.env.local)
- [x] 1.4 globals.css 색상 변수 정의 (bubble-user, bubble-assistant)
- [x] 1.5 타입 정의 (src/types/chat.ts)
- **테스트**: 개발 서버 정상 실행 확인 ✅

### Phase 2: API Layer ✅

- [x] 2.1 API Route 생성 (src/app/api/chat/route.ts)
- [x] 2.2 Claude API SSE 스트리밍 프록시 구현
- **테스트**: API 엔드포인트 응답 테스트 ✅

### Phase 3: 핵심 훅 ✅

- [x] 3.1 useStreamResponse 훅 구현
- [x] 3.2 useChat 훅 구현
- **테스트**: 훅 동작 검증 ✅

### Phase 4: UI 컴포넌트 ✅

- [x] 4.1 LoadingDots 컴포넌트
- [x] 4.2 MarkdownRenderer 컴포넌트
- [x] 4.3 MessageBubble 컴포넌트
- [x] 4.4 MessageList 컴포넌트
- [x] 4.5 ChatInput 컴포넌트 (shadcn Button, Select, Textarea)
- [x] 4.6 ChatHeader 컴포넌트
- [x] 4.7 ChatContainer 컴포넌트
- **테스트**: 컴포넌트 렌더링 테스트 ✅

### Phase 5: 페이지 통합 ✅

- [x] 5.1 page.tsx를 ChatContainer로 교체
- [x] 5.2 레이아웃 메타데이터 업데이트
- **테스트**: 페이지 로드 확인 ✅

### Phase 6: 최종 검증 및 개선 ✅

- [x] 6.1 ESLint 검사 통과
- [x] 6.2 TypeScript 타입 검사 통과
- [x] 6.3 프로덕션 빌드 성공
- [x] 6.4 @tailwindcss/typography 플러그인 추가

### Phase 7: UI 개선 및 웹 검색 기능 ✅

- [x] 7.1 ScrollArea 높이 버그 수정 (min-h-0 overflow-hidden)
- [x] 7.2 Textarea 높이 오버플로우 수정 (field-sizing:fixed)
- [x] 7.3 모델 선택 버튼 UI 개선 (border 제거, 깔끔한 스타일)
- [x] 7.4 웹 검색 기능 추가 (web_search_20250305 도구)
  - [x] Switch 컴포넌트 추가 (on/off 토글)
  - [x] SearchResults 컴포넌트 생성
  - [x] 타입 확장 (SearchQuery, Citation, WebSearchResult)
  - [x] API route 수정 (tools 조건부 추가)
  - [x] useStreamResponse 훅 확장 (검색 결과 파싱)
- [x] 7.5 메인 컬러 변경 (#c6613f → oklch(0.58 0.14 35))
- [x] 7.6 전송 버튼 SVG 아이콘으로 교체
- **테스트**: 웹 검색 기능 동작 확인 ✅

### Phase 8: 정지 버튼 및 에러 처리 개선 ✅

- [x] 8.1 스트리밍 정지 기능 구현
  - [x] AbortController 기반 스트림 중단 (useStreamResponse)
  - [x] stopGeneration 함수 추가 (useChat)
  - [x] 정지 버튼 UI (■ 아이콘, secondary variant)
  - [x] 정지 시 입력값 복원 (pendingInputRef)
- [x] 8.2 에러 처리 고도화
  - [x] API route 에러 응답 구조화 (type, message, errorCode)
  - [x] 에러 타입별 사용자 친화적 메시지 변환
  - [x] ErrorBanner 컴포넌트 (아이콘, 라벨, 상세정보, 닫기)
  - [x] clearError 함수 추가
- **테스트**: 정지 버튼 및 에러 표시 확인 ✅

### Phase 9: 코드 블록 구문 강조 및 복사 기능 ✅

- [x] 9.1 구문 강조 기능 추가
  - [x] react-syntax-highlighter 라이브러리 설치
  - [x] Prism + oneDark 테마 적용
  - [x] 언어별 구문 강조 (typescript, javascript 등)
- [x] 9.2 코드 블록 UI 개선
  - [x] CodeBlock 컴포넌트 생성
  - [x] 언어 라벨 표시 (상단 좌측)
  - [x] 복사 버튼 추가 (상단 우측)
  - [x] 복사 성공 피드백 ("복사됨" 표시)
- **테스트**: 구문 강조 및 복사 기능 확인 ✅

### Phase 10: E2E 테스트 구축 ✅

- [x] 10.1 Playwright 테스트 환경 설정
  - [x] @playwright/test 설치
  - [x] playwright.config.ts 구성
  - [x] package.json 테스트 스크립트 추가
- [x] 10.2 UI 기본 기능 테스트 (e2e/chat.spec.ts)
  - [x] 페이지 로드 기본 UI 요소 확인
  - [x] 빈 메시지 전송 불가
  - [x] 텍스트 입력 시 전송 버튼 활성화
  - [x] Shift+Enter 줄바꿈
  - [x] 모델 선택 드롭다운
  - [x] 웹 검색 토글
  - [x] 반응형 레이아웃
- [x] 10.3 SSE 스트리밍 테스트 (e2e/sse-streaming.spec.ts)
  - [x] 더미 SSE 데이터 생성 유틸리티
  - [x] 기본 텍스트 스트리밍
  - [x] 코드 블록 렌더링
  - [x] 복사 버튼 기능
  - [x] 사용자/AI 메시지 정렬
  - [x] 에러 처리 (ErrorBanner)
  - [x] 정지 버튼 표시
  - [x] 웹 검색 결과 표시
  - [x] 연속 대화
- **테스트 결과**: 19/19 통과 ✅

### Phase 11: API Key 관리 기능 ✅

- [x] 11.1 useApiKey 훅 구현
  - [x] localStorage 기반 API 키 저장/로드
  - [x] needsApiKey 상태 (키 필요 여부)
  - [x] isLoading 상태 (로드 중)
  - [x] setApiKey, clearApiKey 함수
- [x] 11.2 ApiKeyDialog 컴포넌트
  - [x] shadcn/ui Dialog 기반 모달
  - [x] API 키 입력 폼 (Input)
  - [x] 입력 검증 (sk-ant- 형식)
  - [x] 첫 사용자: 닫기 버튼 숨김 (필수 입력)
  - [x] 기존 사용자: 자유롭게 변경 가능
  - [x] console.anthropic.com 링크 제공
  - [x] 키 삭제 버튼 (기존 키가 있을 때만 표시)
- [x] 11.3 UI 통합
  - [x] ChatHeader에 설정 버튼 추가 (톱니바퀴 아이콘)
  - [x] ChatContainer에서 API 키 상태 관리
  - [x] API 키 없으면 자동 다이얼로그 표시
  - [x] useChat에 apiKey 옵션 전달
- **테스트**: API 키 입력 및 저장 확인 ✅

### Phase 12: Multi-Provider 지원 (Claude + Gemini) ✅

- [x] 12.1 타입 정의 확장 (chat.ts)
  - [x] Provider 타입 추가 ("claude" | "gemini")
  - [x] GeminiModel 타입 추가
  - [x] AIModel 통합 타입 (ClaudeModel | GeminiModel)
  - [x] GEMINI_MODELS 상수 배열
  - [x] MODELS_BY_PROVIDER 매핑 객체
  - [x] ChatRequest에 provider 필드 추가
- [x] 12.2 API 키 관리 확장 (useApiKey.ts)
  - [x] useSyncExternalStore로 localStorage 동기화
  - [x] Provider별 API 키 관리 (claude, gemini)
  - [x] selectedProvider 상태 관리
  - [x] needsApiKey(provider) 함수
- [x] 12.3 API Route 분기 (route.ts)
  - [x] Provider별 API 엔드포인트 분기
  - [x] Gemini API 호출 (streamGenerateContent)
  - [x] Gemini 웹 검색 도구 (google_search)
  - [x] Provider별 에러 처리
- [x] 12.4 스트리밍 파서 분기 (useStreamResponse.ts)
  - [x] parseClaudeStream 함수
  - [x] parseGeminiStream 함수
  - [x] Gemini groundingMetadata 파싱
  - [x] Provider별 Citation 변환
- [x] 12.5 UI 컴포넌트 수정
  - [x] Provider 선택 버튼 그룹 (ChatInput)
  - [x] Gemini Sparkle SVG 아이콘
  - [x] Provider별 테마 색상 (globals.css)
  - [x] ChatHeader Provider 표시
  - [x] ApiKeyDialog 탭 UI (Claude/Gemini)
  - [x] shadcn/ui Tabs 컴포넌트 추가
- [x] 12.6 통합 (ChatContainer, useChat)
  - [x] Provider 상태 동기화
  - [x] Provider 변경 시 모델 자동 선택
  - [x] API 키 없으면 다이얼로그 자동 표시
- [x] 12.7 E2E 테스트 (e2e/multi-provider.spec.ts)
  - [x] Provider 선택 버튼 표시
  - [x] Provider 전환 UI 변경
  - [x] Provider별 모델 목록 변경
  - [x] Claude/Gemini 스트리밍 테스트
  - [x] API Key 다이얼로그 탭 테스트
- **테스트 결과**: 10/10 통과 ✅

---

## 파일 구조

```
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Multi-Provider API 프록시 (Claude + Gemini)
│   ├── globals.css               # 공통 색상 변수 + Provider 테마
│   ├── layout.tsx
│   └── page.tsx                  # ChatContainer
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx     # Provider 상태 통합 관리
│   │   ├── ChatHeader.tsx        # Provider별 아이콘/제목 표시
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx     # 검색 결과 + Citations 표시
│   │   ├── ChatInput.tsx         # Provider 선택 + 모델 선택 + 웹 검색 토글
│   │   ├── SearchResults.tsx     # 검색 쿼리 결과 UI
│   │   ├── ErrorBanner.tsx       # 에러 표시 UI
│   │   ├── CodeBlock.tsx         # 구문 강조 + 복사 버튼
│   │   ├── ApiKeyDialog.tsx      # API 키 입력 모달 (탭 UI)
│   │   └── MarkdownRenderer.tsx
│   └── ui/
│       ├── button.tsx            # shadcn
│       ├── select.tsx            # shadcn
│       ├── textarea.tsx          # shadcn
│       ├── scroll-area.tsx       # shadcn
│       ├── switch.tsx            # shadcn (웹 검색 토글)
│       ├── dialog.tsx            # shadcn (모달 다이얼로그)
│       ├── input.tsx             # shadcn (텍스트 입력)
│       ├── tabs.tsx              # shadcn (Provider 탭)
│       └── loading-dots.tsx
├── hooks/
│   ├── useStreamResponse.ts      # Provider별 스트림 파싱 (Claude/Gemini)
│   ├── useChat.ts                # Provider 상태 + 정지/에러 관리
│   └── useApiKey.ts              # Provider별 API 키 관리 (useSyncExternalStore)
├── types/
│   └── chat.ts                   # Provider, AIModel, Gemini 타입 포함
└── lib/
    └── utils.ts                  # shadcn cn 유틸

e2e/                              # Playwright E2E 테스트
├── chat.spec.ts                  # UI 기본 기능 테스트
├── sse-streaming.spec.ts         # SSE 스트리밍 테스트 (Claude)
└── multi-provider.spec.ts        # Multi-Provider 테스트
```

---

## 색상 시스템 (globals.css)

CSS 변수로 정의된 색상 시스템 (oklch 색상 공간 사용):

```css
:root {
  /* 메인 컬러 - 테라코타 (#c6613f) */
  --primary: oklch(0.58 0.14 35);

  /* 챗 버블 색상 */
  --bubble-user: oklch(0.58 0.14 35); /* 테라코타 */
  --bubble-user-foreground: oklch(0.985 0 0); /* 흰색 */
  --bubble-assistant: oklch(0.97 0 0); /* 밝은 회색 */
  --bubble-assistant-foreground: oklch(0.145 0 0); /* 검정 */
}

.dark {
  --primary: oklch(0.65 0.14 35);
  --bubble-user: oklch(0.65 0.14 35);
  --bubble-assistant: oklch(0.269 0 0); /* 어두운 회색 */
  --bubble-assistant-foreground: oklch(0.985 0 0); /* 흰색 */
}
```

Tailwind에서 사용: `bg-bubble-user`, `text-bubble-user-foreground`, `bg-primary` 등

---

## 사용 방법

1. API 키 설정

```bash
# .env.local 파일에 API 키 입력
ANTHROPIC_API_KEY=your_api_key_here
```

2. 개발 서버 실행

```bash
pnpm run dev
```

3. http://localhost:3000 접속

---

## 모델 옵션

### Claude (Anthropic)

| 모델             | 설명                    |
| ---------------- | ----------------------- |
| Claude Sonnet 4  | 균형 잡힌 성능 (기본값) |
| Claude Opus 4    | 최고 성능               |
| Claude 3.5 Haiku | 최고 속도               |

### Gemini (Google)

| 모델             | 설명         |
| ---------------- | ------------ |
| Gemini 2.5 Flash | 빠른 응답    |
| Gemini 2.0 Flash | 안정적 성능  |

---

## 진행 상태

| Phase    | 상태    | 완료일     |
| -------- | ------- | ---------- |
| Phase 1  | ✅ 완료 | 2026-01-20 |
| Phase 2  | ✅ 완료 | 2026-01-20 |
| Phase 3  | ✅ 완료 | 2026-01-20 |
| Phase 4  | ✅ 완료 | 2026-01-20 |
| Phase 5  | ✅ 완료 | 2026-01-20 |
| Phase 6  | ✅ 완료 | 2026-01-20 |
| Phase 7  | ✅ 완료 | 2026-01-20 |
| Phase 8  | ✅ 완료 | 2026-01-20 |
| Phase 9  | ✅ 완료 | 2026-01-20 |
| Phase 10 | ✅ 완료 | 2026-01-20 |
| Phase 11 | ✅ 완료 | 2026-01-20 |
| Phase 12 | ✅ 완료 | 2026-01-20 |

---

## 자체 평가

### 완료된 기능

- SSE 스트리밍 응답 (타이핑 효과)
- 마크다운 렌더링 (코드 블록, 테이블, 링크 등)
- 모델 선택 기능
- 대화 초기화 기능
- **웹 검색 기능** (on/off 토글, 검색 결과 표시, Citations)
- **개선된 UI** (모델 선택, 전송 버튼 아이콘)
- **스트리밍 정지 기능** (정지 버튼, 입력값 복원)
- **고도화된 에러 처리** (타입별 메시지, ErrorBanner, 닫기 기능)
- **코드 블록 구문 강조** (Prism + oneDark 테마)
- **코드 복사 버튼** (언어 라벨, 복사됨 피드백)
- **API 키 관리** (입력 모달, localStorage 저장, 설정 버튼)
- **Multi-Provider 지원** (Claude + Gemini 전환)
- **Provider별 테마** (색상, 아이콘 구분)
- **Gemini 웹 검색** (Google Search Grounding)

### 기술적 특징

- Next.js 16 App Router
- React 19 + React Compiler
- Tailwind CSS 4 (새로운 @theme, @plugin 문법)
- shadcn/ui 컴포넌트 활용
- 공통 색상 시스템 (CSS 변수)
- **Claude web_search_20250305 도구 통합**
- **Gemini google_search 도구 통합**
- **실시간 검색 결과 스트리밍 파싱**
- **AbortController 기반 스트림 중단**
- **react-syntax-highlighter 구문 강조**
- **Playwright E2E 테스트**
- **useSyncExternalStore를 활용한 localStorage 동기화**

### 향후 개선 가능 사항

- 대화 기록 저장 (localStorage 또는 DB)
- 다크 모드 토글 버튼
- 메시지 수정/삭제 기능
- 파일 업로드 지원
- 검색 중 상태 표시 개선
- 검색 결과 snippet 표시
- cited_text hover 표시
- 정지 시 부분 응답 저장 옵션
- rate_limit_error 시 자동 재시도
- 라이트/다크 모드별 코드 테마 변경
- 추가 Provider 지원 (OpenAI GPT 등)
