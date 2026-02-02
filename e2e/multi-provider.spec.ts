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

// API 모킹 설정
async function setupApiMock(
  page: Page,
  provider: "claude" | "gemini",
  responseText: string
) {
  await page.route("**/api/chat", async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    // Provider 확인
    if (postData.provider !== provider) {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Provider mismatch" }),
      });
      return;
    }

    const sseData =
      provider === "claude"
        ? createClaudeSSEData(responseText)
        : createGeminiSSEData(responseText);

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

test.describe("Multi-Provider UI", () => {
  test.beforeEach(async ({ page }) => {
    // 테스트용 API 키 설정
    await setApiKeys(page, {
      claude: "sk-ant-test-key",
      gemini: "AIzaSyTestKey",
      groq: "gsk_test-key",
    });
    await page.goto("/");
    // 다이얼로그가 닫힐 때까지 대기
    await page.waitForTimeout(500);
  });

  test("Provider 선택 버튼이 표시된다", async ({ page }) => {
    // Provider 선택 버튼 그룹 내의 버튼들 확인
    const providerGroup = page.locator(".flex.rounded-lg.border");
    await expect(providerGroup).toBeVisible();

    // Claude 버튼
    await expect(providerGroup.locator("button", { hasText: "Claude" })).toBeVisible();

    // Gemini 버튼
    await expect(providerGroup.locator("button", { hasText: "Gemini" })).toBeVisible();

    // Groq 버튼
    await expect(providerGroup.locator("button", { hasText: "Groq" })).toBeVisible();
  });

  test("기본 Provider는 Gemini이다", async ({ page }) => {
    // Provider 그룹 내 Gemini 버튼이 활성화 상태
    const providerGroup = page.locator(".flex.rounded-lg.border");
    const geminiButton = providerGroup.locator("button", { hasText: "Gemini" });
    await expect(geminiButton).toHaveClass(/bg-provider-gemini/);

    // 헤더에 Gemini Chat 표시
    await expect(page.locator("h1")).toContainText("Gemini Chat");
  });

  test("Claude로 전환하면 UI가 변경된다", async ({ page }) => {
    // Provider 그룹 내 Claude 버튼 클릭
    const providerGroup = page.locator(".flex.rounded-lg.border");
    const claudeButton = providerGroup.locator("button", { hasText: "Claude" });
    await claudeButton.click();

    // Claude 버튼이 활성화 상태
    await expect(claudeButton).toHaveClass(/bg-provider-claude/);

    // 헤더에 Claude Chat 표시
    await expect(page.locator("h1")).toContainText("Claude Chat");
  });

  test("Groq로 전환하면 UI가 변경된다", async ({ page }) => {
    // Provider 그룹 내 Groq 버튼 클릭
    const providerGroup = page.locator(".flex.rounded-lg.border");
    const groqButton = providerGroup.locator("button", { hasText: "Groq" });
    await groqButton.click();

    // Groq 버튼이 활성화 상태
    await expect(groqButton).toHaveClass(/bg-provider-groq/);

    // 헤더에 Groq Chat 표시
    await expect(page.locator("h1")).toContainText("Groq Chat");
  });

  test("Groq 선택 시 웹 검색이 비활성화된다", async ({ page }) => {
    // Groq로 전환
    const providerGroup = page.locator(".flex.rounded-lg.border");
    const groqButton = providerGroup.locator("button", { hasText: "Groq" });
    await groqButton.click();

    // 웹 검색 라벨에 "(미지원)" 표시 확인
    await expect(page.locator("label[for='web-search']")).toContainText("(미지원)");

    // 웹 검색 스위치가 비활성화 상태
    const webSearchSwitch = page.locator("#web-search");
    await expect(webSearchSwitch).toBeDisabled();
  });

  test("Provider 변경 시 모델 목록이 변경된다", async ({ page }) => {
    // Gemini 모델 확인 (기본 Provider)
    const modelSelect = page.locator('[role="combobox"]');
    await modelSelect.click();
    await expect(page.locator('[role="option"]', { hasText: "Gemini 2.5 Flash Lite" })).toBeVisible();
    await page.keyboard.press("Escape");

    // Claude로 전환
    const providerGroup = page.locator(".flex.rounded-lg.border");
    const claudeButton = providerGroup.locator("button", { hasText: "Claude" });
    await claudeButton.click();

    // Claude 모델 확인
    await modelSelect.click();
    await expect(page.locator('[role="option"]', { hasText: "Claude Sonnet 4" })).toBeVisible();
    await page.keyboard.press("Escape");

    // Groq로 전환
    const groqButton = providerGroup.locator("button", { hasText: "Groq" });
    await groqButton.click();

    // Groq 모델 확인
    await modelSelect.click();
    await expect(page.locator('[role="option"]', { hasText: "Llama 3.3 70B" })).toBeVisible();
  });
});

test.describe("Multi-Provider 스트리밍", () => {
  test("Claude 스트리밍이 정상 동작한다", async ({ page }) => {
    await setApiKeys(page, {
      claude: "sk-ant-test-key",
      gemini: "AIzaSyTestKey",
    });

    // API 모킹을 페이지 로드 전에 설정
    await setupApiMock(page, "claude", "안녕하세요! Claude입니다.");

    await page.goto("/");
    await page.waitForTimeout(500);

    // Claude로 전환 (기본은 Gemini)
    const providerGroup = page.locator(".flex.rounded-lg.border");
    const claudeButton = providerGroup.locator("button", { hasText: "Claude" });
    await claudeButton.click();

    // 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("안녕하세요");

    // 전송 버튼 클릭 (SVG 아이콘이 있는 버튼)
    const sendButton = page.locator("button.bg-provider-claude").last();
    await sendButton.click();

    // 응답 확인
    await expect(page.locator(".prose")).toContainText("Claude입니다", { timeout: 10000 });
  });

  test("Gemini 스트리밍이 정상 동작한다", async ({ page }) => {
    await setApiKeys(page, {
      gemini: "AIzaSyTestKey",
    });

    // API 모킹 - 모든 provider 요청 허용
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

    // Gemini가 기본 Provider이므로 바로 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("안녕하세요");

    // 전송 버튼 클릭
    const sendButton = page.locator("button.bg-provider-gemini").last();
    await sendButton.click();

    // 응답 확인
    await expect(page.locator(".prose")).toContainText("Gemini입니다", { timeout: 10000 });
  });

  test("Groq 스트리밍이 정상 동작한다", async ({ page }) => {
    await setApiKeys(page, {
      gemini: "AIzaSyTestKey",  // 기본 provider인 Gemini 키도 설정
      groq: "gsk_test-key",
    });

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

    // Groq로 전환
    const providerGroup = page.locator(".flex.rounded-lg.border");
    const groqButton = providerGroup.locator("button", { hasText: "Groq" });
    await groqButton.click();

    // 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("안녕하세요");

    // 전송 버튼 클릭
    const sendButton = page.locator("button.bg-provider-groq").last();
    await sendButton.click();

    // 응답 확인
    await expect(page.locator(".prose")).toContainText("Groq입니다", { timeout: 10000 });
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

    // Gemini가 기본 Provider이므로 바로 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("안녕하세요");

    const sendButton = page.locator("button.bg-provider-gemini").last();
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

    const sendButton = page.locator("button.bg-provider-gemini").last();
    await sendButton.click();

    // Claude 응답 확인
    await expect(page.locator(".prose")).toContainText("체인 폴백 성공", { timeout: 10000 });

    // InfoBanner 표시 확인 (최종 폴백 대상인 Claude 표시)
    await expect(page.locator("text=Claude로 자동 전환되었습니다")).toBeVisible();

    // 3번 요청됨 (Gemini 실패 + Groq 실패 + Claude 성공)
    expect(requestCount).toBe(3);
  });

  test("Claude 키 없을 때 429 발생 시 에러 표시", async ({ page }) => {
    // Gemini 키만 설정 (Claude 키 없음)
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

    const sendButton = page.locator("button.bg-provider-gemini").last();
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

    const sendButton = page.locator("button.bg-provider-gemini").last();
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

    // Gemini 탭을 클릭하여 Gemini 키 입력 (기본 Provider가 Gemini)
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
    // Gemini 키가 있어야 다이얼로그가 자동으로 열리지 않음 (기본 Provider가 Gemini)
    await setApiKeys(page, { claude: "sk-ant-test-key", gemini: "AIzaSyTestKey" });
    await page.goto("/");
    await page.waitForTimeout(500);

    // 설정 버튼 클릭
    const settingsButton = page.locator('button[title="API Key 설정"]');
    await settingsButton.click();

    // 다이얼로그 표시 확인
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });
});
