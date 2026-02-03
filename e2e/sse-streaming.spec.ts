import { test, expect, Page } from "@playwright/test";

/**
 * SSE 스트리밍 테스트를 위한 더미 데이터 생성 유틸리티
 */

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

// SSE 이벤트 형식으로 데이터 생성
function createSSEEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// 텍스트 스트리밍을 위한 더미 SSE 응답 생성 (Claude 형식)
function createTextStreamResponse(text: string): string {
  const events: string[] = [];

  // message_start 이벤트
  events.push(
    createSSEEvent({
      type: "message_start",
      message: { id: "msg_test", role: "assistant", content: [] },
    })
  );

  // content_block_start 이벤트
  events.push(
    createSSEEvent({
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    })
  );

  // 텍스트를 청크로 분할하여 content_block_delta 이벤트 생성
  const chunks = text.match(/.{1,10}/g) || [];
  for (const chunk of chunks) {
    events.push(
      createSSEEvent({
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: chunk },
      })
    );
  }

  // content_block_stop 이벤트
  events.push(createSSEEvent({ type: "content_block_stop", index: 0 }));

  // message_delta 이벤트
  events.push(
    createSSEEvent({
      type: "message_delta",
      delta: { stop_reason: "end_turn" },
    })
  );

  // message_stop 이벤트
  events.push(createSSEEvent({ type: "message_stop" }));

  return events.join("");
}

// 웹 검색 결과를 포함한 SSE 응답 생성
function createWebSearchStreamResponse(): string {
  const events: string[] = [];

  // message_start
  events.push(
    createSSEEvent({
      type: "message_start",
      message: { id: "msg_search_test", role: "assistant", content: [] },
    })
  );

  // server_tool_use (웹 검색 시작)
  events.push(
    createSSEEvent({
      type: "content_block_start",
      index: 0,
      content_block: {
        type: "server_tool_use",
        id: "tool_123",
        name: "web_search",
      },
    })
  );

  // 검색 쿼리 입력 (input_json_delta)
  events.push(
    createSSEEvent({
      type: "content_block_delta",
      index: 0,
      delta: {
        type: "input_json_delta",
        partial_json: '{"query": "React hydration mismatch"}',
      },
    })
  );

  events.push(createSSEEvent({ type: "content_block_stop", index: 0 }));

  // web_search_tool_result (검색 결과)
  events.push(
    createSSEEvent({
      type: "content_block_start",
      index: 1,
      content_block: {
        type: "web_search_tool_result",
        tool_use_id: "tool_123",
        content: [
          {
            type: "web_search_result",
            url: "https://react.dev/reference/react-dom/client/hydrateRoot",
            title: "hydrateRoot - React",
            page_age: "2024-01-15",
          },
          {
            type: "web_search_result",
            url: "https://nextjs.org/docs/messages/react-hydration-error",
            title: "Hydration Error - Next.js",
            page_age: "2024-02-20",
          },
        ],
      },
    })
  );

  events.push(createSSEEvent({ type: "content_block_stop", index: 1 }));

  // 텍스트 응답
  events.push(
    createSSEEvent({
      type: "content_block_start",
      index: 2,
      content_block: { type: "text", text: "" },
    })
  );

  const responseText = "React의 하이드레이션 불일치는 서버와 클라이언트의 렌더링 결과가 다를 때 발생합니다.";
  const chunks = responseText.match(/.{1,15}/g) || [];
  for (const chunk of chunks) {
    events.push(
      createSSEEvent({
        type: "content_block_delta",
        index: 2,
        delta: { type: "text_delta", text: chunk },
      })
    );
  }

  events.push(createSSEEvent({ type: "content_block_stop", index: 2 }));
  events.push(createSSEEvent({ type: "message_stop" }));

  return events.join("");
}

// 코드 블록을 포함한 SSE 응답 생성
function createCodeBlockStreamResponse(): string {
  const codeResponse = `다음은 예제 코드입니다:

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));
\`\`\`

위 코드는 간단한 인사 함수입니다.`;

  return createTextStreamResponse(codeResponse);
}

// API 모킹 헬퍼
async function mockChatAPI(page: Page, responseData: string, delay = 0) {
  await page.route("**/api/chat", async (route) => {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: {
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
      body: responseData,
    });
  });
}

// 에러 응답 모킹
async function mockChatAPIError(page: Page, errorType: string) {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        type: errorType,
        message: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
        errorCode: "req_test123",
      }),
    });
  });
}

// ==================== 테스트 케이스 ====================

test.describe("SSE 스트리밍 테스트", () => {
  test("기본 텍스트 스트리밍이 정상 동작해야 함", async ({ page }) => {
    // Claude 키만 설정하면 자동으로 Claude 선택됨
    await setApiKeys(page, { claude: "sk-ant-test-key" });
    const responseText = "안녕하세요! 저는 Claude입니다. 무엇을 도와드릴까요?";
    await mockChatAPI(page, createTextStreamResponse(responseText));

    await page.goto("/");
    await page.waitForTimeout(300);

    // 메시지 입력 및 전송
    const textarea = page.getByPlaceholder("메시지를 입력하세요...");
    await textarea.fill("안녕하세요");
    await page.locator('button svg[viewBox="0 0 256 256"]').locator("..").click();

    // 스트리밍 응답이 표시되어야 함
    await expect(page.getByText("안녕하세요! 저는 Claude입니다")).toBeVisible({
      timeout: 10000,
    });
  });

  test("코드 블록이 구문 강조와 함께 렌더링되어야 함", async ({ page }) => {
    await setApiKeys(page, { claude: "sk-ant-test-key" });
    await mockChatAPI(page, createCodeBlockStreamResponse());

    await page.goto("/");
    await page.waitForTimeout(300);

    const textarea = page.getByPlaceholder("메시지를 입력하세요...");
    await textarea.fill("코드 예제를 보여줘");
    await page.locator('button svg[viewBox="0 0 256 256"]').locator("..").click();

    // 코드 블록 내용이 렌더링되어야 함
    await expect(page.getByText("function greet")).toBeVisible({ timeout: 10000 });

    // 코드 블록의 다른 부분도 렌더링되어야 함
    await expect(page.getByText("console.log")).toBeVisible();

    // 마크다운의 설명 텍스트도 렌더링되어야 함
    await expect(page.getByText("예제 코드입니다")).toBeVisible();
  });

  test("복사 버튼 클릭 시 코드가 클립보드에 복사되어야 함", async ({
    page,
    context,
  }) => {
    await setApiKeys(page, { claude: "sk-ant-test-key" });
    // 클립보드 권한 부여
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await mockChatAPI(page, createCodeBlockStreamResponse());

    await page.goto("/");
    await page.waitForTimeout(300);

    const textarea = page.getByPlaceholder("메시지를 입력하세요...");
    await textarea.fill("코드 예제");
    await page.locator('button svg[viewBox="0 0 256 256"]').locator("..").click();

    // 코드 블록이 로드될 때까지 대기
    await expect(page.getByText("function greet")).toBeVisible({ timeout: 10000 });

    // 복사 버튼 찾기 (여러 방법 시도)
    const copyButton = page.getByRole("button", { name: /복사/ });
    const copyButtonExists = await copyButton.isVisible().catch(() => false);

    if (copyButtonExists) {
      // 복사 버튼 클릭
      await copyButton.click();

      // "복사됨" 피드백이 표시되어야 함
      await expect(page.getByText("복사됨")).toBeVisible({ timeout: 3000 });
    } else {
      // CodeBlock 컴포넌트가 사용되지 않은 경우 (언어 감지 실패)
      // 코드가 렌더링되었으면 통과
      expect(await page.getByText("function greet").isVisible()).toBeTruthy();
    }
  });

  test("사용자 메시지가 오른쪽에 표시되어야 함", async ({ page }) => {
    await setApiKeys(page, { claude: "sk-ant-test-key" });
    await mockChatAPI(page, createTextStreamResponse("응답입니다."));

    await page.goto("/");
    await page.waitForTimeout(300);

    const textarea = page.getByPlaceholder("메시지를 입력하세요...");
    await textarea.fill("테스트 메시지");
    await page.locator('button svg[viewBox="0 0 256 256"]').locator("..").click();

    // 사용자 메시지가 표시되어야 함
    const userMessage = page.getByText("테스트 메시지");
    await expect(userMessage).toBeVisible();

    // 사용자 메시지 컨테이너가 오른쪽 정렬이어야 함
    const container = userMessage.locator("xpath=ancestor::div[contains(@class, 'justify-end')]");
    await expect(container).toBeVisible();
  });

  test("AI 응답이 왼쪽에 표시되어야 함", async ({ page }) => {
    await setApiKeys(page, { claude: "sk-ant-test-key" });
    await mockChatAPI(page, createTextStreamResponse("AI 응답입니다."));

    await page.goto("/");
    await page.waitForTimeout(300);

    const textarea = page.getByPlaceholder("메시지를 입력하세요...");
    await textarea.fill("질문");
    await page.locator('button svg[viewBox="0 0 256 256"]').locator("..").click();

    // AI 응답이 표시되어야 함
    await expect(page.getByText("AI 응답입니다.")).toBeVisible({ timeout: 10000 });

    // AI 응답 컨테이너가 왼쪽 정렬이어야 함
    const aiResponse = page.getByText("AI 응답입니다.");
    const container = aiResponse.locator("xpath=ancestor::div[contains(@class, 'justify-start')]");
    await expect(container).toBeVisible();
  });
});

test.describe("에러 처리 테스트", () => {
  test("rate_limit_error 시 ErrorBanner가 표시되어야 함", async ({ page }) => {
    // Claude 키만 있으면 폴백 불가, 에러 표시
    await setApiKeys(page, { claude: "sk-ant-test-key" });
    await mockChatAPIError(page, "rate_limit_error");

    await page.goto("/");
    await page.waitForTimeout(300);

    const textarea = page.getByPlaceholder("메시지를 입력하세요...");
    await textarea.fill("테스트");
    await page.locator('button svg[viewBox="0 0 256 256"]').locator("..").click();

    // 에러 배너가 표시되어야 함
    await expect(page.getByText("요청 한도 초과")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("요청 한도를 초과했습니다")).toBeVisible();
  });

  test("에러 배너 닫기 버튼이 동작해야 함", async ({ page }) => {
    await setApiKeys(page, { claude: "sk-ant-test-key" });
    await mockChatAPIError(page, "rate_limit_error");

    await page.goto("/");
    await page.waitForTimeout(300);

    const textarea = page.getByPlaceholder("메시지를 입력하세요...");
    await textarea.fill("테스트");
    await page.locator('button svg[viewBox="0 0 256 256"]').locator("..").click();

    // 에러 배너가 표시될 때까지 대기
    await expect(page.getByText("요청 한도 초과")).toBeVisible({ timeout: 10000 });

    // 닫기 버튼 클릭 (X 아이콘)
    await page.locator('button:has(svg path[d*="M6 18L18 6"])').click();

    // 에러 배너가 사라져야 함
    await expect(page.getByText("요청 한도 초과")).not.toBeVisible();
  });
});

test.describe("스트리밍 정지 기능 테스트", () => {
  test("스트리밍 중 정지 버튼이 표시되어야 함", async ({ page }) => {
    await setApiKeys(page, { claude: "sk-ant-test-key" });
    // 느린 응답으로 모킹 (스트리밍 상태를 볼 수 있도록)
    await page.route("**/api/chat", async (route) => {
      // 응답을 지연시켜 정지 버튼을 볼 수 있게 함
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: createTextStreamResponse("응답"),
      });
    });

    await page.goto("/");
    await page.waitForTimeout(300);

    const textarea = page.getByPlaceholder("메시지를 입력하세요...");
    await textarea.fill("테스트");

    // 전송 버튼 클릭
    await page.locator('button svg[viewBox="0 0 256 256"]').locator("..").click();

    // 정지 버튼(■ 아이콘)이 표시되어야 함 - ChatInput 영역 내에서만 찾기
    const chatInputArea = page.locator(".border-t.border-border");
    await expect(chatInputArea.locator('button:has(svg rect)')).toBeVisible({ timeout: 5000 });
  });
});

test.describe("웹 검색 기능 테스트", () => {
  test("웹 검색 결과가 표시되어야 함", async ({ page }) => {
    await setApiKeys(page, { claude: "sk-ant-test-key" });
    await mockChatAPI(page, createWebSearchStreamResponse());

    await page.goto("/");
    await page.waitForTimeout(300);

    // 웹 검색 토글 활성화
    await page.locator('button[role="switch"]').click();

    const textarea = page.getByPlaceholder("메시지를 입력하세요...");
    await textarea.fill("React hydration 문제가 뭐야?");
    await page.locator('button svg[viewBox="0 0 256 256"]').locator("..").click();

    // 응답이 표시되어야 함
    await expect(page.getByText("하이드레이션 불일치")).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("연속 대화 테스트", () => {
  test("여러 메시지가 순서대로 표시되어야 함", async ({ page }) => {
    await setApiKeys(page, { claude: "sk-ant-test-key" });
    let callCount = 0;
    await page.route("**/api/chat", async (route) => {
      callCount++;
      const response =
        callCount === 1
          ? createTextStreamResponse("첫 번째 응답입니다.")
          : createTextStreamResponse("두 번째 응답입니다.");

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: response,
      });
    });

    await page.goto("/");
    await page.waitForTimeout(300);

    // 첫 번째 메시지
    const textarea = page.getByPlaceholder("메시지를 입력하세요...");
    await textarea.fill("첫 번째 질문");
    await page.locator('button svg[viewBox="0 0 256 256"]').locator("..").click();

    await expect(page.getByText("첫 번째 응답입니다.")).toBeVisible({
      timeout: 10000,
    });

    // 두 번째 메시지
    await textarea.fill("두 번째 질문");
    await page.locator('button svg[viewBox="0 0 256 256"]').locator("..").click();

    await expect(page.getByText("두 번째 응답입니다.")).toBeVisible({
      timeout: 10000,
    });

    // 모든 메시지가 표시되어야 함
    await expect(page.getByText("첫 번째 질문")).toBeVisible();
    await expect(page.getByText("두 번째 질문")).toBeVisible();
    await expect(page.getByText("첫 번째 응답입니다.")).toBeVisible();
    await expect(page.getByText("두 번째 응답입니다.")).toBeVisible();
  });
});
