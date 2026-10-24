import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_SAVINGS_CLUBS,
  SAVINGS_CLUBS_STORAGE_KEY,
  getKnownGroups,
  saveKnownGroup,
} from "../src/lib/savingsClubDirectory.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Quản lý & Lưu trữ Danh mục Nhóm Hụi (Data Layer)
// ============================================================================

test("TC-DIR-01 (AC-01.1): Khởi tạo nhóm mặc định - trả về ít nhất 2 nhóm mặc định", () => {
  // Clear any existing localStorage
  if (typeof globalThis.window !== "undefined" && globalThis.window.localStorage) {
    globalThis.window.localStorage.clear();
  }

  const groups = getKnownGroups();
  assert.ok(groups.length >= 2, "Must return at least 2 default groups");

  const bavi = groups.find(
    (g) => g.address.toLowerCase() === "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b"
  );
  assert.ok(bavi, "Must contain BAVI Savings Club");
  assert.equal(bavi?.name, "BAVI Savings Club");
  assert.equal(bavi?.isDefault, true);

  const arcAlpha = groups.find(
    (g) => g.address.toLowerCase() === "0xe536ab0afa098cb6841781d7aa95f7b0fab7095b"
  );
  assert.ok(arcAlpha, "Must contain Nhóm Hụi Arc Alpha");
  assert.equal(arcAlpha?.name, "Nhóm Hụi Arc Alpha");
  assert.equal(arcAlpha?.isDefault, true);
});

test("TC-DIR-02 (AC-01.2): Lưu trữ và khử trùng lặp - chuẩn hóa chữ thường toLowerCase()", () => {
  // Setup mock localStorage in node environment if needed
  const storageMap = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => storageMap.set(key, val),
    clear: () => storageMap.clear(),
  };

  const originalWindow = globalThis.window;
  // @ts-expect-error Mocking window for unit test
  globalThis.window = { localStorage: mockStorage };

  try {
    const testAddr = "0x8888888888888888888888888888888888888888";
    saveKnownGroup({ address: testAddr.toUpperCase(), name: "Nhóm Test Cấp Vốn" });
    saveKnownGroup({ address: testAddr.toLowerCase(), name: "Nhóm Test Cấp Vốn Trùng" });

    const storedRaw = mockStorage.getItem(SAVINGS_CLUBS_STORAGE_KEY);
    assert.ok(storedRaw, "Storage key must exist");

    const parsed = JSON.parse(storedRaw);
    assert.ok(Array.isArray(parsed));

    const matches = parsed.filter(
      (item: { address: string }) => item.address.toLowerCase() === testAddr.toLowerCase()
    );
    assert.equal(matches.length, 1, "Duplicate address must be deduplicated");
    assert.equal(matches[0].address, testAddr.toLowerCase(), "Address must be stored lowercase");

    const known = getKnownGroups();
    const foundInKnown = known.find((g) => g.address === testAddr.toLowerCase());
    assert.ok(foundInKnown, "New group must be present in getKnownGroups");
  } finally {
    globalThis.window = originalWindow;
  }
});

test("TC-DIR-03 (AC-01.3): Tự động ghi nhận khi tạo nhóm mới thành công", () => {
  const modalSrc = readSource("src/components/savings/CreateClubModal.tsx");
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    modalSrc.includes("saveKnownGroup"),
    "CreateClubModal must call saveKnownGroup"
  );
  assert.ok(
    appSrc.includes("saveKnownGroup"),
    "App.tsx must call saveKnownGroup"
  );
});

test("TC-DIR-04 (AC-01.4): Tự động ghi nhận khi nhập địa chỉ đổi nhóm thủ công", () => {
  const switcherSrc = readSource("src/components/savings/GroupSwitcher.tsx");

  assert.ok(
    switcherSrc.includes("saveKnownGroup"),
    "GroupSwitcher must call saveKnownGroup upon manual switch"
  );
});

test("TC-DIR-05 (AC-01.5): Chịu lỗi dữ liệu hỏng / Edge Case - không crash và fallback về default", () => {
  const mockStorage = {
    getItem: (_key: string) => "{corrupted_json_syntax_error!",
    setItem: (_key: string, _val: string) => {},
    clear: () => {},
  };

  const originalWindow = globalThis.window;
  // @ts-expect-error Mocking window for unit test
  globalThis.window = { localStorage: mockStorage };

  try {
    let result: unknown = null;
    assert.doesNotThrow(() => {
      result = getKnownGroups();
    }, "getKnownGroups must not throw exception on corrupted JSON");

    assert.ok(Array.isArray(result), "Result must be an array");
    const arr = result as typeof DEFAULT_SAVINGS_CLUBS;
    assert.equal(arr.length, 2, "Must fallback to 2 default groups");
    assert.equal(arr[0].name, "BAVI Savings Club");
    assert.equal(arr[1].name, "Nhóm Hụi Arc Alpha");
  } finally {
    globalThis.window = originalWindow;
  }
});

// ============================================================================
// REQ-02: Giao diện Danh mục Nhóm Hụi (UI & Navigation)
// ============================================================================

test("TC-DIR-06 (AC-02.1): Nút mở Danh sách nhóm trên Header & GroupSwitcher", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");
  const switcherSrc = readSource("src/components/savings/GroupSwitcher.tsx");
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    headerSrc.includes("onOpenDirectoryModal?: () => void;"),
    "HeaderProps must include onOpenDirectoryModal"
  );
  assert.ok(
    headerSrc.includes("Danh sách nhóm"),
    "Header must render 'Danh sách nhóm' button"
  );
  assert.ok(
    switcherSrc.includes("onOpenDirectoryModal?: () => void;"),
    "GroupSwitcherProps must include onOpenDirectoryModal"
  );
  assert.ok(
    switcherSrc.includes("Danh sách nhóm"),
    "GroupSwitcher must render 'Danh sách nhóm' button"
  );
  assert.ok(
    appSrc.includes("onOpenDirectoryModal={() => setShowDirectoryModal(true)}"),
    "App.tsx must pass onOpenDirectoryModal callback to Header and GroupSwitcher"
  );
});

test("TC-DIR-07 (AC-02.2): Hiển thị Modal Danh Sách Nhóm Hụi đầy đủ thông tin", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    modalSrc.includes("Danh Sách Nhóm Hụi"),
    "Modal must display title 'Danh Sách Nhóm Hụi'"
  );
  assert.ok(
    modalSrc.includes("formatAddress(group.address)"),
    "Modal must display formatted address"
  );
  assert.ok(
    modalSrc.includes("Nổi bật"),
    "Modal must display 'Nổi bật' badge for default clubs"
  );
  assert.ok(
    modalSrc.includes("Đang xem"),
    "Modal must display 'Đang xem' badge for current active club"
  );
});

test("TC-DIR-08 (AC-02.3): Thao tác Chuyển nhóm 1-Click đóng modal & toast", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    modalSrc.includes("onSelectGroup(group.address)"),
    "Modal must call onSelectGroup with target address"
  );
  assert.ok(
    modalSrc.includes("onClose()"),
    "Modal must close upon selecting group"
  );
  assert.ok(
    modalSrc.includes("toast.success"),
    "Modal must display success toast upon group switch"
  );
});

test("TC-DIR-09 (AC-02.4): Nhận diện nhóm hiện tại - Disabled redundant action", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    modalSrc.includes("isCurrent"),
    "Modal must detect isCurrent status"
  );
  assert.ok(
    modalSrc.includes("cursor-not-allowed") || modalSrc.includes("disabled"),
    "Modal must disable switch action on current group"
  );
});

test("TC-DIR-10 (AC-02.5): Lối tắt Tạo nhóm mới từ Danh mục", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    modalSrc.includes("+ Tạo nhóm mới"),
    "Modal must render '+ Tạo nhóm mới' shortcut button"
  );
  assert.ok(
    modalSrc.includes("onOpenCreateModal()"),
    "Modal shortcut must trigger onOpenCreateModal"
  );
});

// ============================================================================
// REQ-03: Nâng cấp Typography & Chuẩn hóa Font Tiếng Việt Toàn Diện
// ============================================================================

test("TC-TYPO-01 (AC-03.1): Tích hợp Font Plus Jakarta Sans & Inter với Vietnamese Subset", () => {
  const htmlSrc = readSource("index.html");
  const cssSrc = readSource("src/index.css");

  assert.ok(
    htmlSrc.includes('lang="vi"'),
    "index.html must declare lang='vi'"
  );
  assert.ok(
    htmlSrc.includes("subset=vietnamese"),
    "index.html must include Google Fonts link with subset=vietnamese"
  );
  assert.ok(
    htmlSrc.includes("Plus+Jakarta+Sans") && htmlSrc.includes("Inter"),
    "index.html must load Plus Jakarta Sans and Inter"
  );
  assert.ok(
    !htmlSrc.includes("Space+Grotesk") && !htmlSrc.includes("DM+Sans"),
    "index.html must not load Space Grotesk or DM Sans"
  );

  assert.ok(
    cssSrc.includes("subset=vietnamese"),
    "src/index.css must include @import with subset=vietnamese"
  );
  assert.ok(
    !cssSrc.includes("Space+Grotesk") && !cssSrc.includes("DM+Sans"),
    "src/index.css must not import Space Grotesk or DM Sans"
  );
});

test("TC-TYPO-02 (AC-03.2): Cấu hình Font Family chuẩn trong CSS & Tailwind", () => {
  const cssSrc = readSource("src/index.css");
  const tailwindSrc = readSource("tailwind.config.js");

  assert.ok(
    cssSrc.includes("'Plus Jakarta Sans', 'Inter'"),
    "src/index.css body font-family must begin with Plus Jakarta Sans and Inter"
  );
  assert.ok(
    tailwindSrc.includes("Plus Jakarta Sans") && tailwindSrc.includes("Inter"),
    "tailwind.config.js fontFamily.sans must include Plus Jakarta Sans and Inter"
  );
});

test("TC-TYPO-03 (AC-03.3): Dọn sạch Inline Styles ép cứng Font cũ", () => {
  const assignedFiles = [
    "src/App.tsx",
    "src/components/savings/Header.tsx",
    "src/components/savings/GroupSwitcher.tsx",
    "src/components/savings/CreateClubModal.tsx",
    "src/components/savings/ActionPanel.tsx",
    "src/components/savings/PasskeyActionPanel.tsx",
    "src/components/savings/ClubCard.tsx",
    "src/components/savings/HowItWorksCard.tsx",
    "src/components/savings/RoundHistory.tsx",
    "src/components/savings/MemberStatus.tsx",
    "src/components/savings/ClubDirectoryModal.tsx",
  ];

  for (const file of assignedFiles) {
    const src = readSource(file);
    assert.ok(
      !src.includes("Space Grotesk") && !src.includes("DM Sans"),
      `File ${file} must not contain Space Grotesk or DM Sans`
    );
  }
});

test("TC-TYPO-04 (AC-03.4): Xóa bỏ triệt để Class Cỡ chữ Siêu nhỏ text-[10px] và text-[11px]", () => {
  const srcDir = path.resolve(process.cwd(), "src");

  function scanDir(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...scanDir(fullPath));
      } else if (/\.(tsx|ts|css|html)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const allFiles = scanDir(srcDir);
  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    assert.ok(
      !content.includes("text-[10px]"),
      `File ${path.relative(process.cwd(), filePath)} must not contain text-[10px]`
    );
    assert.ok(
      !content.includes("text-[11px]"),
      `File ${path.relative(process.cwd(), filePath)} must not contain text-[11px]`
    );
  }
});

test("TC-TYPO-05 (AC-03.5): Độ tương phản và thang đo cỡ chữ đạt chuẩn >= 12px", () => {
  // 1. Quét kiểm tra không có cỡ chữ dưới 12px dạng text-[<12px] trong toàn bộ src/
  const srcDir = path.resolve(process.cwd(), "src");

  function scanDir(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...scanDir(fullPath));
      } else if (/\.(tsx|ts|css|html)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const allFiles = scanDir(srcDir);
  const sub12pxRegex = /text-\[(?:[0-9]|1[0-1])px\]|text-\[0\.[0-6][0-9]*rem\]/;
  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    const match = content.match(sub12pxRegex);
    assert.equal(
      match,
      null,
      `File ${path.relative(process.cwd(), filePath)} must not contain sub-12px text size class: ${match?.[0]}`
    );
  }

  // 2. Kiểm tra CSS toàn cục thiết lập font smoothing cho độ tương phản sắc nét
  const cssSrc = readSource("src/index.css");
  assert.ok(
    cssSrc.includes("-webkit-font-smoothing: antialiased;"),
    "src/index.css must declare -webkit-font-smoothing: antialiased"
  );
  assert.ok(
    cssSrc.includes("-moz-osx-font-smoothing: grayscale;"),
    "src/index.css must declare -moz-osx-font-smoothing: grayscale"
  );

  // 3. Kiểm tra các cụm từ tiếng Việt có dấu phức tạp trong các component được hiển thị chuẩn Unicode
  const appSrc = readSource("src/App.tsx");
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");
  const switcherSrc = readSource("src/components/savings/GroupSwitcher.tsx");

  assert.ok(
    modalSrc.includes("Danh Sách Nhóm Hụi"),
    "ClubDirectoryModal must have proper Vietnamese diacritics for title"
  );
  assert.ok(
    modalSrc.includes("Nổi bật") && modalSrc.includes("Đang xem"),
    "ClubDirectoryModal must have proper Vietnamese diacritics for badges"
  );
  assert.ok(
    switcherSrc.includes("Danh sách nhóm") && switcherSrc.includes("Đổi nhóm"),
    "GroupSwitcher must have proper Vietnamese diacritics"
  );
  assert.ok(
    modalSrc.includes("Đã chuyển sang nhóm"),
    "ClubDirectoryModal notifications must have proper Vietnamese diacritics"
  );
});
