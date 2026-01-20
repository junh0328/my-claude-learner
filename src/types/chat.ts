export type Role = "user" | "assistant";

export type ClaudeModel =
  | "claude-sonnet-4-20250514"
  | "claude-opus-4-20250514"
  | "claude-3-5-haiku-20241022";

export interface ModelOption {
  id: ClaudeModel;
  name: string;
  description: string;
}

export const CLAUDE_MODELS: ModelOption[] = [
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    description: "균형 잡힌 성능",
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    description: "최고 성능",
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    description: "최고 속도",
  },
];

export interface ChatRequest {
  messages: Pick<Message, "role" | "content">[];
  model: ClaudeModel;
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
