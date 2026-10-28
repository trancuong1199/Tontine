import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getStoredLanguage, setStoredLanguage, LANGUAGE_STORAGE_KEY } from "../src/lib/i18n.ts";

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf-8");
}

test("TC-AUTH-01 (AC-01.1, AC-01.2): Unauthenticated View trong App.tsx không chứa nút Open Club Directory", () => {
  const appSrc = readSource("src/App.tsx");

  // Locate the unauthenticated view block
  const unauthBlockMatch = appSrc.match(
    /\{!\s*isLoading\s*&&\s*!hasNoActiveClub\s*&&\s*!address\s*&&\s*\([\s\S]*?\)\s*\}/
  );
  assert.ok(unauthBlockMatch, "Must find unauthenticated view block in App.tsx");
  const unauthBlock = unauthBlockMatch[0];

  // Must contain Connect Wallet
  assert.ok(
    unauthBlock.includes("openConnectModal"),
    "Unauthenticated view must contain openConnectModal button"
  );
  assert.ok(
    unauthBlock.includes("Connect Wallet") || unauthBlock.includes("Kết nối ví ngay"),
    "Unauthenticated view must have Connect Wallet button label"
  );

  // Must NOT contain Open Club Directory
  assert.ok(
    !unauthBlock.includes("Open Club Directory"),
    "Unauthenticated view must NOT contain 'Open Club Directory'"
  );
  assert.ok(
    !unauthBlock.includes("Mở Danh sách nhóm"),
    "Unauthenticated view must NOT contain 'Mở Danh sách nhóm'"
  );
  assert.ok(
    !unauthBlock.includes("setShowDirectoryModal(true)"),
    "Unauthenticated view must NOT call setShowDirectoryModal(true)"
  );
});

test("TC-I18N-02 (AC-02.1): getStoredLanguage mặc định trả về 'en' khi localStorage rỗng", () => {
  const storageMock: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, val: string) => {
      storageMock[key] = val;
    },
    removeItem: (key: string) => {
      delete storageMock[key];
    },
    clear: () => {
      for (const k in storageMock) delete storageMock[k];
    },
  };

  // @ts-expect-error - attach mock window & localStorage
  globalThis.window = {} as unknown;
  // @ts-expect-error - attach mock localStorage
  globalThis.localStorage = mockLocalStorage;

  mockLocalStorage.clear();
  assert.equal(getStoredLanguage(), "en", "Default language without stored preference must be 'en'");
});

test("TC-I18N-03 (AC-02.2): getStoredLanguage trả về 'en' khi window is undefined (SSR/Node)", () => {
  const origWindow = globalThis.window;
  try {
    // @ts-expect-error - simulating window undefined
    delete globalThis.window;
    assert.equal(getStoredLanguage(), "en", "Must fallback to 'en' when window is undefined");
  } finally {
    globalThis.window = origWindow;
  }
});

test("TC-I18N-04 (AC-02.3): getStoredLanguage tôn trọng ngôn ngữ đã lưu khi người dùng chuyển sang 'vi'", () => {
  const storageMock: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, val: string) => {
      storageMock[key] = val;
    },
    removeItem: (key: string) => {
      delete storageMock[key];
    },
    clear: () => {
      for (const k in storageMock) delete storageMock[k];
    },
  };

  // @ts-expect-error - attach mock window & localStorage
  globalThis.window = {} as unknown;
  // @ts-expect-error - attach mock localStorage
  globalThis.localStorage = mockLocalStorage;

  // Set to Vietnamese explicitly
  setStoredLanguage("vi");
  assert.equal(getStoredLanguage(), "vi", "Must return 'vi' when explicitly chosen by user");

  // Set back to English explicitly
  setStoredLanguage("en");
  assert.equal(getStoredLanguage(), "en", "Must return 'en' when explicitly chosen by user");
});
