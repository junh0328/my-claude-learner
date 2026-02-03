export type Role = 'user' | 'assistant';

// Provider 타입
export type Provider = 'claude' | 'gemini' | 'groq';

// Claude 모델 타입
export type ClaudeModel =
  | 'claude-sonnet-4-20250514'
  | 'claude-opus-4-20250514'
  | 'claude-3-5-haiku-20241022';

// Gemini 모델 타입
export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-flash-lite-preview';

// Groq 모델 타입
export type GroqModel = 'llama-3.3-70b-versatile' | 'llama-3.1-8b-instant';

// 통합 AI 모델 타입
export type AIModel = ClaudeModel | GeminiModel | GroqModel;

export interface ModelOption {
  id: AIModel;
  name: string;
  description: string;
  provider: Provider;
}

export const CLAUDE_MODELS: ModelOption[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: '균형 잡힌 성능',
    provider: 'claude',
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    description: '최고 성능',
    provider: 'claude',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: '최고 속도',
    provider: 'claude',
  },
];

export const GEMINI_MODELS: ModelOption[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: '빠른 응답 (기본값)',
    provider: 'gemini',
  },
  {
    id: 'gemini-2.5-flash-lite-preview',
    name: 'Gemini 2.5 Flash Lite',
    description: '저지연 최적화',
    provider: 'gemini',
  },
];

export const GROQ_MODELS: ModelOption[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    description: '다목적 (128K)',
    provider: 'groq',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    description: '빠른 응답',
    provider: 'groq',
  },
];

// 폴백 체인 순서 (Gemini → Groq → Claude)
export const FALLBACK_CHAIN: Provider[] = ['gemini', 'groq', 'claude'];

// Provider별 모델 목록
export const MODELS_BY_PROVIDER: Record<Provider, ModelOption[]> = {
  claude: CLAUDE_MODELS,
  gemini: GEMINI_MODELS,
  groq: GROQ_MODELS,
};

// Provider별 기본 모델
export const DEFAULT_MODELS: Record<Provider, AIModel> = {
  gemini: 'gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
  claude: 'claude-sonnet-4-20250514',
};

// 전체 모델 목록
export const ALL_MODELS: ModelOption[] = [
  ...CLAUDE_MODELS,
  ...GEMINI_MODELS,
  ...GROQ_MODELS,
];

export interface ChatRequest {
  messages: Pick<Message, 'role' | 'content'>[];
  model: AIModel;
  provider: Provider;
  webSearchEnabled?: boolean;
  apiKey?: string;
  fallbackApiKeys?: Partial<Record<Provider, string>>; // 폴백 시 사용할 API 키들
  allowFallback?: boolean; // 폴백 허용 여부
}

// 폴백 정보 타입
export interface FallbackInfo {
  occurred: boolean;
  fromProvider: Provider;
  toProvider: Provider;
  reason: string;
}

// 웹 검색 관련 타입
export interface WebSearchResult {
  url: string;
  title: string;
  page_age?: string;
}

export interface Citation {
  type: 'web_search_result_location';
  url: string;
  title: string;
  cited_text: string;
}

export interface SearchQuery {
  query: string;
  results: WebSearchResult[];
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: Date;
  // 웹 검색 관련 필드
  searchQueries?: SearchQuery[];
  citations?: Citation[];
}

export interface StreamEvent {
  type: string;
  index?: number;
  delta?: {
    type: string;
    text?: string;
    partial_json?: string;
  };
  content_block?: {
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: { query: string };
    tool_use_id?: string;
    content?: WebSearchResult[];
    citations?: Citation[];
  };
}
