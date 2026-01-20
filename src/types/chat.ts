export type Role = "user" | "assistant";

// Provider 타입
export type Provider = "claude" | "gemini";

// Claude 모델 타입
export type ClaudeModel =
  | "claude-sonnet-4-20250514"
  | "claude-opus-4-20250514"
  | "claude-3-5-haiku-20241022";

// Gemini 모델 타입
export type GeminiModel = "gemini-2.5-flash" | "gemini-2.0-flash";

// 통합 AI 모델 타입
export type AIModel = ClaudeModel | GeminiModel;

export interface ModelOption {
  id: AIModel;
  name: string;
  description: string;
  provider: Provider;
}

export const CLAUDE_MODELS: ModelOption[] = [
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    description: "균형 잡힌 성능",
    provider: "claude",
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    description: "최고 성능",
    provider: "claude",
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    description: "최고 속도",
    provider: "claude",
  },
];

export const GEMINI_MODELS: ModelOption[] = [
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "빠른 응답",
    provider: "gemini",
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "안정적 성능",
    provider: "gemini",
  },
];

// Provider별 모델 목록
export const MODELS_BY_PROVIDER: Record<Provider, ModelOption[]> = {
  claude: CLAUDE_MODELS,
  gemini: GEMINI_MODELS,
};

// 전체 모델 목록
export const ALL_MODELS: ModelOption[] = [...CLAUDE_MODELS, ...GEMINI_MODELS];

export interface ChatRequest {
  messages: Pick<Message, "role" | "content">[];
  model: AIModel;
  provider: Provider;
  webSearchEnabled?: boolean;
  apiKey?: string;
}

// 웹 검색 관련 타입
export interface WebSearchResult {
  url: string;
  title: string;
  page_age?: string;
}

export interface Citation {
  type: "web_search_result_location";
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
