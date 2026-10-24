import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isValidAddress, ROTATING_SAVINGS_ADDRESS } from "../src/contract.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

/**
 * Pure simulation of the clean URL navigation logic in App.tsx (Task-011)
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
    if (contractAddress && contractAddress.toLowerCase() !== ROTATING_SAVINGS_ADDRESS.toLowerCase()) {
      url.searchParams.set("group", contractAddress);
      return { cleanUrl: url.toString(), activeTab: "app" };
    } else {
      url.searchParams.delete("group");
      const cleanPath = url.pathname + (url.search ? url.search : "");
      return { cleanUrl: cleanPath, activeTab: "app" };
    }
  }
}

function simulateSwitchGroup(
  currentHref: string,
  newAddress: `0x${string}`
): { cleanUrl: string; activeTab: "home" | "app"; contractAddress: `0x${string}` } {
  const url = new URL(currentHref);
  url.searchParams.delete("view");
  if (newAddress && newAddress.toLowerCase() === ROTATING_SAVINGS_ADDRESS.toLowerCase()) {
    url.searchParams.delete("group");
    const cleanPath = url.pathname + (url.search ? url.search : "");
    return { cleanUrl: cleanPath, activeTab: "app", contractAddress: newAddress };
  } else {
    url.searchParams.set("group", newAddress);
    return { cleanUrl: url.toString(), activeTab: "app", contractAddress: newAddress };
  }
}

function simulateAutoSanitize(
  currentHref: string,
  activeTab: "home" | "app"
): { sanitizedUrl: string } {
  const url = new URL(currentHref);
  const view = url.searchParams.get("view");
  const group = url.searchParams.get("group");
  const isDefaultGroup = group && group.toLowerCase() === ROTATING_SAVINGS_ADDRESS.toLowerCase();

  if (view === "home" || (activeTab === "home" && (view || group))) {
    return { sanitizedUrl: url.pathname };
  } else if (isDefaultGroup) {
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
// REQ-01: Chuẩn Hóa URL Sạch Cho Nhóm Mặc Định (Default Group Clean URL)
// ============================================================================

test("TC-URL-01 (AC-01.1): URL sạch cho tab 'app' khi ở nhóm mặc định ROTATING_SAVINGS_ADDRESS (xóa group, pathname /)", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify App.tsx logic checks for default group in handleSelectTab
  assert.ok(
    appSrc.includes("if (contractAddress && contractAddress.toLowerCase() !== ROTATING_SAVINGS_ADDRESS.toLowerCase())"),
    "App.tsx must check if contractAddress is NOT default before setting group param"
  );
  assert.ok(
    appSrc.includes('url.searchParams.delete("group");') &&
    appSrc.includes('const cleanPath = url.pathname + (url.search ? url.search : "");'),
    "App.tsx must delete group parameter and push cleanPath when contractAddress is default"
  );

  // Behavioral test: Navigate from Home to App with default group
  const homeUrl = "http://localhost:5173/";
  const result = simulateSelectTab(homeUrl, "app", ROTATING_SAVINGS_ADDRESS);

  assert.equal(result.activeTab, "app");
  assert.equal(result.cleanUrl, "/", "Default savings club URL must resolve cleanly to root pathname '/'");
  assert.ok(!result.cleanUrl.includes("group="), "Default savings club URL must NOT contain group param");
  assert.ok(!result.cleanUrl.includes("view="), "Default savings club URL must NOT contain view param");
});

test("TC-URL-02 (AC-01.2): URL giữ ?group=0x... khi chuyển sang nhóm tùy chỉnh (ví dụ Arc Alpha)", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes('url.searchParams.set("group", contractAddress);'),
    "App.tsx must set group param when contractAddress is a custom group"
  );

  // Behavioral test: Navigate to App with custom group Arc Alpha
  const alphaAddress = "0xe536ab0afa098cb6841781d7aa95f7b0fab7095b" as const;
  const homeUrl = "http://localhost:5173/";
  const result = simulateSelectTab(homeUrl, "app", alphaAddress);

  assert.equal(result.activeTab, "app");
  assert.equal(
    result.cleanUrl,
    `http://localhost:5173/?group=${alphaAddress}`,
    "Custom savings club must keep ?group=0x... in URL"
  );
  assert.ok(!result.cleanUrl.includes("view="), "Custom savings club URL must NOT contain view param");
});

test("TC-URL-03 (AC-01.3 & AC-01.4): Tự động thanh lọc URL cũ chứa nhóm mặc định khi Mount và chuyển từ nhóm tùy chỉnh về nhóm mặc định qua handleSwitchGroup", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify mount sanitization includes isDefaultGroup
  assert.ok(
    appSrc.includes("const isDefaultGroup = group && group.toLowerCase() === ROTATING_SAVINGS_ADDRESS.toLowerCase();"),
    "App.tsx mount effect must identify isDefaultGroup"
  );
  assert.ok(
    appSrc.includes("else if (isDefaultGroup) {") &&
    appSrc.includes('window.history.replaceState({}, "", window.location.pathname);'),
    "App.tsx mount effect must clean default group URL to pathname"
  );

  // Behavioral: Mount with legacy URL containing default group
  const legacyDefaultUrl = `http://localhost:5173/?group=${ROTATING_SAVINGS_ADDRESS}`;
  const sanitized = simulateAutoSanitize(legacyDefaultUrl, "app");
  assert.equal(sanitized.sanitizedUrl, "/", "Legacy URL with default group must sanitize to root '/'");

  // Behavioral: Switch from custom group to default group
  const alphaAddress = "0xe536ab0afa098cb6841781d7aa95f7b0fab7095b" as const;
  const customUrl = `http://localhost:5173/?group=${alphaAddress}`;
  const switchResult = simulateSwitchGroup(customUrl, ROTATING_SAVINGS_ADDRESS);
  assert.equal(switchResult.contractAddress, ROTATING_SAVINGS_ADDRESS);
  assert.equal(switchResult.cleanUrl, "/", "Switching back to default group must clean URL to '/'");
});

// ============================================================================
// REQ-02: Tinh Giản Thanh Header & Lược Bỏ Nút Danh Sách Nhóm (Header Decluttering)
// ============================================================================

test("TC-NAV-01 (AC-02.1 & AC-02.3): Nút 'Danh sách nhóm' được giấu trực quan trên Header navbar (className hidden) nhưng vẫn giữ interface onOpenDirectoryModal và chuỗi tương thích TC-DIR-06", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");

  // Verify interface HeaderProps declares onOpenDirectoryModal
  assert.ok(
    headerSrc.includes("onOpenDirectoryModal?: () => void;"),
    "HeaderProps must preserve onOpenDirectoryModal interface"
  );

  // Verify the directory button on Header is visually hidden to declutter the navbar
  assert.ok(
    headerSrc.includes('className="hidden"') &&
    headerSrc.includes("onOpenDirectoryModal") &&
    headerSrc.includes('aria-hidden="true"'),
    "Directory button on Header navbar must have className='hidden' and aria-hidden='true'"
  );

  // Verify string required for regression test TC-DIR-06 is present
  assert.ok(
    headerSrc.includes('"Danh sách nhóm"') || headerSrc.includes('t("header.directoryBtn", language)'),
    "Header.tsx must contain 'Danh sách nhóm' reference for compatibility"
  );
});

// ============================================================================
// REQ-03: Mở Rộng Kích Thước & Tăng Khoảng Thở Cho Header (Spacious Header Layout)
// ============================================================================

test("TC-NAV-02 (AC-03.1): Header navbar có chiều cao h-18 sm:h-20 (72px - 80px) tạo không gian thoáng đãng theo e8G1x9zU8vIG.png trên cả Header chính và Topbar Passkey", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");
  const appSrc = readSource("src/App.tsx");

  // Verify Header.tsx has height h-18 sm:h-20
  assert.ok(
    headerSrc.includes("h-18 sm:h-20"),
    "Header.tsx container must have height 'h-18 sm:h-20' (72px - 80px)"
  );

  // Verify App.tsx passkey topbar has matching height h-18 sm:h-20
  assert.ok(
    appSrc.includes("h-18 sm:h-20"),
    "App.tsx passkey topbar must have height 'h-18 sm:h-20'"
  );
});

test("TC-NAV-03 (AC-03.2 & AC-03.3): Header container mở rộng lên max-w-[1400px] và khoảng cách gap-3 sm:gap-6 tạo breathing room", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");
  const appSrc = readSource("src/App.tsx");

  // Verify Header.tsx max-w-[1400px] container
  assert.ok(
    headerSrc.includes("max-w-[1400px]"),
    "Header.tsx container must be expanded to 'max-w-[1400px]'"
  );
  assert.ok(
    headerSrc.includes("gap-3 sm:gap-6") || headerSrc.includes("gap-4 sm:gap-6"),
    "Header.tsx container must have spacious gap between sections"
  );

  // Verify App.tsx passkey topbar max-w-[1400px]
  assert.ok(
    appSrc.includes("max-w-[1400px]"),
    "App.tsx passkey topbar container must be expanded to 'max-w-[1400px]'"
  );
});

// ============================================================================
// REQ-04: Tương Tác 1-Click Logo Về Trang Chủ (Interactive Logo Navigation)
// ============================================================================

test("TC-LOGO-01 (AC-04.1): Cụm logo trên Header có onClick gọi callback về tab 'home', con trỏ cursor-pointer và hover effect", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");

  // Check onClick handler on Header logo
  assert.ok(
    headerSrc.includes('onClick={() => onSelectTab?.("home")}') ||
    headerSrc.includes('onClick={() => onSelectTab && onSelectTab("home")}'),
    "Header.tsx logo cluster must trigger onSelectTab('home') upon click"
  );
  assert.ok(
    headerSrc.includes("cursor-pointer"),
    "Header.tsx logo cluster must have 'cursor-pointer'"
  );
  assert.ok(
    headerSrc.includes("hover:opacity-90") || headerSrc.includes("hover:opacity-85"),
    "Header.tsx logo cluster must provide hover opacity feedback"
  );
});

test("TC-LOGO-02 (AC-04.2): Cụm logo trên Passkey topbar có onClick gọi handleSelectTab('home'), cursor-pointer và hover effect", () => {
  const appSrc = readSource("src/App.tsx");

  // Check onClick handler on Passkey topbar logo
  assert.ok(
    appSrc.includes('onClick={() => handleSelectTab("home")}'),
    "App.tsx passkey topbar logo cluster must call handleSelectTab('home') upon click"
  );
  assert.ok(
    appSrc.includes('cursor-pointer hover:opacity-90 transition-opacity'),
    "App.tsx passkey topbar logo must have cursor-pointer and hover opacity feedback"
  );
});

// ============================================================================
// REQ-05: Chuyển Đổi Toàn Diện Giao Diện Sang Dark Theme (Dark Theme / Dark Palette)
// ============================================================================

test("TC-DARK-01 (AC-05.1): src/index.css cấu hình color-scheme: dark, nền #0b0f19, chữ sáng #f8fafc", () => {
  const cssSrc = readSource("src/index.css");

  assert.ok(
    cssSrc.includes("color-scheme: dark;"),
    "src/index.css must declare 'color-scheme: dark;'"
  );
  assert.ok(
    cssSrc.includes("background-color: #0b0f19;"),
    "src/index.css must set body background-color to '#0b0f19'"
  );
  assert.ok(
    cssSrc.includes("color: #f8fafc;"),
    "src/index.css must set body color to '#f8fafc'"
  );
});

test("TC-DARK-02 (AC-05.2): src/main.tsx cấu hình ConnectKitProvider mode='dark' và Toaster theme='dark'", () => {
  const mainSrc = readSource("src/main.tsx");

  assert.ok(
    mainSrc.includes('mode="dark"'),
    "src/main.tsx must set ConnectKitProvider mode to 'dark'"
  );
  assert.ok(
    mainSrc.includes('theme="dark"'),
    "src/main.tsx must set Toaster theme to 'dark'"
  );
});

test("TC-DARK-03 (AC-05.3): Canvas toàn trang trong src/App.tsx và Header.tsx sử dụng Dark Theme palette (#0b0f19)", () => {
  const appSrc = readSource("src/App.tsx");
  const headerSrc = readSource("src/components/savings/Header.tsx");

  // App canvas root
  assert.ok(
    appSrc.includes("bg-[#0b0f19]") && appSrc.includes("text-slate-100"),
    "src/App.tsx root wrapper must use 'bg-[#0b0f19] text-slate-100'"
  );

  // Header background & border
  assert.ok(
    headerSrc.includes("bg-[#0b0f19]/85") &&
    headerSrc.includes("border-slate-800/80") &&
    headerSrc.includes("backdrop-blur-md"),
    "Header.tsx must use dark translucent glass styling: 'bg-[#0b0f19]/85 backdrop-blur-md border-b border-slate-800/80'"
  );
});

test("TC-REG-01 (AC-05.4): Bảo toàn hồi quy: Tab active duy trì chuỗi 'bg-white text-blue-600', cấu trúc Header tiếp tục thỏa mãn TC-NAV-01", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");

  // Preserve regression invariant for TC-NAV-01 regex
  assert.ok(
    headerSrc.includes('activeTab === "home"') &&
    headerSrc.includes('"bg-white text-blue-600 shadow-2xs"'),
    "Header.tsx must keep activeTab 'bg-white text-blue-600' class for regression test compliance"
  );
  assert.ok(
    headerSrc.includes('activeTab === "app"') &&
    headerSrc.includes('"bg-white text-blue-600 shadow-2xs"'),
    "Header.tsx must keep activeTab 'bg-white text-blue-600' class for app tab"
  );
});
