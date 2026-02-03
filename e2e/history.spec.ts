import { test, expect, Page } from "@playwright/test";

// 더미 Gemini SSE 데이터 생성
function createGeminiSSEData(text: string): string {
  const events: string[] = [];

  // 텍스트를 청크로 분할
  for (let i = 0; i < text.length; i += 20) {
    const chunk = text.slice(i, i + 20);
    const escapedChunk = chunk
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");
    events.push(
      `data: {"candidates":[{"content":{"parts":[{"text":"${escapedChunk}"}],"role":"model"},"finishReason":"STOP","index":0}]}\n\n`
    );
  }

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

// localStorage 초기화
async function clearHistory(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem("chat_history");
    localStorage.removeItem("current_session_id");
  });
}

test.describe("대화 히스토리 기능", () => {
  test.beforeEach(async ({ page }) => {
    await clearHistory(page);
    await setApiKeys(page, { gemini: "AIzaSyTestKey" });

    // API 모킹
    await page.route("**/api/chat", async (route) => {
      const postData = route.request().postDataJSON();
      const userMessage = postData.messages[postData.messages.length - 1].content;
      const responseText = `${userMessage}에 대한 응답입니다.`;
      const sseData = createGeminiSSEData(responseText);
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
  });

  test("새 대화 시 세션이 자동 생성된다", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    // 히스토리 사이드바 열기
    const historyButton = page.locator('button[title="대화 기록"]');
    await historyButton.click();

    // Sheet 내의 세션 목록에서 "새 대화" 확인
    const sidebar = page.locator('[data-slot="sheet-content"]');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText("새 대화").nth(1)).toBeVisible(); // 세션 제목
    await expect(sidebar.getByText("0개 메시지")).toBeVisible();
  });

  test("메시지 전송 시 히스토리에 저장된다", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    // 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("안녕하세요 테스트입니다");
    const sendButton = page.locator("button.bg-provider-gemini");
    await sendButton.click();

    // 응답 대기
    await expect(page.locator(".prose")).toContainText("응답입니다", {
      timeout: 10000,
    });

    // 히스토리 사이드바 열기
    const historyButton = page.locator('button[title="대화 기록"]');
    await historyButton.click();

    // 사이드바 내에서 세션 제목 확인
    const sidebar = page.locator('[data-slot="sheet-content"]');
    await expect(sidebar.getByText("안녕하세요 테스트입니다")).toBeVisible();
    await expect(sidebar.getByText("2개 메시지")).toBeVisible();
  });

  test("히스토리 사이드바 열기/닫기", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    // 사이드바 열기
    const historyButton = page.locator('button[title="대화 기록"]');
    await historyButton.click();

    // 사이드바 표시 확인
    const sidebar = page.locator('[data-slot="sheet-content"]');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText("대화 기록")).toBeVisible();

    // 오버레이 클릭으로 닫기
    await page.locator('[data-slot="sheet-overlay"]').click({ force: true });

    // 사이드바 닫힘 확인
    await expect(sidebar).not.toBeVisible();
  });

  test("새 대화 버튼으로 새 세션 생성", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    // 첫 번째 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("첫 번째 대화");
    await page.locator("button.bg-provider-gemini").click();

    await expect(page.locator(".prose")).toContainText("응답입니다", {
      timeout: 10000,
    });

    // 히스토리 열고 새 대화 버튼 클릭
    await page.locator('button[title="대화 기록"]').click();
    const sidebar = page.locator('[data-slot="sheet-content"]');
    await sidebar.getByRole("button", { name: "새 대화" }).click();

    // 사이드바 닫힘 후 빈 대화 화면
    await expect(
      page.getByText("준희닷의 AI Chatbot과 대화를 시작하세요")
    ).toBeVisible();

    // 히스토리에 2개 세션 확인
    await page.locator('button[title="대화 기록"]').click();
    await expect(sidebar.getByText("0개 메시지")).toBeVisible(); // 새 세션
    await expect(sidebar.getByText("2개 메시지")).toBeVisible(); // 이전 세션
  });

  test("세션 선택 시 메시지 로드", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    // 첫 번째 세션에서 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("첫 번째 세션 메시지");
    await page.locator("button.bg-provider-gemini").click();

    await expect(page.locator(".prose")).toContainText("응답입니다", {
      timeout: 10000,
    });

    // 새 세션 생성
    await page.locator('button[title="대화 기록"]').click();
    const sidebar = page.locator('[data-slot="sheet-content"]');
    await sidebar.getByRole("button", { name: "새 대화" }).click();

    // 새 세션에서 메시지 전송
    await textarea.fill("두 번째 세션 메시지");
    await page.locator("button.bg-provider-gemini").click();

    await expect(page.locator(".prose").last()).toContainText("응답입니다", {
      timeout: 10000,
    });

    // 히스토리에서 첫 번째 세션 선택
    await page.locator('button[title="대화 기록"]').click();
    await sidebar.getByText("첫 번째 세션 메시지").click();

    // 첫 번째 세션 메시지가 로드됨
    await expect(page.locator(".prose").first()).toContainText("첫 번째 세션 메시지");
  });

  test("세션 삭제 기능", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    // 첫 번째 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("삭제될 세션");
    await page.locator("button.bg-provider-gemini").click();

    await expect(page.locator(".prose")).toContainText("응답입니다", {
      timeout: 10000,
    });

    // 두 번째 세션 생성
    await page.locator('button[title="대화 기록"]').click();
    const sidebar = page.locator('[data-slot="sheet-content"]');
    await sidebar.getByRole("button", { name: "새 대화" }).click();

    await textarea.fill("유지될 세션");
    await page.locator("button.bg-provider-gemini").click();

    await expect(page.locator(".prose").last()).toContainText("응답입니다", {
      timeout: 10000,
    });

    // 히스토리 열기
    await page.locator('button[title="대화 기록"]').click();

    // 2개 세션 확인
    await expect(sidebar.getByText("삭제될 세션")).toBeVisible();
    await expect(sidebar.getByText("유지될 세션")).toBeVisible();

    // 첫 번째 세션 (삭제될 세션) 삭제
    const sessionItem = sidebar.locator(".group").filter({ hasText: "삭제될 세션" });
    await sessionItem.hover();

    const deleteButton = sessionItem.locator('button[title="삭제"]');
    await deleteButton.click();

    // 삭제된 세션 확인, 유지된 세션 확인
    await expect(sidebar.getByText("삭제될 세션")).not.toBeVisible();
    await expect(sidebar.getByText("유지될 세션")).toBeVisible();
  });

  test("대화 초기화 버튼 → 새 세션 시작", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    // 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("테스트 메시지");
    await page.locator("button.bg-provider-gemini").click();

    await expect(page.locator(".prose")).toContainText("응답입니다", {
      timeout: 10000,
    });

    // 대화 초기화 버튼 클릭
    await page.getByRole("button", { name: "대화 초기화" }).click();

    // 빈 대화 화면
    await expect(
      page.getByText("준희닷의 AI Chatbot과 대화를 시작하세요")
    ).toBeVisible();

    // 히스토리에 이전 세션 유지 확인
    await page.locator('button[title="대화 기록"]').click();
    const sidebar = page.locator('[data-slot="sheet-content"]');
    await expect(sidebar.getByText("2개 메시지")).toBeVisible();
    await expect(sidebar.getByText("0개 메시지")).toBeVisible();
  });

});

// 새로고침 테스트 (별도 describe - clearHistory 없음)
test.describe("대화 히스토리 새로고침", () => {
  test("새로고침 후 메시지 유지", async ({ page }) => {
    // API 키 설정 (clearHistory 없음)
    await page.addInitScript(() => {
      localStorage.setItem(
        "ai_api_keys",
        JSON.stringify({ gemini: "AIzaSyTestKey", claude: null, groq: null })
      );
    });

    // API 모킹
    await page.route("**/api/chat", async (route) => {
      const postData = route.request().postDataJSON();
      const userMessage = postData.messages[postData.messages.length - 1].content;
      const responseText = `${userMessage}에 대한 응답입니다.`;

      const events: string[] = [];
      for (let i = 0; i < responseText.length; i += 20) {
        const chunk = responseText.slice(i, i + 20);
        const escapedChunk = chunk
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"')
          .replace(/\n/g, "\\n");
        events.push(
          `data: {"candidates":[{"content":{"parts":[{"text":"${escapedChunk}"}],"role":"model"},"finishReason":"STOP","index":0}]}\n\n`
        );
      }

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: events.join(""),
      });
    });

    await page.goto("/");
    await page.waitForTimeout(500);

    // 메시지 전송
    const textarea = page.locator("textarea");
    await textarea.fill("새로고침 테스트");
    await page.locator("button.bg-provider-gemini").click();

    await expect(page.locator(".prose")).toContainText("응답입니다", {
      timeout: 10000,
    });

    // 현재 세션 ID 저장
    const currentSessionId = await page.evaluate(() => {
      return localStorage.getItem("current_session_id");
    });

    // 페이지 새로고침
    await page.reload();
    await page.waitForTimeout(1000);

    // 세션 ID 복원 확인
    const restoredSessionId = await page.evaluate(() => {
      return localStorage.getItem("current_session_id");
    });
    expect(restoredSessionId).toBe(currentSessionId);

    // 메시지 유지 확인
    await expect(page.locator(".prose").first()).toContainText("새로고침 테스트", {
      timeout: 5000,
    });
    await expect(page.locator(".prose").last()).toContainText("응답입니다");
  });
});
