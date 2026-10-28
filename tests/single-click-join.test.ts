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

test("TC-JOIN-01 (Task049 REQ03): EOA join uses reviewed collateral permission without USDC approval", () => {
  const src=readSource("src/components/savings/ActionPanel.tsx");
  const body=src.slice(src.indexOf("const runCollateralAction = async"),src.indexOf("const handleApproveForContribute"));
  assert.match(body,/collateralView\.review\(\)/);
  assert.match(body,/fresh\.allowance < fresh\.shortfall/);
  assert.match(body,/address: fresh\.token/);
  assert.match(body,/args: \[fresh\.group, fresh\.shortfall\]/);
  assert.match(body,/joinGroupWithCollateral/);assert.match(body,/joinGroup/);
  assert.doesNotMatch(body,/USDC_ADDRESS|if \(needsApproval\)/);
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

test("TC-JOIN-04 (Task049 REQ04): Passkey conditionally approves CirBTC exact shortfall then one reviewed join", () => {
  const src=readSource("src/components/savings/PasskeyActionPanel.tsx");
  const body=src.slice(src.indexOf("const runCollateralAction = async"),src.indexOf("const handleApproveAndJoin"));
  assert.match(body,/collateralView\.review\(\)/);assert.match(body,/fresh\.allowance < fresh\.shortfall/);
  assert.match(body,/to: fresh\.token/);assert.match(body,/args: \[fresh\.group, fresh\.shortfall\]/);
  assert.match(body,/to: fresh\.group/);assert.match(body,/joinGroupWithCollateral/);assert.match(body,/await sendOp\(calls/);
  assert.doesNotMatch(body,/USDC_ADDRESS|if \(needsApproval\)/);
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
    /const handleApproveForBid = (?:async )?\(\) => \{/.test(actionSrc),
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

test("TC-JOIN-08 (Task049 REQ05): Both join entrypoints share guarded membership logic without pulling USDC", () => {
  const src=readSource("contracts/RotatingSavings.sol");
  assert.match(src,/function joinGroup\(\) external nonReentrant/);
  assert.match(src,/function joinGroupWithCollateral\(uint256 expectedRequirement\) external nonReentrant/);
  const body=src.slice(src.indexOf("function _joinGroup()"),src.indexOf("function startRounds()"));
  assert.match(body,/isMember\[msg.sender\] = true/);assert.match(body,/_handleCollateralDeposit\(msg.sender\)/);
  assert.doesNotMatch(body,/usdc\.|usdcToken/);
});
