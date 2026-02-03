import { test, expect, Page } from "@playwright/test";

// 더미 Claude SSE 데이터 생성
function createClaudeSSEData(text: string): string {
  const events = [
    `data: {"type":"message_start","message":{"id":"msg_test","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-20250514","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":1}}}\n\n`,
    `data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n`,
  ];

  // 텍스트를 청크로 분할
  for (let i = 0; i < text.length; i += 10) {
    const chunk = text.slice(i, i + 10);
    events.push(
      `data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"${chunk.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"}}\n\n`
    );
  }

  events.push(`data: {"type":"content_block_stop","index":0}\n\n`);
  events.push(
    `data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":50}}\n\n`
  );
  events.push(`data: {"type":"message_stop"}\n\n`);

  return events.join("");
}

// 더미 Gemini SSE 데이터 생성
function createGeminiSSEData(text: string): string {
  const events: string[] = [];

  // 텍스트를 청크로 분할
  for (let i = 0; i < text.length; i += 20) {
    const chunk = text.slice(i, i + 20);
    const escapedChunk = chunk.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
    events.push(
      `data: {"candidates":[{"content":{"parts":[{"text":"${escapedChunk}"}],"role":"model"},"finishReason":"STOP","index":0}]}\n\n`
    );
  }

  return events.join("");
}

// 더미 Groq SSE 데이터 생성 (OpenAI 호환 형식)
function createGroqSSEData(text: string): string {
  const events: string[] = [];

  // 텍스트를 청크로 분할
  for (let i = 0; i < text.length; i += 15) {
    const chunk = text.slice(i, i + 15);
    const escapedChunk = chunk.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
    events.push(
      `data: {"id":"chatcmpl-test","object":"chat.completion.chunk","created":1234567890,"model":"llama-3.3-70b-versatile","choices":[{"index":0,"delta":{"content":"${escapedChunk}"},"finish_reason":null}]}\n\n`
    );
  }

  events.push(`data: [DONE]\n\n`);

  return events.join("");
}

// localStorage에 API 키 설정
async function setApiKeys(
  page: Page,
  keys: { claude?: string; gemini?: string; groq?: string }
) {
  await page.addInitScript((keysData) => {
    const storedKeys = {
      claude: keysData.claude || null,
      gemini: keysData.gemini || null,
      groq: keysData.groq || null,
    };
    localStorage.setItem("ai_api_keys", JSON.stringify(storedKeys));
  }, keys);
}

test.describe("자동 Provider 선택", () => {
  test("Gemini 키만 있으면 Gemini가 자동 선택된다", async ({ page }) => {
    await setApiKeys(page, { gemini: "AIzaSyTestKey" });

    // API 모킹
    await page.route("**/api/chat", async (route) => {
      const sseData = createGeminiSSEData("안녕하세요! Gemini입니다.");
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: sseData,
      });
    });

    await page.goto("/");
    await page.waitForTimeout(500);

    // 초기 안내 메시지 확인
    await expect(page.getByText("준희닷의 AI Chatbot과 대화를 시작하세요")).toBeVisible();

    // 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("안녕하세요");
    const sendButton = page.locator("button.bg-provider-gemini");
    await sendButton.click();

    // Gemini 응답 확인
    await expect(page.locator(".prose")).toContainText("Gemini입니다", { timeout: 10000 });
  });

  test("Groq 키만 있으면 Groq가 자동 선택된다", async ({ page }) => {
    await setApiKeys(page, { groq: "gsk_test-key" });

    // API 모킹
    await page.route("**/api/chat", async (route) => {
      const sseData = createGroqSSEData("안녕하세요! Groq입니다.");
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: sseData,
      });
    });

    await page.goto("/");
    await page.waitForTimeout(500);

    // 초기 안내 메시지 확인
    await expect(page.getByText("준희닷의 AI Chatbot과 대화를 시작하세요")).toBeVisible();

    // 웹 검색 비활성화 확인
    await expect(page.locator("label[for='web-search']")).toContainText("(미지원)");

    // 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("안녕하세요");
    const sendButton = page.locator("button.bg-provider-groq");
    await sendButton.click();

    // Groq 응답 확인
    await expect(page.locator(".prose")).toContainText("Groq입니다", { timeout: 10000 });
  });

  test("Claude 키만 있으면 Claude가 자동 선택된다", async ({ page }) => {
    await setApiKeys(page, { claude: "sk-ant-test-key" });

    // API 모킹
    await page.route("**/api/chat", async (route) => {
      const sseData = createClaudeSSEData("안녕하세요! Claude입니다.");
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: sseData,
      });
    });

    await page.goto("/");
    await page.waitForTimeout(500);

    // 초기 안내 메시지 확인
    await expect(page.getByText("준희닷의 AI Chatbot과 대화를 시작하세요")).toBeVisible();

    // 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("안녕하세요");
    const sendButton = page.locator("button.bg-provider-claude");
    await sendButton.click();

    // Claude 응답 확인
    await expect(page.locator(".prose")).toContainText("Claude입니다", { timeout: 10000 });
  });

  test("FALLBACK_CHAIN 순서대로 선택된다 (Gemini > Groq > Claude)", async ({ page }) => {
    // 모든 키 설정 - Gemini가 우선 선택되어야 함
    await setApiKeys(page, {
      claude: "sk-ant-test-key",
      gemini: "AIzaSyTestKey",
      groq: "gsk_test-key",
    });

    await page.goto("/");
    await page.waitForTimeout(500);

    // Gemini가 선택됨 (FALLBACK_CHAIN에서 첫 번째) - 전송 버튼 색상으로 확인
    await expect(page.getByText("준희닷의 AI Chatbot과 대화를 시작하세요")).toBeVisible();
    await expect(page.locator("button.bg-provider-gemini")).toBeVisible();
  });

  test("Groq와 Claude 키만 있으면 Groq가 선택된다", async ({ page }) => {
    await setApiKeys(page, {
      claude: "sk-ant-test-key",
      groq: "gsk_test-key",
    });

    await page.goto("/");
    await page.waitForTimeout(500);

    // Groq가 선택됨 (FALLBACK_CHAIN에서 Gemini 다음) - 전송 버튼 색상으로 확인
    await expect(page.getByText("준희닷의 AI Chatbot과 대화를 시작하세요")).toBeVisible();
    await expect(page.locator("button.bg-provider-groq")).toBeVisible();
  });
});

test.describe("429 폴백 기능", () => {
  test("Gemini 429 에러 시 Groq로 자동 폴백된다", async ({ page }) => {
    await setApiKeys(page, {
      groq: "gsk_test-key",
      gemini: "AIzaSyTestKey",
    });

    let requestCount = 0;

    // API 모킹 - Gemini는 429, Groq는 성공
    await page.route("**/api/chat", async (route) => {
      const postData = route.request().postDataJSON();
      requestCount++;

      if (postData.provider === "gemini") {
        // Gemini 429 에러 반환
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            type: "rate_limit_error",
            message: "요청 한도를 초과했습니다.",
          }),
        });
      } else if (postData.provider === "groq") {
        // Groq 정상 응답
        const sseData = createGroqSSEData("폴백 성공! Groq가 응답합니다.");
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          headers: {
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
          body: sseData,
        });
      }
    });

    await page.goto("/");
    await page.waitForTimeout(500);

    // Gemini가 자동 선택됨
    const textarea = page.locator("textarea");
    await textarea.fill("안녕하세요");

    const sendButton = page.locator("button.bg-provider-gemini");
    await sendButton.click();

    // Groq 응답 확인
    await expect(page.locator(".prose")).toContainText("폴백 성공", { timeout: 10000 });

    // InfoBanner 표시 확인
    await expect(page.locator("text=Groq로 자동 전환되었습니다")).toBeVisible();

    // 2번 요청됨 (Gemini 실패 + Groq 성공)
    expect(requestCount).toBe(2);
  });

  test("Gemini 429 → Groq 429 → Claude 체인 폴백", async ({ page }) => {
    await setApiKeys(page, {
      claude: "sk-ant-test-key",
      groq: "gsk_test-key",
      gemini: "AIzaSyTestKey",
    });

    let requestCount = 0;

    // API 모킹 - Gemini, Groq 429, Claude 성공
    await page.route("**/api/chat", async (route) => {
      const postData = route.request().postDataJSON();
      requestCount++;

      if (postData.provider === "gemini" || postData.provider === "groq") {
        // 429 에러 반환
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            type: "rate_limit_error",
            message: "요청 한도를 초과했습니다.",
          }),
        });
      } else if (postData.provider === "claude") {
        // Claude 정상 응답
        const sseData = createClaudeSSEData("체인 폴백 성공! Claude가 응답합니다.");
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          headers: {
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
          body: sseData,
        });
      }
    });

    await page.goto("/");
    await page.waitForTimeout(500);

    const textarea = page.locator("textarea");
    await textarea.fill("안녕하세요");

    const sendButton = page.locator("button.bg-provider-gemini");
    await sendButton.click();

    // Claude 응답 확인
    await expect(page.locator(".prose")).toContainText("체인 폴백 성공", { timeout: 10000 });

    // InfoBanner 표시 확인 (최종 폴백 대상인 Claude 표시)
    await expect(page.locator("text=Claude로 자동 전환되었습니다")).toBeVisible();

    // 3번 요청됨 (Gemini 실패 + Groq 실패 + Claude 성공)
    expect(requestCount).toBe(3);
  });

  test("폴백 키 없을 때 429 발생 시 에러 표시", async ({ page }) => {
    // Gemini 키만 설정 (다른 키 없음)
    await setApiKeys(page, {
      gemini: "AIzaSyTestKey",
    });

    // API 모킹 - 429 에러
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          type: "rate_limit_error",
          message: "요청 한도를 초과했습니다.",
        }),
      });
    });

    await page.goto("/");
    await page.waitForTimeout(500);

    const textarea = page.locator("textarea");
    await textarea.fill("안녕하세요");

    const sendButton = page.locator("button.bg-provider-gemini");
    await sendButton.click();

    // ErrorBanner 표시 확인 (폴백 없이 에러)
    await expect(page.locator("text=요청 한도 초과")).toBeVisible({ timeout: 5000 });

    // InfoBanner는 표시되지 않음
    await expect(page.locator("text=자동 전환되었습니다")).not.toBeVisible();
  });

  test("폴백 후 InfoBanner 닫기 가능", async ({ page }) => {
    await setApiKeys(page, {
      claude: "sk-ant-test-key",
      gemini: "AIzaSyTestKey",
    });

    // API 모킹
    await page.route("**/api/chat", async (route) => {
      const postData = route.request().postDataJSON();

      if (postData.provider === "gemini") {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            type: "rate_limit_error",
            message: "요청 한도를 초과했습니다.",
          }),
        });
      } else {
        const sseData = createClaudeSSEData("폴백 응답입니다.");
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          headers: {
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
          body: sseData,
        });
      }
    });

    await page.goto("/");
    await page.waitForTimeout(500);

    const textarea = page.locator("textarea");
    await textarea.fill("테스트");

    const sendButton = page.locator("button.bg-provider-gemini");
    await sendButton.click();

    // InfoBanner 표시 확인
    const infoBanner = page.locator("text=Claude로 자동 전환되었습니다");
    await expect(infoBanner).toBeVisible({ timeout: 10000 });

    // 닫기 버튼 클릭 (InfoBanner 내의 X 버튼)
    const closeButton = page.locator(".bg-blue-500\\/10 button");
    await closeButton.click();

    // InfoBanner 사라짐 확인
    await expect(infoBanner).not.toBeVisible();
  });
});

test.describe("API Key 다이얼로그", () => {
  test("API 키가 없으면 다이얼로그가 표시된다", async ({ page }) => {
    // API 키 없이 페이지 로드
    await page.goto("/");

    // 다이얼로그 표시 확인
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toContainText("API Key 설정");
  });

  test("다이얼로그에 Claude/Gemini/Groq 탭이 있다", async ({ page }) => {
    await page.goto("/");

    // 탭 확인
    await expect(page.locator('[role="tab"]', { hasText: "Claude" })).toBeVisible();
    await expect(page.locator('[role="tab"]', { hasText: "Gemini" })).toBeVisible();
    await expect(page.locator('[role="tab"]', { hasText: "Groq" })).toBeVisible();
  });

  test("API 키 저장 후 다이얼로그가 닫힌다", async ({ page }) => {
    await page.goto("/");

    // Gemini 탭을 클릭하여 Gemini 키 입력
    await page.locator('[role="tab"]', { hasText: "Gemini" }).click();

    // Gemini 키 입력
    const input = page.locator('input[type="password"]');
    await input.fill("AIzaSyTestKey12345");

    // 저장 버튼 클릭
    await page.locator('button', { hasText: "저장" }).click();

    // 다이얼로그 닫힘 확인
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test("설정 버튼으로 다이얼로그를 열 수 있다", async ({ page }) => {
    // Gemini 키가 있어야 다이얼로그가 자동으로 열리지 않음
    await setApiKeys(page, { gemini: "AIzaSyTestKey" });
    await page.goto("/");
    await page.waitForTimeout(500);

    // 설정 버튼 클릭
    const settingsButton = page.locator('button[title="API Key 설정"]');
    await settingsButton.click();

    // 다이얼로그 표시 확인
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });
});
