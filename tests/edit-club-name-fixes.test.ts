import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SAVINGS_CLUBS_STORAGE_KEY,
  DEFAULT_SAVINGS_CLUBS,
  getKnownGroups,
  saveKnownGroup,
  updateKnownGroupName,
} from "../src/lib/savingsClubDirectory.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Ổn Định Ô Nhập Liệu Trong EditClubNameModal.tsx
// ============================================================================

test("TC-FIX-01 (AC-01.1): EditClubNameModal.tsx sử dụng prevIsOpenRef và prevAddressRef để chống reset input khi component cha re-render", () => {
  const modalSrc = readSource("src/components/savings/EditClubNameModal.tsx");

  assert.ok(
    modalSrc.includes("const prevIsOpenRef = useRef(false);"),
    "EditClubNameModal must declare prevIsOpenRef to track open state transitions"
  );
  assert.ok(
    modalSrc.includes("const prevAddressRef = useRef<string | null>(null);"),
    "EditClubNameModal must declare prevAddressRef to track active club address changes"
  );
  assert.ok(
    modalSrc.includes("const isNewlyOpened = !prevIsOpenRef.current;"),
    "EditClubNameModal must detect newly opened transition"
  );
  assert.ok(
    modalSrc.includes("const isDifferentClub = prevAddressRef.current !== club.address;"),
    "EditClubNameModal must detect if club address changed"
  );
  assert.ok(
    modalSrc.includes("if (isNewlyOpened || isDifferentClub)"),
    "EditClubNameModal must only re-initialize nameInput when newly opened or different club"
  );
});

test("TC-FIX-02 (AC-01.2): Dependency array của useEffect bảo vệ an toàn cho người dùng khi đang gõ", () => {
  const modalSrc = readSource("src/components/savings/EditClubNameModal.tsx");

  assert.ok(
    modalSrc.includes("}, [isOpen, club?.address, club?.name]);"),
    "useEffect dependencies must be tied to primitive fields rather than unstable inline object reference"
  );
});

test("TC-FIX-03 (AC-01.3): EditClubNameModal.tsx chặn nổi bọt sự kiện click backdrop để bảo vệ modal cha", () => {
  const modalSrc = readSource("src/components/savings/EditClubNameModal.tsx");

  assert.ok(
    modalSrc.includes("e.stopPropagation();") && modalSrc.includes("onClose();"),
    "Backdrop onClick must call e.stopPropagation() before onClose"
  );
});

// ============================================================================
// REQ-02: Cơ Chế Bảo Toàn Tên Tùy Chỉnh Trong savingsClubDirectory.ts
// ============================================================================

test("TC-FIX-04 (AC-02.1): saveKnownGroup không ghi đè tên nhóm tùy chỉnh khi nhận tên on-chain từ sync hook", () => {
  const storageMap = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => storageMap.set(key, val),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  const originalWindow = globalThis.window;
  // @ts-expect-error Mocking window for test
  globalThis.window = { localStorage: mockStorage };

  try {
    const testAddr = "0x5555555555555555555555555555555555555555";

    // 1. Lưu nhóm ban đầu
    saveKnownGroup({ address: testAddr, name: "Nhóm Hụi Mới" });

    // 2. Người dùng đổi tên nhóm thành "Hụi Tiết Kiệm Gia Đình"
    updateKnownGroupName(testAddr, "Hụi Tiết Kiệm Gia Đình");

    // Xác nhận đã lưu tên mới vào storage
    const rawAfterEdit = mockStorage.getItem(SAVINGS_CLUBS_STORAGE_KEY);
    const parsedAfterEdit = JSON.parse(rawAfterEdit!);
    const itemAfterEdit = parsedAfterEdit.find((g: { address: string }) => g.address.toLowerCase() === testAddr.toLowerCase());
    assert.equal(itemAfterEdit.name, "Hụi Tiết Kiệm Gia Đình");

    // 3. Cơ chế on-chain sync trong App.tsx gọi lại saveKnownGroup với tên hợp đồng on-chain ("Nhóm Hụi Mới")
    saveKnownGroup({ address: testAddr, name: "Nhóm Hụi Mới" });

    // 4. Bắt buộc: Tên tùy chỉnh "Hụi Tiết Kiệm Gia Đình" phải được bảo toàn, không bị ghi đè thành "Nhóm Hụi Mới"
    const rawAfterSync = mockStorage.getItem(SAVINGS_CLUBS_STORAGE_KEY);
    const parsedAfterSync = JSON.parse(rawAfterSync!);
    const itemAfterSync = parsedAfterSync.find((g: { address: string }) => g.address.toLowerCase() === testAddr.toLowerCase());
    assert.equal(
      itemAfterSync.name,
      "Hụi Tiết Kiệm Gia Đình",
      "Customized group name must NOT be overwritten by on-chain sync"
    );
  } finally {
    globalThis.window = originalWindow;
  }
});

test("TC-FIX-05 (AC-02.2): saveKnownGroup bảo toàn tên tùy chỉnh của nhóm mặc định (DEFAULT_SAVINGS_CLUBS)", () => {
  const storageMap = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => storageMap.set(key, val),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  const originalWindow = globalThis.window;
  // @ts-expect-error Mocking window for test
  globalThis.window = { localStorage: mockStorage };

  try {
    const baviAddr = DEFAULT_SAVINGS_CLUBS[0].address;

    // Người dùng đổi tên nhóm mặc định BAVI thành "Hụi BAVI Thân Hữu"
    updateKnownGroupName(baviAddr, "Hụi BAVI Thân Hữu");

    // On-chain sync gọi saveKnownGroup với tên gốc "BAVI Savings Club"
    saveKnownGroup({ address: baviAddr, name: "BAVI Savings Club" });

    // Tên tùy chỉnh "Hụi BAVI Thân Hữu" phải được giữ vững
    const groups = getKnownGroups();
    const bavi = groups.find((g) => g.address.toLowerCase() === baviAddr.toLowerCase());
    assert.ok(bavi);
    assert.equal(
      bavi.name,
      "Hụi BAVI Thân Hữu",
      "Default group customized name must NOT be overwritten back to defaultMatch.name"
    );
  } finally {
    globalThis.window = originalWindow;
  }
});

test("TC-FIX-06 (AC-02.3): saveKnownGroup nâng cấp tên placeholder (Nhóm Hụi 0x...) khi nhận được tên on-chain thật", () => {
  const storageMap = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => storageMap.set(key, val),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  const originalWindow = globalThis.window;
  // @ts-expect-error Mocking window for test
  globalThis.window = { localStorage: mockStorage };

  try {
    const testAddr = "0x7777777777777777777777777777777777777777";

    // 1. Nhập thủ công địa chỉ, tạo placeholder
    saveKnownGroup({ address: testAddr, name: "Nhóm Hụi 0x7777...7777" });

    // 2. On-chain sync trả về tên thật "Hụi Doanh Nhân Arc"
    saveKnownGroup({ address: testAddr, name: "Hụi Doanh Nhân Arc" });

    const groups = getKnownGroups();
    const found = groups.find((g) => g.address.toLowerCase() === testAddr.toLowerCase());
    assert.ok(found);
    assert.equal(
      found.name,
      "Hụi Doanh Nhân Arc",
      "Placeholder name must be upgraded to real on-chain name"
    );
  } finally {
    globalThis.window = originalWindow;
  }
});

// ============================================================================
// REQ-03: Đồng Bộ Hiển Thị Trong App.tsx
// ============================================================================

test("TC-FIX-07 (AC-03.1): App.tsx memoize currentClubForModal bằng useMemo", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("const currentClubForModal = useMemo("),
    "App.tsx must memoize currentClubForModal using useMemo"
  );
  assert.ok(
    appSrc.includes("[contractAddress, displayedGroupName]"),
    "currentClubForModal must depend on contractAddress and displayedGroupName"
  );
});

test("TC-FIX-08 (AC-03.2): App.tsx truyền currentClubForModal vào EditClubNameModal", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("club={currentClubForModal}"),
    "App.tsx must pass memoized currentClubForModal to EditClubNameModal"
  );
  assert.ok(
    appSrc.includes("setNameUpdateTrigger((prev) => prev + 1);"),
    "App.tsx must increment nameUpdateTrigger upon successful save"
  );
});

test("TC-FIX-09 (AC-03.3): displayedGroupName trong App.tsx tính toán ưu tiên tên tùy chỉnh từ danh bạ", () => {
  const appSrc = readSource("src/App.tsx");

  assert.ok(
    appSrc.includes("const knownClub = getKnownGroups().find((c) => c.address.toLowerCase() === contractAddress.toLowerCase());"),
    "App.tsx must find knownClub from getKnownGroups()"
  );
  assert.ok(
    appSrc.includes("const displayedGroupName = (knownClub && knownClub.name && !knownClub.name.startsWith(\"Nhóm Hụi 0x\") && !knownClub.name.startsWith(\"Savings Club 0x\"))"),
    "displayedGroupName must prioritize valid non-placeholder custom name"
  );
});
