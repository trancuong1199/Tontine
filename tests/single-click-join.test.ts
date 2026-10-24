import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Tinh chỉnh ActionPanel.tsx cho ví Web3 tiêu chuẩn
// ============================================================================

test("TC-JOIN-01 (AC-01.1): ActionPanel.tsx gọi trực tiếp joinGroup trong handleApproveAndJoin mà không gọi USDC.approve hoặc kiểm tra if (needsApproval)", () => {
  const src = readSource("src/components/savings/ActionPanel.tsx");

  // Extract handleApproveAndJoin function body
  const startIndex = src.indexOf("const handleApproveAndJoin = async () => {");
  assert.ok(startIndex !== -1, "ActionPanel must define handleApproveAndJoin");
  const endIndex = src.indexOf("};", startIndex);
  const fnBody = src.slice(startIndex, endIndex);

  // Must call joinGroup directly
  assert.ok(
    fnBody.includes('functionName: "joinGroup"'),
    "handleApproveAndJoin must call joinGroup function on targetContract"
  );
  assert.ok(
    fnBody.includes("address: targetContract"),
    "handleApproveAndJoin must target targetContract"
  );

  // Must NOT check needsApproval in handleApproveAndJoin
  assert.ok(
    !fnBody.includes("if (needsApproval)"),
    "handleApproveAndJoin must NOT check if (needsApproval)"
  );
  assert.ok(
    !fnBody.includes('functionName: "approve"'),
    "handleApproveAndJoin must NOT call approve on USDC"
  );
});

test("TC-JOIN-02 (AC-01.2): Nút tham gia nhóm trong ActionPanel.tsx hiển thị trực tiếp 'Join Savings Club' / 'Tham gia nhóm' mà không kiểm tra needsApproval", () => {
  const src = readSource("src/components/savings/ActionPanel.tsx");

  // Find the button inside the OPEN phase (before ACTIVE state section)
  const openPhaseSection = src.slice(
    src.indexOf("{state === GROUP_STATE.OPEN && ("),
    src.indexOf("{/* --- ACTIVE state --- */}")
  );

  // Verify button renders without ternary for needsApproval
  assert.ok(
    openPhaseSection.includes('isEn ? "Join Savings Club" : "Tham gia nhóm"'),
    "Join button in OPEN state must render direct Join text"
  );
  assert.ok(
    !openPhaseSection.includes('isEn ? "Approve & Join" : "Approve & Tham gia"'),
    "Join button in OPEN state must NOT contain Approve & Join label"
  );
});

test("TC-JOIN-03 (AC-01.3): ActionPanel.tsx không còn chứa thông báo toast 'Approve USDC trước, rồi join nhóm'", () => {
  const src = readSource("src/components/savings/ActionPanel.tsx");

  assert.ok(
    !src.includes("Approve USDC trước, rồi join nhóm"),
    "ActionPanel must NOT tell user to approve USDC before joining club"
  );
  assert.ok(
    !src.includes("Approve USDC first, then join club"),
    "ActionPanel must NOT tell user to approve USDC first in English"
  );
});

// ============================================================================
// REQ-02: Tinh chỉnh PasskeyActionPanel.tsx cho ví Passkey Smart Account
// ============================================================================

test("TC-JOIN-04 (AC-02.1): PasskeyActionPanel.tsx trong handleApproveAndJoin chỉ thêm duy nhất lệnh joinGroup vào batch calls, không thêm lệnh approve", () => {
  const src = readSource("src/components/savings/PasskeyActionPanel.tsx");

  // Extract handleApproveAndJoin function body
  const startIndex = src.indexOf("const handleApproveAndJoin = async () => {");
  assert.ok(startIndex !== -1, "PasskeyActionPanel must define handleApproveAndJoin");
  const endIndex = src.indexOf("await sendOp(", startIndex);
  const fnBody = src.slice(startIndex, endIndex);

  // Must push joinGroup call
  assert.ok(
    fnBody.includes('functionName: "joinGroup"'),
    "Passkey handleApproveAndJoin must encode joinGroup"
  );
  assert.ok(
    fnBody.includes("to: targetContract"),
    "Passkey handleApproveAndJoin must target targetContract"
  );

  // Must NOT check needsApproval or push approve
  assert.ok(
    !fnBody.includes("if (needsApproval)"),
    "Passkey handleApproveAndJoin must NOT check if (needsApproval)"
  );
  assert.ok(
    !fnBody.includes('functionName: "approve"'),
    "Passkey handleApproveAndJoin must NOT push approve call"
  );
});

test("TC-JOIN-05 (AC-02.2): Nút tham gia nhóm trong PasskeyActionPanel.tsx ở trạng thái OPEN hiển thị trực tiếp 'Join Savings Club' / 'Tham gia nhóm'", () => {
  const src = readSource("src/components/savings/PasskeyActionPanel.tsx");

  const openPhaseSection = src.slice(
    src.indexOf("{state === GROUP_STATE.OPEN && ("),
    src.indexOf("{/* ACTIVE */}")
  );

  assert.ok(
    openPhaseSection.includes('isEn ? "Join Savings Club" : "Tham gia nhóm"'),
    "Passkey join button in OPEN state must render direct Join text"
  );
  assert.ok(
    !openPhaseSection.includes("Approve & Tham gia (1 bước)"),
    "Passkey join button must NOT contain Approve & Tham gia label"
  );
  assert.ok(
    !openPhaseSection.includes("Approve & Join (1 click)"),
    "Passkey join button must NOT contain Approve & Join label"
  );
});

// ============================================================================
// REQ-03: Bảo toàn cơ chế cấp quyền cho Đóng tiền và Đấu giá
// ============================================================================

test("TC-JOIN-06 (AC-03.1): Hàm handleContribute và handleApproveForContribute trong cả ActionPanel.tsx và PasskeyActionPanel.tsx giữ nguyên 100% cơ chế kiểm tra needsApproval", () => {
  const actionSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  // In ActionPanel.tsx
  assert.ok(
    actionSrc.includes("const handleApproveForContribute = () => {"),
    "ActionPanel must define handleApproveForContribute"
  );
  assert.ok(
    actionSrc.includes("if (needsApproval) {\n      handleApproveForContribute();\n      return;\n    }"),
    "ActionPanel handleContribute must guard with handleApproveForContribute when needsApproval"
  );

  // In PasskeyActionPanel.tsx
  const passkeyContributeStart = passkeySrc.indexOf("const handleContribute = async () => {");
  const passkeyContributeEnd = passkeySrc.indexOf("await sendOp(", passkeyContributeStart);
  const passkeyContributeBody = passkeySrc.slice(passkeyContributeStart, passkeyContributeEnd);

  assert.ok(
    passkeyContributeBody.includes("if (needsApproval) {"),
    "Passkey handleContribute must include if (needsApproval)"
  );
  assert.ok(
    passkeyContributeBody.includes('functionName: "approve"'),
    "Passkey handleContribute must push approve when needsApproval is true"
  );
});

test("TC-JOIN-07 (AC-03.2): Hàm handlePlaceBid và handleApproveForBid giữ nguyên 100% cơ chế kiểm tra needsApprovalForBid / needsBidApproval", () => {
  const actionSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  // In ActionPanel.tsx
  assert.ok(
    actionSrc.includes("const handleApproveForBid = () => {"),
    "ActionPanel must define handleApproveForBid"
  );
  assert.ok(
    actionSrc.includes("needsApprovalForBid ? handleApproveForBid : handlePlaceBid"),
    "ActionPanel bid button must toggle between handleApproveForBid and handlePlaceBid based on needsApprovalForBid"
  );

  // In PasskeyActionPanel.tsx
  const passkeyBidStart = passkeySrc.indexOf("const handleBid = async () => {");
  const passkeyBidEnd = passkeySrc.indexOf("await sendOp(", passkeyBidStart);
  const passkeyBidBody = passkeySrc.slice(passkeyBidStart, passkeyBidEnd);

  assert.ok(
    passkeyBidBody.includes("if (needsBidApproval) {"),
    "Passkey handleBid must include if (needsBidApproval)"
  );
  assert.ok(
    passkeyBidBody.includes('functionName: "approve"'),
    "Passkey handleBid must push approve when needsBidApproval is true"
  );
});

// ============================================================================
// REQ-04: Đảm bảo độ tin cậy và không thoái lui (Zero Regression)
// ============================================================================

test("TC-JOIN-08 (AC-04.1 & AC-04.2): Bất biến Zero-Regression và Single-Signature Join được đảm bảo trọn vẹn", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");

  // Verify on-chain joinGroup never touches usdc transfer
  const joinGroupStart = contractSrc.indexOf("function joinGroup() external");
  const joinGroupEnd = contractSrc.indexOf("}", joinGroupStart);
  const joinGroupBody = contractSrc.slice(joinGroupStart, joinGroupEnd);

  assert.ok(
    !joinGroupBody.includes("safeTransferFrom"),
    "On-chain joinGroup() must NOT call safeTransferFrom"
  );
  assert.ok(
    !joinGroupBody.includes("transfer"),
    "On-chain joinGroup() must NOT call transfer"
  );
  assert.ok(
    joinGroupBody.includes("isMember[msg.sender] = true;"),
    "On-chain joinGroup() marks membership directly"
  );
});
