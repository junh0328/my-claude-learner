import { NextRequest } from "next/server";
import { ChatRequest } from "@/types/chat";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, model, webSearchEnabled, apiKey: clientApiKey } = body;

    // 서버 환경변수 우선, 없으면 클라이언트 제공 키 사용
    const apiKey = process.env.ANTHROPIC_API_KEY || clientApiKey;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          type: "missing_api_key",
          message: "API 키가 설정되지 않았습니다.",
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

    // API 요청 본문 구성
    const requestBody: Record<string, unknown> = {
      model: model || "claude-sonnet-4-20250514",
      max_tokens: 4096,
      stream: true,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    };

    // 웹 검색이 활성화된 경우 도구 추가
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

    // 웹 검색 사용 시 베타 헤더 추가
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

      // 에러 응답 파싱
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

          // 사용자 친화적 메시지로 변환
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

    // Stream the response back to the client
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

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        } catch (error) {
          console.error("Stream error:", error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Request error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
