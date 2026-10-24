import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SAVINGS_CLUBS_STORAGE_KEY,
  getKnownGroups,
  saveKnownGroup,
  updateKnownGroupName,
  DEFAULT_SAVINGS_CLUBS,
} from "../src/lib/savingsClubDirectory.ts";
import { translations } from "../src/lib/i18n.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Hàm updateKnownGroupName và getKnownGroups trong savingsClubDirectory.ts
// ============================================================================

test("TC-EDIT-01 (AC-01.1, AC-01.2 & AC-01.3): updateKnownGroupName cập nhật tên nhóm bền vững vào localStorage và kiểm tra validation", () => {
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
    const testAddr = "0x3333333333333333333333333333333333333333";
    saveKnownGroup({ address: testAddr, name: "Nhóm Ban Đầu" });

    // 1. Cập nhật tên nhóm hợp lệ
    updateKnownGroupName(testAddr, "Nhóm Phát Tài 2026");
    const raw = mockStorage.getItem(SAVINGS_CLUBS_STORAGE_KEY);
    assert.ok(raw, "Storage key must exist after update");
    const parsed = JSON.parse(raw);
    const item = parsed.find((g: { address: string }) => g.address.toLowerCase() === testAddr.toLowerCase());
    assert.ok(item, "Updated item must be found in storage");
    assert.equal(item.name, "Nhóm Phát Tài 2026");

    // 2. Tên rỗng hoặc chỉ có khoảng trắng phải bị bỏ qua (không ghi đè tên cũ)
    updateKnownGroupName(testAddr, "   ");
    const rawAfterEmpty = mockStorage.getItem(SAVINGS_CLUBS_STORAGE_KEY);
    const parsedAfterEmpty = JSON.parse(rawAfterEmpty!);
    const itemAfterEmpty = parsedAfterEmpty.find((g: { address: string }) => g.address.toLowerCase() === testAddr.toLowerCase());
    assert.equal(itemAfterEmpty.name, "Nhóm Phát Tài 2026", "Empty name must not overwrite existing valid name");

    // 3. Địa chỉ không hợp lệ phải bị bỏ qua
    updateKnownGroupName("0xinvalid", "Tên Hợp Lệ");
    const rawInvalid = mockStorage.getItem(SAVINGS_CLUBS_STORAGE_KEY);
    const parsedInvalid = JSON.parse(rawInvalid!);
    assert.ok(!parsedInvalid.some((g: { address: string }) => g.address === "0xinvalid"));
  } finally {
    globalThis.window = originalWindow;
  }
});

test("TC-EDIT-02 (AC-01.4): getKnownGroups ưu tiên trả về tên đã tùy chỉnh cho câu lạc bộ", () => {
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
    const defaultBavi = DEFAULT_SAVINGS_CLUBS[0].address;
    // Tùy chỉnh tên cho câu lạc bộ mặc định
    updateKnownGroupName(defaultBavi, "Hụi BAVI Thân Hữu");

    const groups = getKnownGroups();
    const baviGroup = groups.find((g) => g.address.toLowerCase() === defaultBavi.toLowerCase());
    assert.ok(baviGroup, "Default club must be found");
    assert.equal(baviGroup.name, "Hụi BAVI Thân Hữu", "Customized name must override default name in getKnownGroups");
  } finally {
    globalThis.window = originalWindow;
  }
});

// ============================================================================
// REQ-02: Component EditClubNameModal.tsx
// ============================================================================

test("TC-EDIT-03 (AC-02.1, AC-02.2, AC-02.3 & AC-02.4): EditClubNameModal.tsx cấu hình đầy đủ trường input, đếm ký tự, phím Enter/Escape và nút Lưu/Hủy", () => {
  const modalSrc = readSource("src/components/savings/EditClubNameModal.tsx");

  assert.ok(modalSrc.includes("maxLength={40}"), "Input must have maxLength={40}");
  assert.ok(modalSrc.includes("nameInput.length"), "Modal must render character counter");
  assert.ok(modalSrc.includes("handleInputKeyDown"), "Input must handle keydown events");
  assert.ok(modalSrc.includes("e.key === \"Enter\""), "Enter key must trigger save");
  assert.ok(modalSrc.includes("e.key === \"Escape\""), "Escape key must trigger close");
  assert.ok(modalSrc.includes("disabled={!nameInput.trim()}"), "Save button must be disabled when input is empty");
  assert.ok(modalSrc.includes("onSave(club.address, trimmed);"), "Modal must invoke onSave with address and trimmed name");
});

// ============================================================================
// REQ-03: Tích Hợp Icon Sửa Tên Trong ClubDirectoryModal.tsx & ClubCard.tsx
// ============================================================================

test("TC-EDIT-04 (AC-03.1 & AC-03.2): ClubDirectoryModal.tsx render nút icon Pencil cho từng thẻ nhóm và kích hoạt modal sửa tên", () => {
  const dirSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(dirSrc.includes("<Pencil size={14} />"), "ClubDirectoryModal must render <Pencil size={14} /> edit icon");
  assert.ok(dirSrc.includes("setEditingClub(group)"), "Clicking pencil icon must set editingClub state");
  assert.ok(dirSrc.includes("<EditClubNameModal"), "ClubDirectoryModal must render EditClubNameModal component");
  assert.ok(dirSrc.includes("updateKnownGroupName(address, newName)"), "handleSaveClubName must call updateKnownGroupName");
});

test("TC-EDIT-05 (AC-03.3 & AC-03.4): ClubCard.tsx render nút icon Pencil cạnh groupName và App.tsx đồng bộ tức thì", () => {
  const cardSrc = readSource("src/components/savings/ClubCard.tsx");
  const appSrc = readSource("src/App.tsx");

  assert.ok(cardSrc.includes("onEditName?: () => void;"), "ClubCardProps must declare onEditName prop");
  assert.ok(cardSrc.includes("<Pencil size={16} />"), "ClubCard must render <Pencil size={16} /> edit icon");
  assert.ok(appSrc.includes("onEditName={() => setShowEditCurrentClubModal(true)}"), "App.tsx must pass onEditName callback to ClubCard");
  assert.ok(appSrc.includes("<EditClubNameModal"), "App.tsx must render EditClubNameModal for active club");
  assert.ok(appSrc.includes("updateKnownGroupName(address, newName)"), "App.tsx must update name in storage upon save");
});

// ============================================================================
// REQ-04: Từ Điển Song Ngữ i18n
// ============================================================================

test("TC-EDIT-06 (AC-04.1 & AC-04.2): Từ điển song ngữ i18n cung cấp đầy đủ các khóa cho editClubModal", () => {
  const vi = translations.vi.editClubModal;
  const en = translations.en.editClubModal;

  assert.equal(vi.title, "Đổi tên nhóm hụi");
  assert.equal(en.title, "Edit Savings Club Name");

  assert.ok(vi.nameLabel.includes("Tên nhóm"), "Vietnamese nameLabel must be present");
  assert.ok(en.nameLabel.includes("Savings Club Name"), "English nameLabel must be present");

  assert.equal(vi.saveBtn, "Lưu thay đổi");
  assert.equal(en.saveBtn, "Save Changes");

  assert.equal(vi.cancelBtn, "Hủy bỏ");
  assert.equal(en.cancelBtn, "Cancel");

  assert.ok(vi.successToast.includes("{name}"), "Vietnamese success toast must include {name} placeholder");
  assert.ok(en.successToast.includes("{name}"), "English success toast must include {name} placeholder");
});

// ============================================================================
// REQ-05: Kiểm Tra Tính Toàn Vẹn Của Manifest
// ============================================================================

test("TC-MANIFEST-01 (AC-05.2): Manifest task-034 tồn tại và ghi nhận đầy đủ 6 file implementation", () => {
  const manifestPath = path.resolve(process.cwd(), "docs/manifests/task-034/manifest.json");
  assert.ok(fs.existsSync(manifestPath), "Manifest file docs/manifests/task-034/manifest.json must exist");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.taskId, "task-034");
  assert.ok(manifest.files["src/lib/savingsClubDirectory.ts"]);
  assert.ok(manifest.files["src/lib/i18n.ts"]);
  assert.ok(manifest.files["src/components/savings/EditClubNameModal.tsx"]);
  assert.ok(manifest.files["src/components/savings/ClubDirectoryModal.tsx"]);
  assert.ok(manifest.files["src/components/savings/ClubCard.tsx"]);
  assert.ok(manifest.files["src/App.tsx"]);
});
