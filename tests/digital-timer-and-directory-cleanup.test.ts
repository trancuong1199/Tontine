import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_SAVINGS_CLUBS,
  SAVINGS_CLUBS_STORAGE_KEY,
  getKnownGroups,
  saveKnownGroup,
  clearCustomKnownGroups,
  removeKnownGroup,
  type SavingsClubItem,
} from "../src/lib/savingsClubDirectory.ts";
import { t, translations, type Language } from "../src/lib/i18n.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

/**
 * Extracts and compiles `formatDigitalCountdown` from a given component file
 * to guarantee that we test the exact implementation code of each panel.
 */
function extractFormatDigitalCountdown(sourceCode: string): (
  countdownSec: number,
  isTimeEnded: boolean,
  isEn?: boolean
) => string {
  const match = sourceCode.match(
    /export\s+function\s+formatDigitalCountdown\s*\([\s\S]*?^}/m
  );
  if (!match) {
    throw new Error("formatDigitalCountdown function not found in source code");
  }
  // Strip TypeScript types to evaluate in Node.js
  const jsCode = match[0]
    .replace(/countdownSec:\s*number/g, "countdownSec")
    .replace(/isTimeEnded:\s*boolean/g, "isTimeEnded")
    .replace(/isEn:\s*boolean\s*=\s*false/g, "isEn = false")
    .replace(/:\s*string\s*\{/g, " {")
    .replace(/^export\s+/g, "");

  const factory = new Function(`${jsCode}; return formatDigitalCountdown;`);
  return factory() as (countdownSec: number, isTimeEnded: boolean, isEn?: boolean) => string;
}

// ============================================================================
// REQ-01: Chuẩn Hóa Bộ Đếm Giờ Đấu Giá Thành Định Dạng Kỹ Thuật Số (hh:mm:ss / mm:ss)
// ============================================================================

test("TC-TIMER-01 (AC-01.1): countdownSec >= 3600 định dạng chuẩn hh:mm:ss, loại bỏ hoàn toàn lỗi tràn phút 1437:25", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const formatCountdown = extractFormatDigitalCountdown(actionPanelSrc);

  // 1. Kịch bản lỗi gốc phản ánh từ người dùng: 86.245s (23h 57m 25s)
  const userCase = formatCountdown(86245, false, false);
  assert.equal(userCase, "23:57:25", "86245s must format as 23:57:25");
  assert.notEqual(userCase, "1437:25", "Must NEVER format as 1437:25");

  // 2. Tròn 24 giờ: 86400s -> 24:00:00
  assert.equal(formatCountdown(86400, false, false), "24:00:00");

  // 3. Đúng 1 giờ biên: 3600s -> 01:00:00
  assert.equal(formatCountdown(3600, false, false), "01:00:00");

  // 4. Hơn 1 giờ lẻ giây: 3661s -> 01:01:01
  assert.equal(formatCountdown(3661, false, false), "01:01:01");

  // 5. 10 giờ 5 phút 9 giây: 36309s -> 10:05:09
  assert.equal(formatCountdown(36309, false, true), "10:05:09");

  // 6. Kiểm tra ActionPanel.tsx không còn dùng công thức cũ Math.floor(countdownSec / 60) đơn lẻ
  assert.ok(
    !actionPanelSrc.includes("Math.floor(countdownSec / 60) : 0"),
    "Old uncapped minute calculation must not exist in ActionPanel"
  );
  assert.ok(
    actionPanelSrc.includes("formatDigitalCountdown(countdownSec, isTimeEnded, isEn)"),
    "ActionPanel must call formatDigitalCountdown"
  );
});

test("TC-TIMER-02 (AC-01.2): countdownSec < 3600 định dạng chuẩn mm:ss (hỗ trợ phòng siêu tốc 2 phút 120s)", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const formatCountdown = extractFormatDigitalCountdown(actionPanelSrc);

  // 1. Biên sát 1 giờ: 3599s -> 59:59
  assert.equal(formatCountdown(3599, false, false), "59:59");

  // 2. Vòng siêu tốc 2 phút vừa mở: 120s -> 02:00
  assert.equal(formatCountdown(120, false, false), "02:00");

  // 3. Sau 1 giây trôi qua: 119s -> 01:59
  assert.equal(formatCountdown(119, false, false), "01:59");

  // 4. Đúng 1 phút: 60s -> 01:00
  assert.equal(formatCountdown(60, false, false), "01:00");

  // 5. Dưới 1 phút: 45s -> 00:45
  assert.equal(formatCountdown(45, false, false), "00:45");

  // 6. Số giây đơn: 5s -> 00:05, 9s -> 00:09
  assert.equal(formatCountdown(5, false, false), "00:05");
  assert.equal(formatCountdown(9, false, false), "00:09");
  assert.equal(formatCountdown(1, false, false), "00:01");
});

test("TC-TIMER-03 (AC-01.3): Trạng thái hết giờ (countdownSec <= 0 hoặc isTimeEnded = true) trả về Ended (en) / Hết giờ (vi)", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const formatCountdown = extractFormatDigitalCountdown(actionPanelSrc);

  // 1. countdownSec = 0, isTimeEnded = false -> Hết giờ / Ended
  assert.equal(formatCountdown(0, false, false), "Hết giờ");
  assert.equal(formatCountdown(0, false, true), "Ended");

  // 2. countdownSec âm (clock drift): -10s, isTimeEnded = false
  assert.equal(formatCountdown(-10, false, false), "Hết giờ");
  assert.equal(formatCountdown(-10, false, true), "Ended");

  // 3. isTimeEnded = true (bất kể countdownSec còn hay không)
  assert.equal(formatCountdown(120, true, false), "Hết giờ");
  assert.equal(formatCountdown(120, true, true), "Ended");
  assert.equal(formatCountdown(0, true, false), "Hết giờ");
  assert.equal(formatCountdown(0, true, true), "Ended");

  // 4. Default parameter isEn = false
  assert.equal(formatCountdown(0, false), "Hết giờ");
  assert.equal(formatCountdown(120, true), "Hết giờ");
});

test("TC-TIMER-04 (AC-01.4): Tính nhất quán tuyệt đối (Cross-Panel Parity) giữa ActionPanel.tsx và PasskeyActionPanel.tsx", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  const actionFn = extractFormatDigitalCountdown(actionPanelSrc);
  const passkeyFn = extractFormatDigitalCountdown(passkeySrc);

  const testVectors: Array<{ sec: number; ended: boolean; isEn: boolean }> = [
    { sec: 86400, ended: false, isEn: false },
    { sec: 86245, ended: false, isEn: false },
    { sec: 86245, ended: false, isEn: true },
    { sec: 3600, ended: false, isEn: false },
    { sec: 3599, ended: false, isEn: false },
    { sec: 120, ended: false, isEn: false },
    { sec: 120, ended: false, isEn: true },
    { sec: 45, ended: false, isEn: false },
    { sec: 5, ended: false, isEn: false },
    { sec: 0, ended: false, isEn: false },
    { sec: 0, ended: false, isEn: true },
    { sec: -5, ended: false, isEn: false },
    { sec: 100, ended: true, isEn: false },
    { sec: 100, ended: true, isEn: true },
  ];

  for (const v of testVectors) {
    const actionOut = actionFn(v.sec, v.ended, v.isEn);
    const passkeyOut = passkeyFn(v.sec, v.ended, v.isEn);
    assert.equal(
      actionOut,
      passkeyOut,
      `ActionPanel and PasskeyActionPanel must produce identical output for vector: ${JSON.stringify(v)}`
    );
  }

  // Cả hai panel đều gán countdownStr qua formatDigitalCountdown
  assert.ok(
    passkeySrc.includes("formatDigitalCountdown(countdownSec, isTimeEnded, isEn)"),
    "PasskeyActionPanel must call formatDigitalCountdown"
  );
  assert.ok(
    actionPanelSrc.includes("formatDigitalCountdown(countdownSec, isTimeEnded, isEn)"),
    "ActionPanel must call formatDigitalCountdown"
  );
});

// ============================================================================
// REQ-02: Dọn Dẹp Danh Bạ Nhóm Cũ Trong LocalStorage & Modal
// ============================================================================

test("TC-DIR-01 (AC-02.1): clearCustomKnownGroups gỡ sạch nhóm tùy chỉnh trong LocalStorage, đưa về đúng 2 nhóm mặc định", () => {
  const storageMap = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => storageMap.set(key, val),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  const originalWindow = globalThis.window;
  // @ts-expect-error Mocking window for testing
  globalThis.window = { localStorage: mockStorage };

  try {
    // 1. Thêm 3 nhóm tùy chỉnh vào danh bạ
    saveKnownGroup({ address: "0x1111111111111111111111111111111111111111", name: "Nhóm Thử Nghiệm 1" });
    saveKnownGroup({ address: "0x2222222222222222222222222222222222222222", name: "Nhóm Thử Nghiệm 2" });
    saveKnownGroup({ address: "0x3333333333333333333333333333333333333333", name: "Nhóm Thử Nghiệm 3" });

    const groupsBefore = getKnownGroups();
    assert.equal(groupsBefore.length, DEFAULT_SAVINGS_CLUBS.length + 3);

    // 2. Gọi clearCustomKnownGroups()
    clearCustomKnownGroups();

    // 3. Key trong localStorage phải được gỡ bỏ
    assert.equal(storageMap.has(SAVINGS_CLUBS_STORAGE_KEY), false);

    // 4. getKnownGroups() sau khi clear chỉ còn đúng DEFAULT_SAVINGS_CLUBS
    const groupsAfter = getKnownGroups();
    assert.equal(groupsAfter.length, DEFAULT_SAVINGS_CLUBS.length);
    assert.deepEqual(
      groupsAfter.map((g) => g.address.toLowerCase()),
      DEFAULT_SAVINGS_CLUBS.map((g) => g.address.toLowerCase())
    );
  } finally {
    globalThis.window = originalWindow;
  }
});

test("TC-DIR-02 (AC-02.1): removeKnownGroup xóa chính xác 1 nhóm cụ thể theo địa chỉ (không phân biệt chữ hoa/thường)", () => {
  const storageMap = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => storageMap.set(key, val),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  const originalWindow = globalThis.window;
  // @ts-expect-error Mocking window for testing
  globalThis.window = { localStorage: mockStorage };

  try {
    const targetAddr = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const stayAddr = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    saveKnownGroup({ address: targetAddr, name: "Nhóm Sẽ Bị Xóa" });
    saveKnownGroup({ address: stayAddr, name: "Nhóm Giữ Lại" });

    // Xóa bằng địa chỉ chữ in hoa
    removeKnownGroup(targetAddr.toUpperCase());

    const groups = getKnownGroups();
    const foundTarget = groups.find((g) => g.address.toLowerCase() === targetAddr.toLowerCase());
    const foundStay = groups.find((g) => g.address.toLowerCase() === stayAddr.toLowerCase());

    assert.equal(foundTarget, undefined, "Nhóm mục tiêu phải bị xóa hoàn toàn");
    assert.ok(foundStay, "Nhóm còn lại vẫn phải được bảo toàn");

    // Xóa địa chỉ không tồn tại không ném ngoại lệ
    assert.doesNotThrow(() => removeKnownGroup("0x9999999999999999999999999999999999999999"));
  } finally {
    globalThis.window = originalWindow;
  }
});

test("TC-DIR-03 (AC-02.2, AC-02.3): ClubDirectoryModal.tsx tích hợp nút dọn dẹp nhóm cũ với biểu tượng Trash2, cập nhật state tức thì và thông báo toast", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  // 1. Kiểm tra import Trash2 & clearCustomKnownGroups
  assert.ok(modalSrc.includes("Trash2"), "ClubDirectoryModal must import Trash2 icon");
  assert.ok(
    modalSrc.includes("clearCustomKnownGroups"),
    "ClubDirectoryModal must import clearCustomKnownGroups"
  );

  // 2. State động quản lý groups
  assert.ok(
    modalSrc.includes("const [groups, setGroups] = useState<SavingsClubItem[]>([])"),
    "ClubDirectoryModal must manage dynamic groups state"
  );

  // 3. Tính toán số lượng nhóm tùy chỉnh customGroupsCount
  assert.ok(
    modalSrc.includes("customGroupsCount"),
    "ClubDirectoryModal must compute customGroupsCount"
  );

  // 4. Hàm xử lý handleClearCustomGroups cập nhật state tức thì về DEFAULT_SAVINGS_CLUBS
  assert.ok(
    modalSrc.includes("clearCustomKnownGroups()"),
    "handleClearCustomGroups must call clearCustomKnownGroups"
  );
  assert.ok(
    modalSrc.includes("setGroups([...DEFAULT_SAVINGS_CLUBS])"),
    "handleClearCustomGroups must reset state immediately to DEFAULT_SAVINGS_CLUBS"
  );

  // 5. Toast thông báo thành công
  assert.ok(
    modalSrc.includes("toast.success"),
    "handleClearCustomGroups must notify user via toast.success"
  );

  // 6. Điều kiện hiển thị nút dọn dẹp
  assert.ok(
    modalSrc.includes("customGroupsCount > 0"),
    "Clean button must check customGroupsCount > 0"
  );
  assert.ok(
    modalSrc.includes("<Trash2 size={13} />") || modalSrc.includes("<Trash2"),
    "Clean button must render Trash2 icon"
  );
});

test("TC-DIR-04 (AC-02.4): Xử lý ngoại lệ an toàn khi danh sách đã sạch và bảo vệ SSR / window undefined", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  // Kiểm tra xử lý customGroupsCount === 0 hiển thị toast.info hoặc bảo vệ an toàn
  assert.ok(
    modalSrc.includes("if (customGroupsCount === 0)") || modalSrc.includes("customGroupsCount > 0"),
    "Must safely handle empty custom groups count"
  );

  // Kiểm tra savingsClubDirectory.ts an toàn khi chạy SSR (không có window)
  const dirSrc = readSource("src/lib/savingsClubDirectory.ts");
  assert.ok(
    dirSrc.includes('typeof window === "undefined"'),
    "savingsClubDirectory functions must guard against undefined window"
  );
});

// ============================================================================
// REQ-03: Cập Nhật Từ Điển Song Ngữ (i18n Parity)
// ============================================================================

test("TC-I18N-01: Bộ từ điển song ngữ i18n đầy đủ khóa dọn dẹp danh bạ cho cả Tiếng Việt và Tiếng Anh", () => {
  const i18nSrc = readSource("src/lib/i18n.ts");

  // 1. Interface Translations có khai báo khóa
  assert.ok(i18nSrc.includes("clearOldClubsBtn: string;"));
  assert.ok(i18nSrc.includes("clearOldClubsSuccess: string;"));
  assert.ok(i18nSrc.includes("clearOldClubsEmpty: string;"));

  // 2. Bản dịch Tiếng Việt (vi)
  assert.equal(t("clubDirectoryModal.clearOldClubsBtn", "vi"), "Dọn dẹp nhóm cũ");
  assert.equal(
    t("clubDirectoryModal.clearOldClubsSuccess", "vi"),
    "Đã dọn dẹp danh sách nhóm hụi cũ!"
  );
  assert.equal(
    t("clubDirectoryModal.clearOldClubsEmpty", "vi"),
    "Danh bạ hiện đã sạch sẽ, chỉ chứa các nhóm mặc định."
  );

  // 3. Bản dịch Tiếng Anh (en)
  assert.equal(t("clubDirectoryModal.clearOldClubsBtn", "en"), "Clear old clubs");
  assert.equal(
    t("clubDirectoryModal.clearOldClubsSuccess", "en"),
    "Cleaned up old savings clubs!"
  );
  assert.equal(
    t("clubDirectoryModal.clearOldClubsEmpty", "en"),
    "Directory is already clean with default clubs."
  );
});

// ============================================================================
// REQ-04: Thiết Lập Phòng Siêu Tốc 2 Phút (120s Rapid Arena) & Zero Regression
// ============================================================================

test("TC-ARENA-01 (AC-03.1, AC-03.2, AC-03.3): Phòng siêu tốc 120s cấu hình roundDuration linh hoạt và đồng hồ hiển thị 02:00 -> 00:00", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");

  // 1. Hợp đồng RotatingSavings.sol nhận roundDuration linh hoạt qua constructor
  assert.ok(
    contractSrc.includes("uint256 roundDuration_"),
    "Constructor must accept flexible roundDuration_"
  );
  assert.ok(
    contractSrc.includes("roundDuration = roundDuration_;"),
    "Contract must assign roundDuration from parameter"
  );

  // 2. Với roundDuration = 120s, hàm formatDigitalCountdown hiển thị chuẩn
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const formatCountdown = extractFormatDigitalCountdown(actionPanelSrc);

  assert.equal(formatCountdown(120, false, false), "02:00");
  assert.equal(formatCountdown(90, false, false), "01:30");
  assert.equal(formatCountdown(30, false, false), "00:30");
  assert.equal(formatCountdown(1, false, false), "00:01");
  assert.equal(formatCountdown(0, false, false), "Hết giờ");
});

test("TC-REGRESSION-01 (AC-03.4): Bảo toàn cấu trúc dự án và danh bạ mặc định hệ thống", () => {
  assert.equal(DEFAULT_SAVINGS_CLUBS.length, 2, "DEFAULT_SAVINGS_CLUBS must contain exactly 2 clubs");
  assert.equal(
    DEFAULT_SAVINGS_CLUBS[0].address.toLowerCase(),
    "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b"
  );
  assert.equal(
    DEFAULT_SAVINGS_CLUBS[1].address.toLowerCase(),
    "0xe536ab0afa098cb6841781d7aa95f7b0fab7095b"
  );
  assert.equal(SAVINGS_CLUBS_STORAGE_KEY, "hui_known_groups");
});
