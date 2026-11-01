import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { translations } from "../src/lib/i18n.ts";
import { GROUP_STATE } from "../src/contract.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
}

// ============================================================================
// TASK-056: Ngăn chặn xóa club khi đang hoạt động, cho phép xóa club mới tạo chưa có thành viên
// ============================================================================

test("TC-ACTIVE-DEL-01 (AC-01): ClubDirectoryModal.tsx tích hợp useReadContracts đọc cả state và members(0n)", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    modalSrc.includes("useReadContracts"),
    "ClubDirectoryModal must import and use useReadContracts from wagmi"
  );
  assert.ok(
    modalSrc.includes("ROTATING_SAVINGS_ABI"),
    "ClubDirectoryModal must import ROTATING_SAVINGS_ABI"
  );
  assert.ok(
    modalSrc.includes("GROUP_STATE"),
    "ClubDirectoryModal must import GROUP_STATE from contract"
  );
  assert.ok(
    modalSrc.includes('functionName: "state"'),
    "ClubDirectoryModal must query on-chain state() function"
  );
  assert.ok(
    modalSrc.includes('functionName: "members"') && modalSrc.includes("args: [0n]"),
    "ClubDirectoryModal must query on-chain members(0n) to check member count"
  );
});

test("TC-ACTIVE-DEL-02 (AC-02): isActive phân loại chuẩn xác: club ACTIVE hoặc OPEN đã có thành viên bị cấm xóa", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  // Verify isActive logic:
  // rawState === GROUP_STATE.ACTIVE || (rawState === GROUP_STATE.OPEN && hasMember0)
  assert.ok(
    modalSrc.includes("rawState === GROUP_STATE.ACTIVE ||") &&
    modalSrc.includes("(rawState === GROUP_STATE.OPEN && hasMember0)"),
    "isActive must be true only for ACTIVE clubs or OPEN clubs that already have members"
  );

  // Verify disabled button rendered for active clubs
  assert.ok(
    modalSrc.includes("disabled={true}"),
    "Active club must render button with disabled={true}"
  );
  assert.ok(
    modalSrc.includes("cursor-not-allowed"),
    "Active club delete button must have cursor-not-allowed styling"
  );
  assert.ok(
    modalSrc.includes("deleteClubDisabledTooltip"),
    "Active club delete button must render deleteClubDisabledTooltip"
  );
});

test("TC-ACTIVE-DEL-03 (AC-03): Cho phép xóa khi club mới tạo chưa có thành viên (OPEN && !hasMember0) hoặc đã kết thúc", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  // For inactive clubs (including OPEN with 0 members), regular delete button is enabled with handleDeleteGroup
  assert.ok(
    modalSrc.includes("handleDeleteGroup(group, e)"),
    "Inactive clubs and 0-member open clubs must allow invoking handleDeleteGroup"
  );
  assert.ok(
    modalSrc.includes("deleteClubTooltip"),
    "Inactive clubs must show standard deletion tooltip"
  );
});

test("TC-ACTIVE-DEL-04 (AC-04): handleDeleteGroup và handleConfirmDelete cài đặt chốt chặn kép bảo vệ", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  // Both handlers must stop action if club is active
  const handleDeleteMatch = modalSrc.match(/const handleDeleteGroup[\s\S]*?setConfirmingClub/);
  assert.ok(handleDeleteMatch, "handleDeleteGroup must exist");
  assert.ok(
    handleDeleteMatch[0].includes("deleteActiveError") &&
    handleDeleteMatch[0].includes("isActive"),
    "handleDeleteGroup must guard against active club deletion before setConfirmingClub"
  );

  const handleConfirmMatch = modalSrc.match(/const handleConfirmDelete[\s\S]*?removeKnownGroup/);
  assert.ok(handleConfirmMatch, "handleConfirmDelete must exist");
  assert.ok(
    handleConfirmMatch[0].includes("deleteActiveError") &&
    handleConfirmMatch[0].includes("isActive"),
    "handleConfirmDelete must verify club is not active before calling removeKnownGroup"
  );
});

test("TC-ACTIVE-DEL-05 (AC-05): Hiển thị badge trạng thái on-chain sắc nét: phân biệt rõ OPEN có tv và OPEN 0 tv", () => {
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  assert.ok(
    modalSrc.includes("rawState === GROUP_STATE.OPEN") &&
    modalSrc.includes("Mở tham gia") &&
    modalSrc.includes("Mở tham gia (0 tv)"),
    "Must distinguish between OPEN with members and empty newly-created OPEN club (0 tv)"
  );
  assert.ok(
    modalSrc.includes("rawState === GROUP_STATE.ACTIVE") &&
    modalSrc.includes("Đang chạy"),
    "Must display 'Đang chạy' badge for ACTIVE state"
  );
  assert.ok(
    modalSrc.includes("rawState === GROUP_STATE.COMPLETED") &&
    modalSrc.includes("Hoàn thành"),
    "Must display 'Hoàn thành' badge for COMPLETED state"
  );
  assert.ok(
    modalSrc.includes("rawState === GROUP_STATE.CANCELLED") &&
    modalSrc.includes("Đã huỷ"),
    "Must display 'Đã huỷ' badge for CANCELLED state"
  );
});

test("TC-ACTIVE-DEL-06 (AC-06): Từ điển song ngữ i18n cung cấp 100% key parity cho deleteClubDisabledTooltip và deleteActiveError", () => {
  const vi = translations.vi.clubDirectoryModal;
  const en = translations.en.clubDirectoryModal;

  assert.ok(vi.deleteClubDisabledTooltip, "vi.clubDirectoryModal.deleteClubDisabledTooltip must be defined");
  assert.ok(en.deleteClubDisabledTooltip, "en.clubDirectoryModal.deleteClubDisabledTooltip must be defined");
  assert.ok(vi.deleteActiveError, "vi.clubDirectoryModal.deleteActiveError must be defined");
  assert.ok(en.deleteActiveError, "en.clubDirectoryModal.deleteActiveError must be defined");

  assert.equal(
    vi.deleteClubDisabledTooltip,
    "Không thể xóa nhóm đang hoạt động (Mở tham gia / Đang chạy)"
  );
  assert.equal(
    en.deleteClubDisabledTooltip,
    "Cannot remove active savings club (Open / Active)"
  );
  assert.equal(vi.deleteActiveError, "Không thể xóa nhóm đang hoạt động!");
  assert.equal(en.deleteActiveError, "Cannot remove a savings club that is currently active!");
});
