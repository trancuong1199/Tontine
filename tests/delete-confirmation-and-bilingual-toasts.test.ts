import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { translations } from "../src/lib/i18n.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Popup Xác Nhận Xóa Nhóm (Confirmation Modal) Trong ClubDirectoryModal
// ============================================================================

test("TC-CONFIRM-01 (AC-01.1): Bấm icon thùng rác thiết lập confirmingClub, mở popup xác nhận và KHÔNG xóa ngay", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    modalSrc.includes("const [confirmingClub, setConfirmingClub] = useState<SavingsClubItem | null>(null);"),
    "ClubDirectoryModal must declare confirmingClub state initialized to null"
  );

  assert.ok(
    modalSrc.includes("const handleDeleteGroup = (group: SavingsClubItem, e: React.MouseEvent) => {") &&
      modalSrc.includes("setConfirmingClub(group);"),
    "handleDeleteGroup must set confirmingClub to trigger confirmation popup"
  );
});

test("TC-CONFIRM-02 (AC-01.2): Popup xác nhận hiển thị AlertTriangle, tiêu đề, tên nhóm, địa chỉ, nút Hủy bỏ và Xác nhận xóa", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(modalSrc.includes("<AlertTriangle size={22} />"), "Confirmation dialog must render AlertTriangle warning icon");
  assert.ok(
    modalSrc.includes("confirmDeleteTitle"),
    "Confirmation dialog must display confirmDeleteTitle"
  );
  assert.ok(
    modalSrc.includes("confirmingClub.name"),
    "Confirmation dialog must display target club name"
  );
  assert.ok(
    modalSrc.includes("formatAddress(confirmingClub.address)"),
    "Confirmation dialog must display formatted club address"
  );
  assert.ok(
    modalSrc.includes("cancelDeleteBtn"),
    "Confirmation dialog must provide cancelDeleteBtn button"
  );
  assert.ok(
    modalSrc.includes("confirmDeleteBtn"),
    "Confirmation dialog must provide confirmDeleteBtn button"
  );
  assert.ok(
    modalSrc.includes("role=\"alertdialog\""),
    "Confirmation dialog must have accessible alertdialog role"
  );
});

test("TC-CONFIRM-03 (AC-01.3): Nút Hủy bỏ và click backdrop của popup xác nhận đóng popup mà không xóa", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    modalSrc.includes("onClick={(e) => {\n            e.stopPropagation();\n            setConfirmingClub(null);\n          }}") ||
      modalSrc.includes("setConfirmingClub(null);"),
    "Backdrop or cancel button click must reset confirmingClub to null"
  );
});

test("TC-CONFIRM-04 (AC-01.4): Phím Escape đóng popup xác nhận trước mà không đóng toàn bộ modal danh bạ", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    modalSrc.includes("if (e.key === \"Escape\") {") &&
      modalSrc.includes("if (confirmingClub) {") &&
      modalSrc.includes("setConfirmingClub(null);") &&
      modalSrc.includes("onClose();"),
    "Escape key listener must safely prioritize closing confirmingClub popup before directory modal"
  );
});

test("TC-CONFIRM-05 (AC-01.5): Nút Xác nhận xóa kích hoạt handleConfirmDelete, xóa nhóm, cập nhật UI và đóng popup", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    modalSrc.includes("const handleConfirmDelete = () => {"),
    "ClubDirectoryModal must declare handleConfirmDelete handler"
  );
  assert.ok(
    modalSrc.includes("removeKnownGroup(group.address);"),
    "handleConfirmDelete must remove group from persistent storage"
  );
  assert.ok(
    modalSrc.includes("setGroups(updated);"),
    "handleConfirmDelete must update local groups state"
  );
  assert.ok(
    modalSrc.includes("setConfirmingClub(null);"),
    "handleConfirmDelete must close confirmation popup"
  );
  assert.ok(
    modalSrc.includes("onSelectGroup(fallbackAddress);"),
    "handleConfirmDelete must switch to fallback group if active group is deleted"
  );
});

// ============================================================================
// REQ-02: Chuẩn Hóa Thông Báo Song Ngữ Toàn Diện (100% Bilingual Toasts)
// ============================================================================

test("TC-TOAST-01 (AC-02.1 & AC-02.2): Toast thông báo xóa nhóm thông thường có định dạng song ngữ chuẩn", () => {
  const viMsg = translations.vi.clubDirectoryModal.deleteClubSuccess;
  const enMsg = translations.en.clubDirectoryModal.deleteClubSuccess;

  assert.ok(viMsg.includes('Đã xóa nhóm "{name}" khỏi danh sách!'), "Vietnamese toast format must match");
  assert.ok(enMsg.includes('Removed club "{name}" from directory!'), "English toast format must match");
});

test("TC-TOAST-02 (AC-02.3 & AC-02.4): Toast thông báo xóa nhóm đang xem có thông báo chuyển nhóm song ngữ chuẩn", () => {
  const viMsg = translations.vi.clubDirectoryModal.deleteClubAndSwitched;
  const enMsg = translations.en.clubDirectoryModal.deleteClubAndSwitched;

  assert.ok(viMsg.includes('Đã xóa nhóm "{name}" và chuyển về nhóm mặc định!'), "Vietnamese switched toast format must match");
  assert.ok(enMsg.includes('Removed club "{name}" and switched to default club!'), "English switched toast format must match");
});

// ============================================================================
// REQ-03: Mở Rộng Từ Điển Song Ngữ i18n
// ============================================================================

test("TC-I18N-01 (AC-03.1, AC-03.2, AC-03.3): Từ điển song ngữ i18n cung cấp đầy đủ các khóa confirmDelete cho vi và en", () => {
  const vi = translations.vi.clubDirectoryModal;
  const en = translations.en.clubDirectoryModal;

  assert.equal(vi.confirmDeleteTitle, "Xác nhận xóa nhóm");
  assert.equal(en.confirmDeleteTitle, "Confirm Delete Club");

  assert.ok(vi.confirmDeleteDesc.includes("{name}") && vi.confirmDeleteDesc.includes("{address}"), "vi confirmDeleteDesc must have placeholders");
  assert.ok(en.confirmDeleteDesc.includes("{name}") && en.confirmDeleteDesc.includes("{address}"), "en confirmDeleteDesc must have placeholders");

  assert.equal(vi.confirmDeleteBtn, "Xác nhận xóa");
  assert.equal(en.confirmDeleteBtn, "Confirm Delete");

  assert.equal(vi.cancelDeleteBtn, "Hủy bỏ");
  assert.equal(en.cancelDeleteBtn, "Cancel");
});

// ============================================================================
// REQ-04: Kiểm Tra Tính Toàn Vẹn Của Manifest
// ============================================================================

test("TC-MANIFEST-01 (AC-04.2): Manifest task-033 tồn tại và ghi nhận các tệp hợp lệ", () => {
  const manifestPath = path.resolve(process.cwd(), "docs/manifests/task-033/manifest.json");
  assert.ok(fs.existsSync(manifestPath), "Manifest file docs/manifests/task-033/manifest.json must exist");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.taskId, "task-033", "Manifest taskId must be task-033");
  assert.ok(manifest.files["src/lib/i18n.ts"], "i18n.ts must be recorded in manifest");
  assert.ok(manifest.files["src/components/savings/ClubDirectoryModal.tsx"], "ClubDirectoryModal.tsx must be recorded in manifest");
});
