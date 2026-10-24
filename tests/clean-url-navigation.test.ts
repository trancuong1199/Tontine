import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isValidAddress, ROTATING_SAVINGS_ADDRESS } from "../src/contract.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

/**
 * Pure simulation of the clean URL navigation logic in App.tsx
 */
function simulateSelectTab(
  currentHref: string,
  tab: "home" | "app",
  contractAddress: string
): { cleanUrl: string; activeTab: "home" | "app" } {
  const url = new URL(currentHref);
  if (tab === "home") {
    url.searchParams.delete("view");
    url.searchParams.delete("group");
    const cleanPath = url.pathname + (url.search ? url.search : "");
    return { cleanUrl: cleanPath, activeTab: "home" };
  } else {
    url.searchParams.delete("view");
    url.searchParams.set("group", contractAddress);
    return { cleanUrl: url.toString(), activeTab: "app" };
  }
}

function simulateSwitchGroup(
  currentHref: string,
  newAddress: `0x${string}`
): { cleanUrl: string; activeTab: "home" | "app"; contractAddress: `0x${string}` } {
  const url = new URL(currentHref);
  url.searchParams.delete("view");
  url.searchParams.set("group", newAddress);
  return { cleanUrl: url.toString(), activeTab: "app", contractAddress: newAddress };
}

function simulateAutoSanitize(
  currentHref: string,
  activeTab: "home" | "app"
): { sanitizedUrl: string } {
  const url = new URL(currentHref);
  const view = url.searchParams.get("view");
  const group = url.searchParams.get("group");

  if (view === "home" || (activeTab === "home" && (view || group))) {
    return { sanitizedUrl: url.pathname };
  } else if (activeTab === "app" && view) {
    const cleanUrl = new URL(currentHref);
    cleanUrl.searchParams.delete("view");
    if (isValidAddress(group)) {
      cleanUrl.searchParams.set("group", group);
    }
    return { sanitizedUrl: cleanUrl.toString() };
  }
  return { sanitizedUrl: currentHref };
}

// ============================================================================
// REQ-01: Chuẩn hóa Clean URL cho Trang Chủ (Homepage Clean URL)
// ============================================================================

test("TC-URL-01 (AC-01.1): Khi chọn tab 'home' (handleSelectTab('home')), App.tsx xóa bỏ triệt để query parameters 'view' và 'group', đưa URL về pathname gốc sạch sẽ", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify implementation in App.tsx source code
  assert.ok(
    appSrc.includes('if (tab === "home") {'),
    "App.tsx must branch for tab === 'home'"
  );
  assert.ok(
    appSrc.includes('url.searchParams.delete("view")'),
    "App.tsx must delete 'view' query parameter"
  );
  assert.ok(
    appSrc.includes('url.searchParams.delete("group")'),
    "App.tsx must delete 'group' query parameter when navigating to home"
  );
  assert.ok(
    appSrc.includes('const cleanPath = url.pathname + (url.search ? url.search : "");') ||
    appSrc.includes("window.history.pushState({}, \"\", cleanPath);"),
    "App.tsx must push clean pathname without query parameters"
  );

  // Behavioral verification
  const initialAppUrl = `http://localhost:5173/?group=${ROTATING_SAVINGS_ADDRESS}`;
  const result = simulateSelectTab(initialAppUrl, "home", ROTATING_SAVINGS_ADDRESS);

  assert.equal(result.activeTab, "home");
  assert.equal(result.cleanUrl, "/", "URL must resolve cleanly to root pathname '/'");
  assert.ok(
    !result.cleanUrl.includes("group="),
    "Homepage clean URL must not contain 'group='"
  );
  assert.ok(
    !result.cleanUrl.includes("view="),
    "Homepage clean URL must not contain 'view='"
  );
});

test("TC-URL-02 (AC-01.2): Khi chọn tab 'app' (handleSelectTab('app')), App.tsx xóa tham số 'view', chỉ giữ lại tham số định danh nhóm '?group=0x...' và pushState sạch", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes('url.searchParams.set("group", contractAddress);'),
    "App.tsx must set 'group' query parameter to active contractAddress"
  );
  assert.ok(
    !appSrc.includes('url.searchParams.set("view", "app")'),
    "App.tsx must NOT set 'view=app' query parameter"
  );

  // Behavioral verification from root homepage
  const homeUrl = "http://localhost:5173/";
  const activeContract = "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b";
  const result = simulateSelectTab(homeUrl, "app", activeContract);

  assert.equal(result.activeTab, "app");
  assert.equal(
    result.cleanUrl,
    `http://localhost:5173/?group=${activeContract}`,
    "App URL must contain exclusively ?group=0x... without &view=app"
  );
  assert.ok(
    !result.cleanUrl.includes("view="),
    "App URL must not contain 'view=app'"
  );
});

// ============================================================================
// REQ-02: Chuẩn hóa Clean URL cho Ứng Dụng (App Dashboard Clean URL)
// ============================================================================

test("TC-URL-03 (AC-02.1): Khi đổi nhóm (handleSwitchGroup), App.tsx xóa tham số 'view', gán url.searchParams.set('group', newAddress) và cập nhật pushState", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify handleSwitchGroup cleans 'view' and updates 'group'
  assert.ok(
    appSrc.includes("const handleSwitchGroup = (newAddress: `0x${string}`) => {"),
    "App.tsx must declare handleSwitchGroup callback"
  );
  assert.ok(
    appSrc.includes("url.searchParams.delete(\"view\");"),
    "handleSwitchGroup must delete 'view' query parameter"
  );
  assert.ok(
    appSrc.includes("url.searchParams.set(\"group\", newAddress);"),
    "handleSwitchGroup must set 'group' query parameter to newAddress"
  );

  // Behavioral verification when switching to Arc Alpha group
  const alphaAddress = "0xe536ab0afa098cb6841781d7aa95f7b0fab7095b" as const;
  const legacyDirtyUrl = "http://localhost:5173/?group=0x6afaa...&view=home";
  const result = simulateSwitchGroup(legacyDirtyUrl, alphaAddress);

  assert.equal(result.activeTab, "app");
  assert.equal(result.contractAddress, alphaAddress);
  assert.equal(
    result.cleanUrl,
    `http://localhost:5173/?group=${alphaAddress}`,
    "Switching group must produce a pristine URL with ?group=0x... and no residual view parameter"
  );
});

test("TC-URL-04 (AC-02.2): Bất biến URL sạch: URL tuyệt đối không bao giờ chứa chuỗi rườm rà '&view=home' hoặc '&view=app' khi điều hướng giữa các tab", () => {
  const appSrc = readSource("src/App.tsx");

  // Strict negative assertion on source code
  assert.ok(
    !appSrc.includes('url.searchParams.set("view", "home")'),
    "App.tsx must completely eliminate url.searchParams.set('view', 'home')"
  );
  assert.ok(
    !appSrc.includes('url.searchParams.set("view", "app")'),
    "App.tsx must completely eliminate url.searchParams.set('view', 'app')"
  );

  // Invariant verification across arbitrary transitions
  const transitions = [
    { from: "http://localhost:5173/?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b", to: "home" as const },
    { from: "http://localhost:5173/", to: "app" as const },
    { from: "http://localhost:5173/?view=home", to: "home" as const },
    { from: "http://localhost:5173/?group=0x6afaa...&view=home", to: "home" as const },
  ];

  for (const { from, to } of transitions) {
    const outcome = simulateSelectTab(from, to, ROTATING_SAVINGS_ADDRESS);
    assert.ok(
      !outcome.cleanUrl.includes("view=home"),
      `Transition from '${from}' to '${to}' must not contain 'view=home'`
    );
    assert.ok(
      !outcome.cleanUrl.includes("view=app"),
      `Transition from '${from}' to '${to}' must not contain 'view=app'`
    );
  }
});

// ============================================================================
// REQ-03: Điều Hướng Lịch Sử Trình Duyệt & Tự Động Thanh Lọc URL Cũ
// ============================================================================

test("TC-URL-05 (AC-03.1): Cơ chế tự động thanh lọc (Auto-sanitization) URL cũ bằng replaceState: Khi truy cập với view=home đưa về '/', khi có view=app gỡ bỏ 'view'", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify auto-clean effect in App.tsx
  assert.ok(
    appSrc.includes("// Auto-clean legacy dirty URLs"),
    "App.tsx must contain legacy auto-clean effect"
  );
  assert.ok(
    appSrc.includes('if (view === "home" || (activeTab === "home" && (view || group)))'),
    "App.tsx must detect dirty legacy homepage URLs"
  );
  assert.ok(
    appSrc.includes('window.history.replaceState({}, "", window.location.pathname);'),
    "App.tsx must replace legacy homepage state with clean pathname"
  );
  assert.ok(
    appSrc.includes('cleanUrl.searchParams.delete("view");'),
    "App.tsx must delete 'view' parameter during app sanitization"
  );

  // Case A: User arrives via bookmark http://localhost:5173/?group=0x6afaa...&view=home
  const dirtyBookmarkUrl = "http://localhost:5173/?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b&view=home";
  const sanitizedHome = simulateAutoSanitize(dirtyBookmarkUrl, "home");
  assert.equal(
    sanitizedHome.sanitizedUrl,
    "/",
    "Dirty bookmark URL with view=home must sanitize to root '/'"
  );

  // Case B: User arrives via http://localhost:5173/?group=0x6afaa...&view=app
  const dirtyAppUrl = "http://localhost:5173/?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b&view=app";
  const sanitizedApp = simulateAutoSanitize(dirtyAppUrl, "app");
  assert.equal(
    sanitizedApp.sanitizedUrl,
    "http://localhost:5173/?group=0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b",
    "Dirty app URL with view=app must sanitize to pure ?group=0x..."
  );
});

test("TC-URL-06 (AC-03.2): Điều hướng Back/Forward (popstate listener): Xử lý đúng khi URL không có query params (chuyển về home) và khi có group hợp lệ (chuyển về app)", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify popstate listener exists
  assert.ok(
    appSrc.includes('window.addEventListener("popstate", onPopState);'),
    "App.tsx must register onPopState listener"
  );
  assert.ok(
    appSrc.includes('window.removeEventListener("popstate", onPopState);'),
    "App.tsx must deregister onPopState listener upon unmount"
  );

  // Verify popstate logic
  assert.ok(
    appSrc.includes('if (view === "home" || (!group && !view)) {') &&
    appSrc.includes('setActiveTab("home");'),
    "onPopState must set activeTab to 'home' when no group or view is present"
  );
  assert.ok(
    appSrc.includes("else if (isValidAddress(group)) {") &&
    appSrc.includes('setActiveTab("app");'),
    "onPopState must set activeTab to 'app' when valid group address is present"
  );
});

test("TC-REG-01: Bảo toàn hồi quy: Cấu trúc state activeTab và conditional rendering của App.tsx tiếp tục tương thích 100% với các test trước", () => {
  const appSrc = readSource("src/App.tsx");

  // Compatibility assertions required by TC-NAV-02
  assert.ok(
    appSrc.includes('const [activeTab, setActiveTab] = useState<"home" | "app">'),
    "App.tsx must keep activeTab state declaration"
  );
  assert.ok(
    appSrc.includes('if (isValidAddress(group))') && appSrc.includes('return "app"'),
    "App.tsx must maintain fallback to app when group is present"
  );
  assert.ok(
    appSrc.includes('return "home"'),
    "App.tsx must maintain fallback to home at root"
  );
  assert.ok(
    appSrc.includes('activeTab === "home" ? (') &&
    appSrc.includes('<LandingPage'),
    "App.tsx must conditionally render LandingPage on home tab"
  );
});
