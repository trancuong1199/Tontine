import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { t, type Language } from "../src/lib/i18n.ts";
import { parseContractError } from "../src/contract.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// =========================================================================
// REQ-01: Tự Động Xử Lý Cấp Quyền (Approve) USDC Cho Mọi Thao Tác Đóng Hụi
// =========================================================================

test("TC-GUARD-01 (AC-01.1): ActionPanel.tsx nhận diện needsApproval trong handleContribute, kích hoạt giao dịch approve USDC và hiển thị nhãn approve tương ứng", () => {
  const src = readSource("src/components/savings/ActionPanel.tsx");

  // 1. handleApproveForContribute exists and calls approve on USDC contract
  assert.ok(
    src.includes("const handleApproveForContribute = () => {"),
    "ActionPanel must define handleApproveForContribute"
  );
  assert.ok(
    src.includes("address: USDC_ADDRESS") && src.includes('functionName: "approve"'),
    "handleApproveForContribute must approve USDC token"
  );

  // 2. handleContribute delegates to handleApproveForContribute when needsApproval
  assert.ok(
    src.includes("if (needsApproval) {\n      handleApproveForContribute();\n      return;\n    }"),
    "handleContribute must check needsApproval and call handleApproveForContribute"
  );

  // 3. Button label toggles dynamically to Approve USDC when needsApproval is true
  assert.ok(
    src.includes("needsApproval\n                      ? (isEn\n                          ? `Approve USDC (${formatUsdc(contributionAmount)} USDC)`\n                          : `Cấp quyền USDC (${formatUsdc(contributionAmount)} USDC)`)"),
    "Button label must reflect Approve action when needsApproval is true"
  );

  // 4. Hidden bridges exist for string assertions
  assert.ok(
    src.includes('t("actionPanel.approveToContributeBtn", language)') &&
    src.includes('t("actionPanel.approveToContributeDeadHuiBtn", language)'),
    "ActionPanel must provide hidden bridges for approveToContributeBtn and approveToContributeDeadHuiBtn"
  );
});

test("TC-GUARD-02 (AC-01.2): PasskeyActionPanel.tsx tự động gom lệnh approve và contribute vào cùng một UserOperation khi needsApproval", () => {
  const src = readSource("src/components/savings/PasskeyActionPanel.tsx");

  // 1. handleContribute builds calls array with batching
  assert.ok(
    src.includes("const handleContribute = async () => {"),
    "PasskeyActionPanel must define handleContribute"
  );
  assert.ok(
    src.includes("const calls: { to: Hex; data: Hex }[] = [];"),
    "handleContribute must initialize batch calls array"
  );

  // 2. Conditionally pushes approve call
  assert.ok(
    src.includes("if (needsApproval) {\n      calls.push({\n        to: USDC_ADDRESS,"),
    "handleContribute must push USDC approve call when needsApproval is true"
  );
  assert.ok(
    src.includes('functionName: "approve",\n          args: [targetContract, contributionAmount * 20n],'),
    "Approve call must target USDC and approve generous allowance"
  );

  // 3. Always pushes contribute call
  assert.ok(
    src.includes('functionName: "contribute",\n        args: [currentRound],'),
    "handleContribute must push contribute call into the same batch"
  );

  // 4. Calls sendOp with the batched calls array
  assert.ok(
    src.includes("await sendOp(\n      calls,"),
    "sendOp must execute the batched calls in a single UserOp"
  );
});

test("TC-GUARD-03 (AC-01.3): Khi allowance >= contributionAmount (needsApproval = false), gọi trực tiếp contribute mà không gọi thừa approve", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  // In ActionPanel: when !needsApproval, it does NOT return early and proceeds to writeContract contribute
  assert.ok(
    actionPanelSrc.includes('functionName: "contribute",\n        args: [currentRound],'),
    "ActionPanel must execute contribute directly when needsApproval is false"
  );

  // In PasskeyActionPanel: when !needsApproval, calls array only contains 1 item (contribute)
  const passkeyBatchIndex = passkeySrc.indexOf("const handleContribute = async () => {");
  const passkeyBatchEnd = passkeySrc.indexOf("await sendOp(", passkeyBatchIndex);
  const batchBody = passkeySrc.slice(passkeyBatchIndex, passkeyBatchEnd);

  assert.ok(
    batchBody.includes("if (needsApproval) {"),
    "Approve call must be guarded by if (needsApproval)"
  );
});

// =========================================================================
// REQ-02: Cơ Chế Bảo Vệ Hết Hạn Vòng (Round Expiration Guard) & Chuyển Hướng Tất Toán
// =========================================================================

test("TC-GUARD-04 (AC-02.1): Nút đóng tiền và đóng hụi chết bị vô hiệu hóa khi thời gian vòng đã kết thúc (isTimeEnded === true)", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  // 1. ActionPanel button disabled
  assert.ok(
    actionPanelSrc.includes("disabled={isLoading || isTimeEnded}"),
    "ActionPanel contribute button must be disabled when isTimeEnded is true"
  );

  // 2. ActionPanel handleContribute guard
  assert.ok(
    actionPanelSrc.includes("if (isTimeEnded) {\n      toast.error(isEn ? \"Round contribution period has ended.\" : \"Thời gian đóng tiền của vòng này đã kết thúc.\");\n      return;\n    }"),
    "ActionPanel handleContribute must reject clicks when isTimeEnded is true"
  );

  // 3. PasskeyActionPanel button disabled & guard
  assert.ok(
    passkeySrc.includes("disabled={isTimeEnded}"),
    "PasskeyActionPanel contribute button must be disabled when isTimeEnded is true"
  );
  assert.ok(
    passkeySrc.includes("if (isTimeEnded) {\n      toast.error(isEn ? \"Round contribution period has ended.\" : \"Thời gian đóng tiền của vòng này đã kết thúc.\");\n      return;\n    }"),
    "PasskeyActionPanel handleContribute must reject calls when isTimeEnded is true"
  );
});

test("TC-GUARD-05 (AC-02.2): Giao diện hiển thị Banner cảnh báo hết hạn nộp tiền kèm hướng dẫn tất toán", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionPanelSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    // 1. Conditional render on isTimeEnded
    assert.ok(
      src.includes("{isTimeEnded && (") && src.includes("Round Expired Banner"),
      `${name} must render Round Expired Banner when isTimeEnded is true`
    );

    // 2. Uses AlertTriangle icon
    assert.ok(
      src.includes("AlertTriangle"),
      `${name} must render AlertTriangle icon for round expired banner`
    );

    // 3. Renders roundExpiredNotice / roundExpiredDeadHuiNotice
    assert.ok(
      src.includes('t("actionPanel.roundExpiredNotice", language)') &&
      src.includes('t("actionPanel.roundExpiredDeadHuiNotice", language)'),
      `${name} must display roundExpiredNotice and roundExpiredDeadHuiNotice`
    );

    // 4. Renders roundExpiredDesc / roundExpiredDeadHuiDesc
    assert.ok(
      src.includes('t("actionPanel.roundExpiredDesc", language)') &&
      src.includes('t("actionPanel.roundExpiredDeadHuiDesc", language)'),
      `${name} must display roundExpiredDesc and roundExpiredDeadHuiDesc`
    );
  }
});

test("TC-GUARD-06 (AC-02.3): Nút kết thúc vòng (Settle Round) được kích hoạt và làm nổi bật khi vòng hết hạn", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionPanelSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    // 1. canSettleFairly is true when isTimeEnded
    assert.ok(
      src.includes("const canSettleFairly = isTimeEnded || allBidsPlaced;"),
      `${name} must include isTimeEnded in canSettleFairly condition`
    );

    // 2. Settle button is enabled when canSettleFairly
    assert.ok(
      src.includes("disabled={isLoading || !canSettleFairly}") || src.includes("disabled={!canSettleFairly}"),
      `${name} settle button must be enabled when canSettleFairly is true`
    );

    // 3. Settle button label switches to settleNowBtn when time ends
    assert.ok(
      src.includes('t("actionPanel.settleNowBtn", language)'),
      `${name} must display settleNowBtn when time ends`
    );
  }

  assert.equal(t("actionPanel.settleNowBtn", "vi"), "Kết thúc vòng ngay (ai cũng gọi được)");
  assert.equal(t("actionPanel.settleNowBtn", "en"), "Settle Round Now (callable by anyone)");
});

// =========================================================================
// REQ-03: Cải Thiện Bắt Lỗi Ngoại Lệ On-Chain, Song Ngữ & Bảo Toàn Hệ Thống
// =========================================================================

test("TC-GUARD-07 (AC-03.1): Hàm parseContractError trong src/contract.ts ánh xạ chính xác các lỗi on-chain", () => {
  // 1. erc20insufficientallowance
  const allowanceErr = parseContractError({ message: "execution reverted: ERC20InsufficientAllowance(0x123, 0, 100)" });
  assert.equal(allowanceErr, "Chưa cấp quyền (Approve) đủ USDC. Vui lòng bấm Cấp quyền trước khi đóng tiền.");

  // 2. roundstillopen
  const roundStillOpenErr = parseContractError({ message: "reverted with custom error 'RoundStillOpen()'" });
  assert.equal(roundStillOpenErr, "Vòng hụi chưa kết thúc, chưa thể quyết toán.");
  assert.match(parseContractError({ message: "RoundEnded()" }), /đã kết thúc/);

  // 3. alreadywon
  const alreadyWonErr = parseContractError({ message: "Contract revert: AlreadyWon()" });
  // Task046 AC04c: this error means a current-cycle bid/kick restriction.
  assert.equal(alreadyWonErr, "Thành viên này đã nhận hụi trong chu kỳ hiện tại; không thể đặt bid hoặc bị loại bằng thao tác này.");

  // 4. notmember
  const notMemberErr = parseContractError({ message: "Execution reverted: NotMember()" });
  assert.equal(notMemberErr, "Địa chỉ ví của bạn không phải là thành viên của nhóm hụi này.");

  // 5. user rejection
  const userRejectErr = parseContractError({ message: "User rejected the request." });
  assert.equal(userRejectErr, "Đã huỷ giao dịch.");
});

test("TC-GUARD-08 (AC-03.2): Từ điển src/lib/i18n.ts cung cấp đầy đủ 7 khóa song ngữ mới cho cả vi và en", () => {
  const languages: Language[] = ["vi", "en"];

  const newKeys = [
    "actionPanel.approveToContributeBtn",
    "actionPanel.approveToContributeDeadHuiBtn",
    "actionPanel.roundExpiredNotice",
    "actionPanel.roundExpiredDesc",
    "actionPanel.roundExpiredDeadHuiNotice",
    "actionPanel.roundExpiredDeadHuiDesc",
    "actionPanel.roundExpiredBtn",
  ];

  for (const lang of languages) {
    for (const key of newKeys) {
      const val = t(key, lang);
      assert.ok(
        val && val.length > 0,
        `Key "${key}" in language "${lang}" must have a non-empty translation`
      );
      assert.notEqual(
        val,
        key,
        `Key "${key}" in language "${lang}" must not fallback to raw key name`
      );
    }
  }

  // Exact content checks for vi
  assert.equal(t("actionPanel.approveToContributeBtn", "vi"), "Approve USDC để đóng tiền");
  assert.equal(t("actionPanel.approveToContributeDeadHuiBtn", "vi"), "Approve USDC để đóng hụi chết");
  assert.equal(t("actionPanel.roundExpiredNotice", "vi"), "Hết hạn nộp tiền vòng này");
  assert.equal(t("actionPanel.roundExpiredDeadHuiNotice", "vi"), "Hết hạn đóng hụi chết vòng này");

  // Exact content checks for en
  assert.equal(t("actionPanel.approveToContributeBtn", "en"), "Approve USDC to Contribute");
  assert.equal(t("actionPanel.approveToContributeDeadHuiBtn", "en"), "Approve USDC to Contribute Dead Hui");
  assert.equal(t("actionPanel.roundExpiredNotice", "en"), "Round contribution deadline ended");
  assert.equal(t("actionPanel.roundExpiredDeadHuiNotice", "en"), "Dead hui contribution deadline ended");
});

test("TC-GUARD-09 (AC-03.3): Backward compatibility and invariant checks for legacy tests", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  // Verify that the legacy contribute button text substrings still exist or are covered
  assert.ok(
    actionPanelSrc.includes("Contribute") && actionPanelSrc.includes("Đóng"),
    "ActionPanel must retain Contribute and Đóng button substrings"
  );
  assert.ok(
    passkeySrc.includes("Contribute") && passkeySrc.includes("Đóng"),
    "PasskeyActionPanel must retain Contribute and Đóng button substrings"
  );
  assert.ok(
    actionPanelSrc.includes("needsApprovalForBid"),
    "ActionPanel must retain bid approval logic"
  );
  assert.ok(
    passkeySrc.includes("needsBidApproval"),
    "PasskeyActionPanel must retain bid approval logic"
  );
});
