import { test, expect } from "@playwright/test";

test.describe("채팅 UI 기본 기능", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("페이지 로드 시 기본 UI 요소가 표시되어야 함", async ({ page }) => {
    // 헤더 확인
    await expect(page.getByText("Claude Chat")).toBeVisible();

    // 입력창 확인
    await expect(
      page.getByPlaceholder("메시지를 입력하세요... (Shift+Enter로 줄바꿈)")
    ).toBeVisible();

    // 전송 버튼 확인
    await expect(page.locator('button svg[viewBox="0 0 256 256"]')).toBeVisible();

    // 모델 선택 확인
    await expect(page.getByText("Claude Sonnet 4")).toBeVisible();

    // 웹 검색 토글 확인
    await expect(page.getByText("웹 검색")).toBeVisible();

    // 초기 안내 메시지 확인
    await expect(page.getByText("Claude와 대화를 시작하세요")).toBeVisible();
  });

  test("빈 메시지는 전송할 수 없어야 함", async ({ page }) => {
    const sendButton = page.locator('button svg[viewBox="0 0 256 256"]').locator("..");
    await expect(sendButton).toBeDisabled();
  });

  test("텍스트 입력 시 전송 버튼이 활성화되어야 함", async ({ page }) => {
    const textarea = page.getByPlaceholder(
      "메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
    );
    const sendButton = page.locator('button svg[viewBox="0 0 256 256"]').locator("..");

    await textarea.fill("테스트 메시지");
    await expect(sendButton).toBeEnabled();
  });

  test("Shift+Enter로 줄바꿈이 되어야 함", async ({ page }) => {
    const textarea = page.getByPlaceholder(
      "메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
    );

    await textarea.fill("첫 번째 줄");
    await textarea.press("Shift+Enter");
    await textarea.type("두 번째 줄");

    const value = await textarea.inputValue();
    expect(value).toContain("\n");
  });
});

test.describe("모델 선택 기능", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("모델 선택 드롭다운이 열려야 함", async ({ page }) => {
    await page.getByText("Claude Sonnet 4").click();

    // 모든 모델 옵션이 표시되어야 함
    await expect(page.getByText("Claude Opus 4")).toBeVisible();
    await expect(page.getByText("Claude 3.5 Haiku")).toBeVisible();
  });

  test("다른 모델을 선택할 수 있어야 함", async ({ page }) => {
    await page.getByText("Claude Sonnet 4").click();
    await page.getByText("Claude Opus 4").click();

    // 선택된 모델이 표시되어야 함
    await expect(page.getByRole("combobox")).toContainText("Claude Opus 4");
  });
});

test.describe("웹 검색 토글 기능", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("웹 검색 토글이 동작해야 함", async ({ page }) => {
    const toggle = page.locator('button[role="switch"]');

    // 초기 상태 확인 (비활성화)
    await expect(toggle).toHaveAttribute("data-state", "unchecked");

    // 토글 클릭
    await toggle.click();

    // 활성화 상태 확인
    await expect(toggle).toHaveAttribute("data-state", "checked");

    // 다시 토글
    await toggle.click();
    await expect(toggle).toHaveAttribute("data-state", "unchecked");
  });
});

test.describe("대화 초기화 기능", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("초기화 버튼이 메시지가 없을 때 비활성화되어야 함", async ({ page }) => {
    const clearButton = page.getByRole("button", { name: /새 대화|초기화/ });

    // 메시지가 없을 때 버튼이 비활성화되거나 숨겨져 있어야 함
    // (현재 구현에 따라 조정 필요)
    const count = await clearButton.count();
    if (count > 0) {
      // 버튼이 존재하면 비활성화 상태 확인
      await expect(clearButton).toBeDisabled();
    }
  });
});

test.describe("반응형 레이아웃", () => {
  test("모바일 뷰포트에서도 UI가 정상 표시되어야 함", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // 기본 요소들이 여전히 보여야 함
    await expect(page.getByText("Claude Chat")).toBeVisible();
    await expect(
      page.getByPlaceholder("메시지를 입력하세요... (Shift+Enter로 줄바꿈)")
    ).toBeVisible();
  });
});
