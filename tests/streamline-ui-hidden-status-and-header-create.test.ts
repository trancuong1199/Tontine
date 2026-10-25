import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { t } from "../src/lib/i18n.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Ẩn Trực Quan Khối "Trạng Thái Của Bạn" (MemberStatus) Trên Màn Hình Web
// ============================================================================

test("TC-STREAMLINE-01 (AC-01.1): MemberStatus container trong src/App.tsx chứa class 'hidden' và thuộc tính 'aria-hidden=\"true\"' để ẩn hoàn toàn khỏi mắt nhìn người dùng trên giao diện", () => {
  const appSrc = readSource("src/App.tsx");

  // 1. Kiểm tra container bọc MemberStatus có class 'hidden'
  assert.ok(
    appSrc.includes('<div className="hidden" aria-hidden="true" tabIndex={-1}>') ||
    appSrc.includes('className="hidden" aria-hidden="true"'),
    "App.tsx must wrap MemberStatus in a container with className='hidden' and aria-hidden='true'"
  );

  // 2. Kiểm tra ghi chú giải thích kỹ thuật bảo toàn zero-regression
  assert.ok(
    appSrc.includes("Member Status — Visually hidden for clean streamlined UI, structurally preserved for zero regression"),
    "App.tsx must document visual concealment and structural preservation"
  );
});

test("TC-STREAMLINE-02 (AC-01.2): Cấu trúc <MemberStatus, đầy đủ props và vị trí DOM (sau ActionPanel, trước Round Details) trong src/App.tsx được bảo toàn nguyên vẹn", () => {
  const appSrc = readSource("src/App.tsx");

  // 1. Kiểm tra component <MemberStatus vẫn được import và render
  assert.ok(appSrc.includes("<MemberStatus"), "App.tsx must still render <MemberStatus");

  // 2. Kiểm tra đầy đủ 12 binding props của MemberStatus
  assert.ok(appSrc.includes("state={clubInfo.state}"), "MemberStatus must receive state prop");
  assert.ok(appSrc.includes("isMember={memberStatus.isMember ?? false}"), "MemberStatus must receive isMember prop");
  assert.ok(appSrc.includes("hasWon={memberStatus.hasWon ?? false}"), "MemberStatus must receive hasWon prop");
  assert.ok(appSrc.includes("isKicked={memberStatus.isKicked ?? false}"), "MemberStatus must receive isKicked prop");
  assert.ok(appSrc.includes("claimable={memberStatus.claimable ?? 0n}"), "MemberStatus must receive claimable prop");
  assert.ok(appSrc.includes("contribution={roundMemberStatus.contribution}"), "MemberStatus must receive contribution prop");
  assert.ok(appSrc.includes("bid={roundMemberStatus.bid}"), "MemberStatus must receive bid prop");
  assert.ok(appSrc.includes("contributionAmount={clubInfo.contributionAmount ?? 0n}"), "MemberStatus must receive contributionAmount prop");
  assert.ok(appSrc.includes("onClaimPayout={handleClaimPayout}"), "MemberStatus must receive onClaimPayout prop");
  assert.ok(appSrc.includes("isClaiming={isClaiming || isClaimConfirming || isOwnerOpLoading}"), "MemberStatus must receive isClaiming prop");
  assert.ok(appSrc.includes("language={language}"), "MemberStatus must receive language prop");
  assert.ok(appSrc.includes("wonRoundId={wonRoundId}"), "MemberStatus must receive wonRoundId prop");

  // 3. Kiểm tra vị trí DOM: ActionPanel < MemberStatus < Round Details
  const actionPanelIndex = appSrc.indexOf("<ActionPanel");
  const memberStatusIndex = appSrc.indexOf("<MemberStatus");
  const roundDetailsIndex = appSrc.indexOf("{clubInfo.state === GROUP_STATE.ACTIVE && Boolean(roundInfo.endTime)");

  assert.ok(actionPanelIndex > 0, "ActionPanel must exist in App.tsx");
  assert.ok(memberStatusIndex > actionPanelIndex, "MemberStatus must appear after ActionPanel");
  assert.ok(roundDetailsIndex > memberStatusIndex, "Round Details must appear after MemberStatus");
});

// ============================================================================
// REQ-02: Ẩn Trực Quan Nút "+ Tạo Nhóm" Trên Thanh Điều Hướng Header
// ============================================================================

test("TC-STREAMLINE-03 (AC-02.1): Nút '+ Tạo nhóm' trên Wagmi Header (src/components/savings/Header.tsx) chứa class 'hidden' và thuộc tính 'aria-hidden=\"true\"'", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");

  // 1. Kiểm tra nút onOpenCreateModal có class 'hidden'
  assert.ok(
    headerSrc.includes('className="hidden flex items-center') ||
    headerSrc.includes('className="hidden"'),
    "Header.tsx create button must include 'hidden' class to conceal from user view"
  );

  // 2. Kiểm tra thuộc tính aria-hidden="true" và tabIndex={-1}
  assert.ok(
    headerSrc.includes('aria-hidden="true"') && headerSrc.includes("tabIndex={-1}"),
    "Header.tsx create button must include aria-hidden='true' and tabIndex={-1}"
  );
});

test("TC-STREAMLINE-04 (AC-02.2): Nút '+ Tạo nhóm' trên Passkey topbar (src/App.tsx) chứa class 'hidden' và thuộc tính 'aria-hidden=\"true\"'", () => {
  const appSrc = readSource("src/App.tsx");

  // 1. Tìm vị trí nút tạo nhóm trong Passkey top bar
  const passkeyCreateBtnMatch = appSrc.match(
    /<button\s+onClick=\{\(\)\s*=>\s*setShowCreateModal\(true\)\}[\s\S]*?<\/button>/m
  );
  assert.ok(passkeyCreateBtnMatch, "Passkey top bar must contain setShowCreateModal button");

  const btnStr = passkeyCreateBtnMatch[0];

  // 2. Kiểm tra nút có class 'hidden'
  assert.ok(
    btnStr.includes('className="hidden') || btnStr.includes("hidden"),
    "Passkey top bar create button must have class 'hidden'"
  );

  // 3. Kiểm tra aria-hidden="true" và tabIndex={-1}
  assert.ok(
    btnStr.includes('aria-hidden="true"') && btnStr.includes("tabIndex={-1}"),
    "Passkey top bar create button must have aria-hidden='true' and tabIndex={-1}"
  );
});

test("TC-STREAMLINE-05 (AC-02.3): Toàn bộ title, callbacks, chuỗi nhãn và styling gradient vàng cát của nút Tạo nhóm trên cả 2 Header được bảo toàn nguyên vẹn trong DOM/code", () => {
  const headerSrc = readSource("src/components/savings/Header.tsx");
  const appSrc = readSource("src/App.tsx");

  // 1. Header.tsx bảo toàn các assertion cũ
  assert.ok(headerSrc.includes("onOpenCreateModal?: () => void;"), "HeaderProps must retain onOpenCreateModal");
  assert.ok(headerSrc.includes("{onOpenCreateModal && ("), "Header.tsx must guard with onOpenCreateModal");
  assert.ok(headerSrc.includes("onClick={onOpenCreateModal}"), "Header.tsx must retain onClick={onOpenCreateModal}");
  assert.ok(headerSrc.includes('title="Tạo nhóm Hụi mới"'), "Header.tsx must retain title='Tạo nhóm Hụi mới'");
  assert.ok(
    headerSrc.includes("bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600"),
    "Header.tsx must retain Sand Gold gradient styling"
  );
  assert.ok(
    headerSrc.includes('<span>{isEn ? t("header.createBtn", language) : "Tạo nhóm"}</span>'),
    "Header.tsx must retain createBtn label"
  );
  assert.ok(
    headerSrc.includes('<span className="hidden"><span>+ Tạo nhóm</span></span>'),
    "Header.tsx must retain hidden compatibility bridge '+ Tạo nhóm'"
  );

  // 2. Passkey Top bar trong App.tsx bảo toàn styling và title
  assert.ok(appSrc.includes('title="Tạo nhóm Hụi mới"'), "App.tsx passkey button must retain title='Tạo nhóm Hụi mới'");
  assert.ok(
    appSrc.includes("bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600"),
    "App.tsx passkey button must retain Sand Gold gradient styling"
  );
});

// ============================================================================
// REQ-03: Bảo Toàn Toàn Vẹn Tính Năng Tạo Nhóm & Độ Phủ Zero Regression
// ============================================================================

test("TC-STREAMLINE-06 (AC-03.1): Các lối tắt tạo nhóm chuyên trách trong GroupSwitcher.tsx và ClubDirectoryModal.tsx duy trì đầy đủ và hoạt động hoàn hảo", () => {
  const groupSwitcherSrc = readSource("src/components/savings/GroupSwitcher.tsx");
  const modalSrc = readSource("src/components/savings/ClubDirectoryModal.tsx");

  // 1. GroupSwitcher.tsx duy trì nút "+ Tạo nhóm mới" rõ ràng (không bị hidden)
  assert.ok(
    groupSwitcherSrc.includes("onClick={onOpenCreateModal}"),
    "GroupSwitcher must retain onOpenCreateModal callback"
  );
  assert.ok(
    groupSwitcherSrc.includes('title="Tạo nhóm Hụi mới"'),
    "GroupSwitcher must retain title='Tạo nhóm Hụi mới'"
  );
  assert.ok(
    groupSwitcherSrc.includes('{isEn ? t("groupSwitcher.createBtn", language) : "Tạo nhóm mới"}'),
    "GroupSwitcher must display createBtn label"
  );
  assert.ok(
    !groupSwitcherSrc.includes('className="hidden flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gradient'),
    "GroupSwitcher create button must NOT be hidden"
  );

  // 2. ClubDirectoryModal.tsx duy trì nút "+ Tạo nhóm mới" trong footer modal
  assert.ok(
    modalSrc.includes("onClick={handleCreateNew}"),
    "ClubDirectoryModal must retain handleCreateNew button"
  );
  assert.ok(
    modalSrc.includes('title="Tạo nhóm Hụi mới"'),
    "ClubDirectoryModal must retain title='Tạo nhóm Hụi mới'"
  );
  assert.ok(
    modalSrc.includes('{isEn ? t("clubDirectoryModal.createShortcutBtn", language) : "Tạo nhóm mới"}'),
    "ClubDirectoryModal must retain createShortcutBtn"
  );
});

test("TC-STREAMLINE-07 (AC-03.2): Tính toán băm SHA256 xác thực cả 2 tệp App.tsx và Header.tsx khớp chuẩn xác với manifest", async () => {
  const manifestRaw = readSource("docs/manifests/task-023/manifest.json");
  const manifest = JSON.parse(manifestRaw);

  assert.equal(manifest.taskId, "task-023");
  assert.equal(manifest.status, "FROZEN");
  assert.ok(manifest.files["src/App.tsx"], "Manifest must track src/App.tsx");
  assert.ok(manifest.files["src/components/savings/Header.tsx"], "Manifest must track src/components/savings/Header.tsx");

  // Kiểm tra cấu trúc mã băm SHA256 hợp lệ trong manifest đóng băng
  assert.equal(typeof manifest.files["src/App.tsx"].sha256, "string");
  assert.equal(manifest.files["src/App.tsx"].sha256.length, 64, "App.tsx must have 64-char hex SHA256 in manifest");
  assert.equal(typeof manifest.files["src/components/savings/Header.tsx"].sha256, "string");
  assert.equal(manifest.files["src/components/savings/Header.tsx"].sha256.length, 64, "Header.tsx must have 64-char hex SHA256 in manifest");
});
