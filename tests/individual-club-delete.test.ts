import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SAVINGS_CLUBS_STORAGE_KEY,
  REMOVED_CLUBS_STORAGE_KEY,
  getKnownGroups,
  saveKnownGroup,
  removeKnownGroup,
  clearCustomKnownGroups,
  DEFAULT_SAVINGS_CLUBS,
} from "../src/lib/savingsClubDirectory.ts";
import { translations } from "../src/lib/i18n.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Quản Lý Dữ Liệu Danh Bạ Nhóm Đã Xóa (savingsClubDirectory.ts)
// ============================================================================

test("TC-DEL-01 (AC-01.1 & AC-01.2): removeKnownGroup(address) đưa địa chỉ vào danh sách đã xóa và loại bỏ khỏi hui_known_groups", () => {
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
    const testAddr = "0x1111111111111111111111111111111111111111";
    saveKnownGroup({ address: testAddr, name: "Nhóm Hụi Thử Nghiệm" });

    // Verify it is saved
    const knownBefore = getKnownGroups();
    assert.ok(knownBefore.some((g) => g.address.toLowerCase() === testAddr.toLowerCase()));

    // Now remove it
    removeKnownGroup(testAddr);

    // Verify it is removed from hui_known_groups and added to hui_removed_groups
    const removedRaw = mockStorage.getItem(REMOVED_CLUBS_STORAGE_KEY);
    assert.ok(removedRaw, "REMOVED_CLUBS_STORAGE_KEY must be stored in localStorage");
    const parsedRemoved = JSON.parse(removedRaw);
    assert.ok(parsedRemoved.includes(testAddr.toLowerCase()), "Removed address must be in hui_removed_groups");

    // Verify getKnownGroups does not return the removed group
    const knownAfter = getKnownGroups();
    assert.ok(!knownAfter.some((g) => g.address.toLowerCase() === testAddr.toLowerCase()));
  } finally {
    globalThis.window = originalWindow;
  }
});

test("TC-DEL-02 (AC-01.3): getKnownGroups() loại bỏ các địa chỉ trong danh sách đã xóa, kể cả nhóm mặc định", () => {
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
    const defaultAlphaAddr = DEFAULT_SAVINGS_CLUBS[1].address; // Nhóm Hụi Arc Alpha

    // Initially present
    const initialGroups = getKnownGroups();
    assert.ok(initialGroups.some((g) => g.address.toLowerCase() === defaultAlphaAddr.toLowerCase()));

    // User deletes this club (e.g. cancelled/expired)
    removeKnownGroup(defaultAlphaAddr);

    const updatedGroups = getKnownGroups();
    assert.ok(
      !updatedGroups.some((g) => g.address.toLowerCase() === defaultAlphaAddr.toLowerCase()),
      "Removed default group must NOT be re-appended by getKnownGroups"
    );
  } finally {
    globalThis.window = originalWindow;
  }
});

test("TC-DEL-03 (AC-01.4): saveKnownGroup khôi phục nhóm nếu người dùng cố ý thêm lại", () => {
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
    const testAddr = "0x2222222222222222222222222222222222222222";
    saveKnownGroup({ address: testAddr, name: "Nhóm Hụi Tạm Thời" });
    removeKnownGroup(testAddr);

    assert.ok(!getKnownGroups().some((g) => g.address.toLowerCase() === testAddr.toLowerCase()));

    // User deliberately saves it again
    saveKnownGroup({ address: testAddr, name: "Nhóm Hụi Khôi Phục" });
    assert.ok(getKnownGroups().some((g) => g.address.toLowerCase() === testAddr.toLowerCase()));
  } finally {
    globalThis.window = originalWindow;
  }
});

// ============================================================================
// REQ-02: Icon Xóa Cho Từng Club Trong ClubDirectoryModal.tsx
// ============================================================================

test("TC-DEL-04 (AC-02.1 & AC-02.2): ClubDirectoryModal.tsx render nút icon Trash2 cho từng thẻ club với tooltip và aria-label", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    modalSrc.includes("handleDeleteGroup(group, e)") ||
    modalSrc.includes("handleDeleteGroup"),
    "ClubDirectoryModal must declare handleDeleteGroup callback"
  );
  assert.ok(
    modalSrc.includes("<Trash2 size={16} />") || modalSrc.includes("Trash2 size={16}"),
    "ClubDirectoryModal must render <Trash2 size={16} /> icon button"
  );
  assert.ok(
    modalSrc.includes("title={isEn ? t(\"clubDirectoryModal.deleteClubTooltip\", language) : \"Xóa nhóm khỏi danh sách (đã hủy / hết hạn / không chơi nữa)\"}"),
    "ClubDirectoryModal must provide informative title tooltip for delete button"
  );
  assert.ok(
    modalSrc.includes("aria-label={isEn ? `Delete ${group.name}` : `Xóa nhóm ${group.name}`}"),
    "ClubDirectoryModal must provide accessible aria-label on delete button"
  );
});

test("TC-DEL-05 (AC-02.3, AC-02.4 & AC-02.5): handleDeleteGroup chặn nổi bọt, gọi removeKnownGroup, cập nhật state và xử lý chuyển nhóm an toàn", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    modalSrc.includes("e.stopPropagation();"),
    "handleDeleteGroup must stop event propagation"
  );
  assert.ok(
    modalSrc.includes("removeKnownGroup(group.address);"),
    "handleDeleteGroup must call removeKnownGroup with target address"
  );
  assert.ok(
    modalSrc.includes("setGroups(updated);"),
    "handleDeleteGroup must update modal groups state immediately"
  );
  assert.ok(
    modalSrc.includes("onSelectGroup(fallbackAddress);"),
    "handleDeleteGroup must switch to fallback group if active group is deleted"
  );
});

// ============================================================================
// REQ-03: Đa Ngôn Ngữ & Trải Nghiệm Người Dùng (i18n)
// ============================================================================

test("TC-DEL-06 (AC-03.1 & AC-03.2): Từ điển i18n hỗ trợ song ngữ cho các thông báo xóa nhóm", () => {
  const viModal = translations.vi.clubDirectoryModal;
  const enModal = translations.en.clubDirectoryModal;

  assert.ok(viModal.deleteClubTooltip.includes("Xóa nhóm khỏi danh sách"), "vi deleteClubTooltip must be present");
  assert.ok(enModal.deleteClubTooltip.includes("Remove club from directory"), "en deleteClubTooltip must be present");

  assert.ok(viModal.deleteClubSuccess.includes("Đã xóa nhóm"), "vi deleteClubSuccess must be present");
  assert.ok(enModal.deleteClubSuccess.includes("Removed club"), "en deleteClubSuccess must be present");

  assert.ok(viModal.deleteClubAndSwitched.includes("chuyển về nhóm mặc định"), "vi deleteClubAndSwitched must be present");
  assert.ok(enModal.deleteClubAndSwitched.includes("switched to default club"), "en deleteClubAndSwitched must be present");
});

test("TC-MANIFEST-01: File manifest docs/manifests/task-032/manifest.json tồn tại và chứa mã băm hợp lệ", () => {
  const manifestPath = path.resolve(process.cwd(), "docs/manifests/task-032/manifest.json");
  assert.ok(fs.existsSync(manifestPath), "Manifest file docs/manifests/task-032/manifest.json must exist");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.taskId, "task-032", "Manifest taskId must be task-032");
  assert.ok(manifest.files["src/lib/savingsClubDirectory.ts"], "savingsClubDirectory.ts must be recorded in manifest");
  assert.ok(manifest.files["src/components/savings/ClubDirectoryModal.tsx"], "ClubDirectoryModal.tsx must be recorded in manifest");
  assert.ok(manifest.files["src/lib/i18n.ts"], "i18n.ts must be recorded in manifest");
});
