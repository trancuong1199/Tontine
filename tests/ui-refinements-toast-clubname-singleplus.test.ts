import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { translations, t, type Language } from "../src/lib/i18n.ts";
import {
  DEFAULT_SAVINGS_CLUBS,
  SAVINGS_CLUBS_STORAGE_KEY,
  getKnownGroups,
  saveKnownGroup,
} from "../src/lib/savingsClubDirectory.ts";
import { formatAddress } from "../src/contract.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

/**
 * Pure helper mirroring the exact business rule BR-02 implemented in App.tsx
 * for multi-tier group name resolution.
 */
function resolveDisplayedGroupName(
  contractAddress: string,
  clubInfoGroupName: string,
  isEn: boolean
): string {
  const knownClub = getKnownGroups().find(
    (c) => c.address.toLowerCase() === contractAddress.toLowerCase()
  );
  return knownClub &&
    knownClub.name &&
    !knownClub.name.startsWith("Nhóm Hụi 0x") &&
    !knownClub.name.startsWith("Savings Club 0x")
    ? knownClub.name
    : clubInfoGroupName ||
        (isEn
          ? `Savings Club ${formatAddress(contractAddress as `0x${string}`)}`
          : `Nhóm Hụi ${formatAddress(contractAddress as `0x${string}`)}`);
}

// ============================================================================
// REQ-01: Tinh chỉnh Cấu hình Toast Toàn cục (Sonner 2s & Close Button)
// ============================================================================

test("TC-TOAST-01 (AC-01.1): Toaster trong src/main.tsx cấu hình duration={2000}", () => {
  const mainSrc = readSource("src/main.tsx");

  assert.ok(
    mainSrc.includes("<Toaster"),
    "src/main.tsx must render the <Toaster component"
  );
  assert.match(
    mainSrc,
    /<Toaster[^>]*\bduration=\{2000\}/,
    "Toaster must have duration explicitly configured to 2000ms (2 seconds)"
  );
});

test("TC-TOAST-02 (AC-01.2): Toaster trong src/main.tsx kích hoạt closeButton", () => {
  const mainSrc = readSource("src/main.tsx");

  assert.match(
    mainSrc,
    /<Toaster[^>]*\bcloseButton/,
    "Toaster must enable closeButton prop so users can dismiss toasts manually"
  );
});

test("TC-TOAST-03 (AC-01.3): Toaster trong src/main.tsx duy trì vị trí top-center và richColors", () => {
  const mainSrc = readSource("src/main.tsx");

  assert.match(
    mainSrc,
    /<Toaster[^>]*\bposition="top-center"/,
    "Toaster position must remain 'top-center'"
  );
  assert.match(
    mainSrc,
    /<Toaster[^>]*\brichColors/,
    "Toaster must preserve richColors prop for status differentiation"
  );
});

// ============================================================================
// REQ-02: Đồng bộ Tên Nhóm Hiển Thị Tức Thì trên Thẻ ClubCard
// ============================================================================

test("TC-NAME-01 (AC-02.1): App.tsx tính toán displayedGroupName ưu tiên tên danh bạ knownGroups thay vì chỉ đọc on-chain", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify code structure in App.tsx
  assert.ok(
    appSrc.includes("const knownClub = getKnownGroups().find"),
    "App.tsx must lookup the active contract address in getKnownGroups()"
  );
  assert.ok(
    appSrc.includes("displayedGroupName"),
    "App.tsx must compute displayedGroupName"
  );
  assert.ok(
    appSrc.includes("!knownClub.name.startsWith(\"Nhóm Hụi 0x\")"),
    "App.tsx must distinguish definitive group names from temporary prefix 'Nhóm Hụi 0x'"
  );

  // Business Logic Verification:
  // Alpha contract address 0xe536ab0afa098cb6841781d7aa95f7b0fab7095b
  // Even if on-chain contract returns stale "BAVI Savings Club", UI displays "Nhóm Hụi Arc Alpha"
  const alphaAddress = "0xe536ab0afa098cb6841781d7aa95f7b0fab7095b";
  const staleOnChainName = "BAVI Savings Club";

  const resolvedNameVi = resolveDisplayedGroupName(alphaAddress, staleOnChainName, false);
  assert.equal(
    resolvedNameVi,
    "Nhóm Hụi Arc Alpha",
    "Should resolve to 'Nhóm Hụi Arc Alpha' prioritizing directory over stale on-chain contract name"
  );

  const resolvedNameEn = resolveDisplayedGroupName(alphaAddress, staleOnChainName, true);
  assert.equal(
    resolvedNameEn,
    "Nhóm Hụi Arc Alpha",
    "English view should also prioritize directory name 'Nhóm Hụi Arc Alpha'"
  );
});

test("TC-NAME-02 (AC-02.2): ClubCard được gán key={contractAddress} và groupName={displayedGroupName} giúp giao diện đổi tên tức thì", () => {
  const appSrc = readSource("src/App.tsx");

  assert.match(
    appSrc,
    /<ClubCard[^>]*\bkey=\{contractAddress\}/,
    "ClubCard must have key={contractAddress} to force immediate remount upon address switch"
  );
  assert.match(
    appSrc,
    /<ClubCard[^>]*\bgroupName=\{displayedGroupName\}/,
    "ClubCard must receive groupName={displayedGroupName}"
  );

  // Check BAVI default address switch
  const baviAddress = "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b";
  const baviName = resolveDisplayedGroupName(baviAddress, "BAVI Savings Club", false);
  assert.equal(baviName, "BAVI Savings Club", "BAVI address must resolve to 'BAVI Savings Club'");
});

test("TC-NAME-03 (AC-02.3): Đổi sang nhóm tùy chỉnh đã lưu trong knownGroups hiển thị chính xác tức thì", () => {
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
    const customAddress = "0x1111111111111111111111111111111111111111";
    const customName = "Hụi Gia Đình Phát Tài";

    saveKnownGroup({ address: customAddress, name: customName });

    const resolved = resolveDisplayedGroupName(customAddress, "", false);
    assert.equal(
      resolved,
      customName,
      "Custom group name saved in directory must display instantly on ClubCard"
    );
  } finally {
    globalThis.window = originalWindow;
  }
});

test("TC-NAME-04 (AC-02.4): Nhóm mới chưa có trong danh bạ hiển thị fallback an toàn và sync on-chain qua saveKnownGroup", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify two-way synchronization hook in App.tsx
  assert.ok(
    appSrc.includes("saveKnownGroup({ address: contractAddress, name: clubInfo.groupName })"),
    "App.tsx must automatically sync valid on-chain groupName to known groups storage"
  );

  const unknownAddress = "0x9999999999999999999999999999999999999999";

  // Tier 3: Before RPC loads (empty clubInfo.groupName)
  const fallbackVi = resolveDisplayedGroupName(unknownAddress, "", false);
  assert.ok(
    fallbackVi.startsWith("Nhóm Hụi 0x9999"),
    `Vietnamese fallback must format as 'Nhóm Hụi 0x...': ${fallbackVi}`
  );

  const fallbackEn = resolveDisplayedGroupName(unknownAddress, "", true);
  assert.ok(
    fallbackEn.startsWith("Savings Club 0x9999"),
    `English fallback must format as 'Savings Club 0x...': ${fallbackEn}`
  );

  // Tier 2: Once RPC loads valid on-chain name
  const hydrated = resolveDisplayedGroupName(unknownAddress, "Hụi Doanh Nhân Arc", false);
  assert.equal(
    hydrated,
    "Hụi Doanh Nhân Arc",
    "Once loaded from chain, displayedGroupName must take the on-chain name"
  );
});

test("TC-NAME-05 (AC-02.5): Tạo nhóm mới thành công gọi saveKnownGroup và cập nhật tức thì", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("handleClubCreated"),
    "App.tsx must declare handleClubCreated callback"
  );
  assert.ok(
    appSrc.includes("handleSwitchGroup(newAddress)"),
    "handleClubCreated must switch group immediately to the newly deployed contract address"
  );
});

// ============================================================================
// REQ-03: Loại Bỏ Dấu Cộng Trùng Lặp Nút Tạo Nhóm (Single Plus Invariant)
// ============================================================================

test("TC-PLUS-01 (AC-03.1): Nút tạo nhóm trên Header.tsx tuân thủ bất biến Single Plus, không còn lỗi hiển thị 2 dấu cộng (+ +)", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");

  // Verify Plus SVG icon is present
  assert.ok(
    headerSrc.includes("<Plus size={15} />"),
    "Header.tsx must render the <Plus size={15} /> icon"
  );

  // Verify visible button text does not contain extra '+' in its primary label
  assert.match(
    headerSrc,
    /<span>\{isEn \? t\("header\.createBtn", language\) : "Tạo nhóm"\}<\/span>/,
    "Header.tsx visible label must be cleanly 'Create Club' or 'Tạo nhóm' without leading '+'"
  );

  // Verify i18n key header.createBtn returns clean text
  assert.equal(translations.vi.header.createBtn, "Tạo nhóm");
  assert.equal(translations.en.header.createBtn, "Create Club");
  assert.ok(!translations.vi.header.createBtn.startsWith("+"));
  assert.ok(!translations.en.header.createBtn.startsWith("+"));
});

test("TC-PLUS-02 (AC-03.2): Nút tạo nhóm trên GroupSwitcher.tsx tuân thủ bất biến Single Plus, không còn lỗi hiển thị 2 dấu cộng", () => {
  const switcherSrc = readSource("src/components/savings/GroupSwitcher.tsx");

  // Verify Plus SVG icon is present
  assert.ok(
    switcherSrc.includes("<Plus size={15}"),
    "GroupSwitcher.tsx must render the <Plus size={15} /> icon"
  );

  // Verify visible button label is clean
  assert.match(
    switcherSrc,
    /<span className="truncate">\{isEn \? t\("groupSwitcher\.createBtn", language\) : "Tạo nhóm mới"\}<\/span>/,
    "GroupSwitcher.tsx visible label must be cleanly 'Create Club' or 'Tạo nhóm mới' without leading '+'"
  );

  // Verify i18n key groupSwitcher.createBtn returns clean text
  assert.equal(translations.vi.groupSwitcher.createBtn, "Tạo nhóm mới");
  assert.equal(translations.en.groupSwitcher.createBtn, "Create Club");
  assert.ok(!translations.vi.groupSwitcher.createBtn.startsWith("+"));
  assert.ok(!translations.en.groupSwitcher.createBtn.startsWith("+"));
});

test("TC-PLUS-03 (AC-03.3): Nút tạo nhóm trên ClubDirectoryModal.tsx và thanh Passkey Header tuân thủ bất biến Single Plus", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");
  const appSrc = readSource("src/App.tsx");

  // ClubDirectoryModal Footer button
  assert.ok(
    modalSrc.includes("<Plus size={15} />"),
    "ClubDirectoryModal.tsx must render <Plus size={15} />"
  );
  assert.match(
    modalSrc,
    /<span>\{isEn \? t\("clubDirectoryModal\.createShortcutBtn", language\) : "Tạo nhóm mới"\}<\/span>/,
    "ClubDirectoryModal.tsx footer label must be cleanly 'Create Club' or 'Tạo nhóm mới'"
  );

  // Passkey Top Bar Header in App.tsx
  assert.ok(
    appSrc.includes("<Plus size={14} />"),
    "App.tsx Passkey header must render <Plus size={14} /> icon"
  );
  assert.match(
    appSrc,
    /<span>\{isEn \? t\("header\.createBtn", language\) : "Tạo nhóm"\}<\/span>/,
    "Passkey header in App.tsx must render clean label without leading '+'"
  );
});

test("TC-PLUS-04 (AC-03.4): Chuỗi createBtn trong src/lib/i18n.ts (header, groupSwitcher, clubDirectoryModal) được chuẩn hóa sạch, không có dấu '+' thừa phía trước", () => {
  // Test both languages: Vietnamese & English
  const languages: Language[] = ["vi", "en"];

  for (const lang of languages) {
    const headerBtn = t("header.createBtn", lang);
    const switcherBtn = t("groupSwitcher.createBtn", lang);
    const directoryShortcutBtn = t("clubDirectoryModal.createShortcutBtn", lang);

    assert.ok(
      !headerBtn.startsWith("+"),
      `header.createBtn for '${lang}' must not start with '+': got '${headerBtn}'`
    );
    assert.ok(
      !switcherBtn.startsWith("+"),
      `groupSwitcher.createBtn for '${lang}' must not start with '+': got '${switcherBtn}'`
    );
    assert.ok(
      !directoryShortcutBtn.startsWith("+"),
      `clubDirectoryModal.createShortcutBtn for '${lang}' must not start with '+': got '${directoryShortcutBtn}'`
    );

    // Exact expected values
    if (lang === "vi") {
      assert.equal(headerBtn, "Tạo nhóm");
      assert.equal(switcherBtn, "Tạo nhóm mới");
      assert.equal(directoryShortcutBtn, "Tạo nhóm mới");
    } else {
      assert.equal(headerBtn, "Create Club");
      assert.equal(switcherBtn, "Create Club");
      assert.equal(directoryShortcutBtn, "Create Club");
    }
  }
});
