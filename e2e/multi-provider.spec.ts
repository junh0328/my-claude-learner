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
  keys: { claude?: string; gemini?: string }
) {
  await page.addInitScript((keysData) => {
    const storedKeys = {
      claude: keysData.claude || null,
      gemini: keysData.gemini || null,
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
  });

  test("기본 Provider는 Claude이다", async ({ page }) => {
    // Provider 그룹 내 Claude 버튼이 활성화 상태
    const providerGroup = page.locator(".flex.rounded-lg.border");
    const claudeButton = providerGroup.locator("button", { hasText: "Claude" });
    await expect(claudeButton).toHaveClass(/bg-provider-claude/);

    // 헤더에 Claude Chat 표시
    await expect(page.locator("h1")).toContainText("Claude Chat");
  });

  test("Gemini로 전환하면 UI가 변경된다", async ({ page }) => {
    // Provider 그룹 내 Gemini 버튼 클릭
    const providerGroup = page.locator(".flex.rounded-lg.border");
    const geminiButton = providerGroup.locator("button", { hasText: "Gemini" });
    await geminiButton.click();

    // Gemini 버튼이 활성화 상태
    await expect(geminiButton).toHaveClass(/bg-provider-gemini/);

    // 헤더에 Gemini Chat 표시
    await expect(page.locator("h1")).toContainText("Gemini Chat");
  });

  test("Provider 변경 시 모델 목록이 변경된다", async ({ page }) => {
    // Claude 모델 확인
    const modelSelect = page.locator('[role="combobox"]');
    await modelSelect.click();
    await expect(page.locator('[role="option"]', { hasText: "Claude Sonnet 4" })).toBeVisible();
    await page.keyboard.press("Escape");

    // Gemini로 전환
    const providerGroup = page.locator(".flex.rounded-lg.border");
    const geminiButton = providerGroup.locator("button", { hasText: "Gemini" });
    await geminiButton.click();

    // Gemini 모델 확인 (첫 번째 모델인 Gemini 2.5 Pro Exp)
    await modelSelect.click();
    await expect(page.locator('[role="option"]', { hasText: "Gemini 2.5 Pro (Exp)" })).toBeVisible();
  });
});

test.describe("Multi-Provider 스트리밍", () => {
  test("Claude 스트리밍이 정상 동작한다", async ({ page }) => {
    await setApiKeys(page, { claude: "sk-ant-test-key" });

    // API 모킹을 페이지 로드 전에 설정
    await setupApiMock(page, "claude", "안녕하세요! Claude입니다.");

    await page.goto("/");
    await page.waitForTimeout(500);

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
      claude: "sk-ant-test-key",
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

    // Gemini로 전환
    const providerGroup = page.locator(".flex.rounded-lg.border");
    const geminiButton = providerGroup.locator("button", { hasText: "Gemini" });
    await geminiButton.click();

    // 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("안녕하세요");

    // 전송 버튼 클릭
    const sendButton = page.locator("button.bg-provider-gemini").last();
    await sendButton.click();

    // 응답 확인
    await expect(page.locator(".prose")).toContainText("Gemini입니다", { timeout: 10000 });
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

  test("다이얼로그에 Claude/Gemini 탭이 있다", async ({ page }) => {
    await page.goto("/");

    // 탭 확인
    await expect(page.locator('[role="tab"]', { hasText: "Claude" })).toBeVisible();
    await expect(page.locator('[role="tab"]', { hasText: "Gemini" })).toBeVisible();
  });

  test("API 키 저장 후 다이얼로그가 닫힌다", async ({ page }) => {
    await page.goto("/");

    // Claude 키 입력
    const input = page.locator('input[type="password"]');
    await input.fill("sk-ant-test-key-12345");

    // 저장 버튼 클릭
    await page.locator('button', { hasText: "저장" }).click();

    // 다이얼로그 닫힘 확인
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test("설정 버튼으로 다이얼로그를 열 수 있다", async ({ page }) => {
    await setApiKeys(page, { claude: "sk-ant-test-key" });
    await page.goto("/");
    await page.waitForTimeout(500);

    // 설정 버튼 클릭
    const settingsButton = page.locator('button[title="API Key 설정"]');
    await settingsButton.click();

    // 다이얼로그 표시 확인
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });
});
