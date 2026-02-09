import { NextRequest } from "next/server";
import { ChatRequest, Provider } from "@/types/chat";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Claude API 호출
async function handleClaudeRequest(
  body: ChatRequest,
  apiKey: string
): Promise<Response> {
  const { messages, model, webSearchEnabled } = body;

  const requestBody: Record<string, unknown> = {
    model: model || "claude-sonnet-4-20250514",
    max_tokens: 4096,
    stream: true,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  };

  if (webSearchEnabled) {
    requestBody.tools = [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 5,
      },
    ];
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };

  if (webSearchEnabled) {
    headers["anthropic-beta"] = "web-search-2025-03-05";
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Anthropic API error:", errorText);

    let errorResponse: {
      type: string;
      message: string;
      errorCode?: string;
    } = {
      type: "unknown_error",
      message: "알 수 없는 오류가 발생했습니다.",
    };

    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) {
        const errorType = parsed.error.type || "api_error";
        let userMessage = parsed.error.message || errorText;

        switch (errorType) {
          case "rate_limit_error":
            userMessage = "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
            break;
          case "authentication_error":
            userMessage = "API 인증에 실패했습니다. API 키를 확인해주세요.";
            break;
          case "invalid_request_error":
            userMessage = "잘못된 요청입니다. 메시지를 확인해주세요.";
            break;
          case "overloaded_error":
            userMessage = "서버가 과부하 상태입니다. 잠시 후 다시 시도해주세요.";
            break;
          case "api_error":
            userMessage = "API 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
            break;
        }

        errorResponse = {
          type: errorType,
          message: userMessage,
          errorCode: parsed.request_id,
        };
      }
    } catch {
      // JSON 파싱 실패 시 기본 에러 메시지 사용
    }

    return new Response(JSON.stringify(errorResponse), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Stream the response
  return createStreamResponse(response);
}

// Gemini API 호출
async function handleGeminiRequest(
  body: ChatRequest,
  apiKey: string
): Promise<Response> {
  const { messages, model, webSearchEnabled } = body;

  const geminiModel = model || "gemini-2.5-flash";
  const url = `${GEMINI_API_BASE}/${geminiModel}:streamGenerateContent?alt=sse&key=${apiKey}`;

  // Gemini 형식으로 메시지 변환
  const contents = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: 8192,
    },
  };

  // 웹 검색 도구 추가
  if (webSearchEnabled) {
    requestBody.tools = [{ google_search: {} }];
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", errorText);

    let errorResponse: {
      type: string;
      message: string;
      errorCode?: string;
    } = {
      type: "unknown_error",
      message: "알 수 없는 오류가 발생했습니다.",
    };

    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) {
        const errorCode = parsed.error.code;
        let userMessage = parsed.error.message || errorText;

        switch (errorCode) {
          case 429:
            userMessage = "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
            break;
          case 401:
          case 403:
            userMessage = "API 인증에 실패했습니다. API 키를 확인해주세요.";
            break;
          case 400:
            userMessage = "잘못된 요청입니다. 메시지를 확인해주세요.";
            break;
          case 503:
            userMessage = "서버가 과부하 상태입니다. 잠시 후 다시 시도해주세요.";
            break;
        }

        errorResponse = {
          type: `gemini_error_${errorCode}`,
          message: userMessage,
          errorCode: parsed.error.status,
        };
      }
    } catch {
      // JSON 파싱 실패
    }

    return new Response(JSON.stringify(errorResponse), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Stream the response
  return createStreamResponse(response);
}

// Groq API 호출
async function handleGroqRequest(
  body: ChatRequest,
  apiKey: string
): Promise<Response> {
  const { messages, model } = body;

  const requestBody = {
    model: model || "llama-3.3-70b-versatile",
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    stream: true,
    max_tokens: 4096,
  };

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq API error:", errorText);

    let errorResponse: {
      type: string;
      message: string;
      errorCode?: string;
    } = {
      type: "unknown_error",
      message: "알 수 없는 오류가 발생했습니다.",
    };

    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) {
        const statusCode = response.status;
        let userMessage = parsed.error.message || errorText;

        switch (statusCode) {
          case 429:
            userMessage = "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
            break;
          case 401:
          case 403:
            userMessage = "API 인증에 실패했습니다. API 키를 확인해주세요.";
            break;
          case 400:
            userMessage = "잘못된 요청입니다. 메시지를 확인해주세요.";
            break;
          case 503:
            userMessage = "서버가 과부하 상태입니다. 잠시 후 다시 시도해주세요.";
            break;
        }

        errorResponse = {
          type: statusCode === 429 ? "rate_limit_error" : `groq_error_${statusCode}`,
          message: userMessage,
          errorCode: parsed.error.code,
        };
      }
    } catch {
      // JSON 파싱 실패
    }

    return new Response(JSON.stringify(errorResponse), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Stream the response
  return createStreamResponse(response);
}

// AI API의 SSE 스트림을 클라이언트로 직접 패스스루.
// response.body를 가공 없이 그대로 전달하여:
// 1) 불필요한 TextDecoder → TextEncoder 변환 오버헤드 제거
// 2) chunk 순서가 중간 처리 과정에서 뒤바뀔 가능성 원천 차단
function createStreamResponse(response: Response): Response {
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// API 키 검증
function validateApiKey(provider: Provider, apiKey: string): boolean {
  if (provider === "claude") {
    return apiKey.startsWith("sk-ant-");
  } else if (provider === "gemini") {
    return apiKey.startsWith("AIzaSy");
  } else if (provider === "groq") {
    return apiKey.startsWith("gsk_");
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, provider, apiKey: clientApiKey } = body;

    // Provider별 환경변수 키 또는 클라이언트 키 사용
    let apiKey: string | undefined;
    if (provider === "claude") {
      apiKey = process.env.ANTHROPIC_API_KEY || clientApiKey;
    } else if (provider === "gemini") {
      apiKey = process.env.GEMINI_API_KEY || clientApiKey;
    } else if (provider === "groq") {
      apiKey = process.env.GROQ_API_KEY || clientApiKey;
    }

    const providerNames: Record<Provider, string> = {
      claude: "Anthropic",
      gemini: "Gemini",
      groq: "Groq",
    };

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          type: "missing_api_key",
          message: `${providerNames[provider]} API 키가 설정되지 않았습니다.`,
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // API 키 형식 검증
    if (!validateApiKey(provider, apiKey)) {
      return new Response(
        JSON.stringify({
          type: "invalid_api_key",
          message: `올바른 ${providerNames[provider]} API 키 형식이 아닙니다.`,
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Provider별 API 호출
    if (provider === "claude") {
      return handleClaudeRequest(body, apiKey);
    } else if (provider === "gemini") {
      return handleGeminiRequest(body, apiKey);
    } else if (provider === "groq") {
      return handleGroqRequest(body, apiKey);
    }

    return new Response(
      JSON.stringify({ error: "Invalid provider" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Request error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
