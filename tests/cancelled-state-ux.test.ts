import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { translations, t, type Language } from "../src/lib/i18n.ts";
import { GROUP_STATE } from "../src/contract.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

/**
 * Extracts the inner content of `{state === GROUP_STATE.CANCELLED && ( ... )}`
 * from a component's source code.
 */
function extractCancelledBlock(source: string): string {
  const marker = "state === GROUP_STATE.CANCELLED && (";
  const startIdx = source.indexOf(marker);
  if (startIdx === -1) return "";

  const afterMarker = source.slice(startIdx + marker.length);
  // Find matching closing parenthesis for the JSX conditional block
  let depth = 1;
  let endIdx = 0;
  for (let i = 0; i < afterMarker.length; i++) {
    if (afterMarker[i] === "(") depth++;
    else if (afterMarker[i] === ")") {
      depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }
  return afterMarker.slice(0, endIdx);
}

// ============================================================================
// REQ-01: Tối ưu Thông báo trong Thẻ MemberStatus khi Nhóm đã Hủy
// ============================================================================

test("TC-CANCEL-01 (AC-01.1): MemberStatus khi state === GROUP_STATE.CANCELLED và isMember === false: KHÔNG render 'Join club to view your status', hiển thị thông báo giải tán an toàn", () => {
  const source = readSource("src/components/savings/MemberStatus.tsx");

  // Verify cancelled check exists
  const cancelledCheckIndex = source.indexOf("if (state === GROUP_STATE.CANCELLED)");
  const notMemberCheckIndex = source.indexOf("if (!isMember)");

  assert.ok(
    cancelledCheckIndex !== -1,
    "MemberStatus must check for state === GROUP_STATE.CANCELLED"
  );
  assert.ok(
    notMemberCheckIndex !== -1,
    "MemberStatus must contain notMember check"
  );

  // Critical architectural requirement: CANCELLED check MUST precede notMember check
  assert.ok(
    cancelledCheckIndex < notMemberCheckIndex,
    "state === GROUP_STATE.CANCELLED check must precede if (!isMember) so non-members never see the misleading 'Join club' prompt on cancelled clubs"
  );

  // In cancelled block, verify proper title & hint rendering
  const cancelledBlock = source.slice(
    cancelledCheckIndex,
    notMemberCheckIndex
  );
  assert.ok(
    cancelledBlock.includes("memberStatus.cancelledTitle"),
    "Cancelled block must render memberStatus.cancelledTitle"
  );
  assert.ok(
    cancelledBlock.includes("memberStatus.cancelledHint"),
    "Cancelled block must render memberStatus.cancelledHint"
  );
  assert.ok(
    !cancelledBlock.includes("notMemberHint"),
    "Cancelled block must never reference notMemberHint"
  );
});

test("TC-CANCEL-02 (AC-01.2): MemberStatus khi state === GROUP_STATE.CANCELLED và isMember === true: hiển thị tiêu đề và nội dung giải tán an toàn, không có cảnh báo nợ ('Chưa đóng')", () => {
  const source = readSource("src/components/savings/MemberStatus.tsx");

  // Since CANCELLED check returns early before member content:
  const cancelledCheckIndex = source.indexOf("if (state === GROUP_STATE.CANCELLED)");
  const afterCancelledReturn = source.indexOf("return (", cancelledCheckIndex);
  const closingBraceIndex = source.indexOf("}", afterCancelledReturn);

  const earlyReturnCode = source.slice(cancelledCheckIndex, closingBraceIndex + 1);
  assert.ok(
    earlyReturnCode.includes("return ("),
    "MemberStatus must early-return upon GROUP_STATE.CANCELLED"
  );

  // Verify no debt / payment warnings inside the cancelled return branch
  assert.ok(
    !earlyReturnCode.includes("Chưa đóng"),
    "Cancelled view must not contain 'Chưa đóng' warning"
  );
  assert.ok(
    !earlyReturnCode.includes("notContributedBadge"),
    "Cancelled view must not render notContributedBadge"
  );
  assert.ok(
    !earlyReturnCode.includes("claimPayoutBtn"),
    "Cancelled view must not render claimPayoutBtn"
  );
});

test("TC-CANCEL-03 (AC-01.3): MemberStatus hỗ trợ song ngữ vi/en chuẩn theo prop language", () => {
  const source = readSource("src/components/savings/MemberStatus.tsx");

  // Check bilingual ternary or translation helper usage
  assert.ok(
    source.includes("isEn ? t(\"memberStatus.cancelledTitle\", language) : \"Nhóm hụi đã bị huỷ\"") ||
    source.includes("t(\"memberStatus.cancelledTitle\", language)"),
    "MemberStatus must support both Vietnamese and English for cancelled title"
  );
  assert.ok(
    source.includes("isEn ? t(\"memberStatus.cancelledHint\", language) : \"Nhóm đã huỷ. Hãy nhận khoản hoàn tiền và rút ký quỹ đủ điều kiện trong bảng thao tác.\"") ||
    source.includes("t(\"memberStatus.cancelledHint\", language)"),
    "MemberStatus must support both Vietnamese and English for cancelled hint"
  );

  // Exact i18n values
  assert.equal(translations.vi.memberStatus.cancelledTitle, "Nhóm hụi đã bị huỷ");
  assert.equal(
    translations.vi.memberStatus.cancelledHint,
    "Nhóm đã huỷ. Hãy nhận khoản hoàn tiền và rút ký quỹ đủ điều kiện trong bảng thao tác."
  );
  assert.equal(translations.en.memberStatus.cancelledTitle, "Savings Club Cancelled");
  assert.equal(
    translations.en.memberStatus.cancelledHint,
    "The club is cancelled. Claim your refund and eligible collateral in the action panel."
  );
});

// ============================================================================
// REQ-02: Thẻ Trạng thái Chuyên nghiệp & An tâm trong ActionPanel & PasskeyActionPanel
// ============================================================================

test("TC-CANCEL-04 (AC-02.1): ActionPanel hiển thị thẻ Cancelled khi state === GROUP_STATE.CANCELLED (icon XCircle, tiêu đề, thông điệp an tâm tài sản, lời nhắc điều hướng)", () => {
  const source = readSource("src/components/savings/ActionPanel.tsx");

  assert.ok(
    source.includes("state === GROUP_STATE.CANCELLED && ("),
    "ActionPanel must contain explicit render branch for state === GROUP_STATE.CANCELLED"
  );

  const block = extractCancelledBlock(source);
  assert.ok(block.length > 0, "Cancelled block in ActionPanel must not be empty");

  // 1. Icon vector XCircle 28px in red frame
  assert.ok(
    block.includes("<XCircle size={28} />") || block.includes("XCircle"),
    "Cancelled block must render XCircle icon"
  );
  assert.ok(
    block.includes("bg-red-50") && block.includes("text-red-600"),
    "Icon container must feature red/rose theme"
  );

  // 2. Title
  assert.ok(
    block.includes("actionPanel.cancelledTitle"),
    "Cancelled block must render actionPanel.cancelledTitle"
  );

  // 3. Asset safety reassurance
  assert.ok(
    block.includes("actionPanel.cancelledDesc"),
    "Cancelled block must render actionPanel.cancelledDesc"
  );

  // 4. Navigation hint
  assert.ok(
    block.includes("actionPanel.cancelledNavHint"),
    "Cancelled block must render actionPanel.cancelledNavHint"
  );
});

test("TC-CANCEL-05 (AC-02.2): PasskeyActionPanel hiển thị thẻ Cancelled đồng bộ 100% với ActionPanel khi state === GROUP_STATE.CANCELLED", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  assert.ok(
    passkeySrc.includes("state === GROUP_STATE.CANCELLED && ("),
    "PasskeyActionPanel must contain explicit render branch for state === GROUP_STATE.CANCELLED"
  );

  const apBlock = extractCancelledBlock(actionPanelSrc);
  const pkBlock = extractCancelledBlock(passkeySrc);

  assert.ok(pkBlock.length > 0, "Cancelled block in PasskeyActionPanel must not be empty");

  // Both blocks must render identical core tokens
  assert.ok(pkBlock.includes("XCircle"), "PasskeyActionPanel must render XCircle icon");
  assert.ok(pkBlock.includes("actionPanel.cancelledTitle"), "PasskeyActionPanel must render cancelledTitle");
  assert.ok(pkBlock.includes("actionPanel.cancelledDesc"), "PasskeyActionPanel must render cancelledDesc");
  assert.ok(pkBlock.includes("actionPanel.cancelledNavHint"), "PasskeyActionPanel must render cancelledNavHint");

  // Normalize whitespace to verify structural parity
  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
  assert.equal(
    normalize(pkBlock),
    normalize(apBlock),
    "PasskeyActionPanel cancelled block must be 100% structurally identical to ActionPanel"
  );
});

test("TC-CANCEL-06 (Task-044 AC-02b): Cancellation wording explains pull refunds and preserves earlier payouts", () => {
  const viDesc = translations.vi.actionPanel.cancelledDesc;
  const enDesc = translations.en.actionPanel.cancelledDesc;
  assert.match(viDesc, /vòng chưa quyết toán/);
  assert.match(viDesc, /Hãy rút tiền và ký quỹ đủ điều kiện/);
  assert.match(viDesc, /đã trả trước đó giữ nguyên/);
  assert.match(enDesc, /unsettled round/);
  assert.match(enDesc, /Claim your payout and eligible collateral/);
  assert.match(enDesc, /earlier payouts remain final/);
  assert.doesNotMatch(viDesc, /không có tài sản nào bị giam giữ/);
  assert.doesNotMatch(enDesc, /no assets are locked|registration phase/);
});

// ============================================================================
// REQ-03: Tuân thủ Bất biến Cấm Nút Bấm Dư Thừa & Đồng bộ i18n
// ============================================================================

test("TC-CANCEL-07 (AC-03.1): BẤT BIẾN CẤM NÚT DƯ THỪA - Thẻ Cancelled trong cả ActionPanel và PasskeyActionPanel KHÔNG chứa bất kỳ thẻ <button> nào (buttonCount === 0)", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  const apBlock = extractCancelledBlock(actionPanelSrc);
  const pkBlock = extractCancelledBlock(passkeySrc);

  // Count buttons in ActionPanel cancelled block
  const apButtons = apBlock.match(/<button[\s>]/g) ?? [];
  assert.equal(
    apButtons.length,
    0,
    `ActionPanel cancelled block must contain ZERO <button> elements. Found: ${apButtons.length}`
  );

  // Count buttons in PasskeyActionPanel cancelled block
  const pkButtons = pkBlock.match(/<button[\s>]/g) ?? [];
  assert.equal(
    pkButtons.length,
    0,
    `PasskeyActionPanel cancelled block must contain ZERO <button> elements. Found: ${pkButtons.length}`
  );
});

test("TC-CANCEL-08 (AC-03.2): Từ điển src/lib/i18n.ts có đầy đủ 5 keys song ngữ cho cả vi và en", () => {
  const languages: Language[] = ["vi", "en"];

  for (const lang of languages) {
    const msTitle = t("memberStatus.cancelledTitle", lang);
    const msHint = t("memberStatus.cancelledHint", lang);
    const apTitle = t("actionPanel.cancelledTitle", lang);
    const apDesc = t("actionPanel.cancelledDesc", lang);
    const apNavHint = t("actionPanel.cancelledNavHint", lang);

    assert.ok(msTitle && msTitle.length > 0, `memberStatus.cancelledTitle for '${lang}' must not be empty`);
    assert.ok(msHint && msHint.length > 0, `memberStatus.cancelledHint for '${lang}' must not be empty`);
    assert.ok(apTitle && apTitle.length > 0, `actionPanel.cancelledTitle for '${lang}' must not be empty`);
    assert.ok(apDesc && apDesc.length > 0, `actionPanel.cancelledDesc for '${lang}' must not be empty`);
    assert.ok(apNavHint && apNavHint.length > 0, `actionPanel.cancelledNavHint for '${lang}' must not be empty`);
  }

  // Exact parity & expected content
  assert.equal(translations.vi.memberStatus.cancelledTitle, "Nhóm hụi đã bị huỷ");
  assert.equal(
    translations.vi.memberStatus.cancelledHint,
    "Nhóm đã huỷ. Hãy nhận khoản hoàn tiền và rút ký quỹ đủ điều kiện trong bảng thao tác."
  );
  assert.equal(translations.vi.actionPanel.cancelledTitle, "Nhóm hụi đã bị huỷ");
  assert.equal(
    translations.vi.actionPanel.cancelledDesc,
    "Nhóm đã huỷ theo biểu quyết. Tiền góp và bid của vòng chưa quyết toán được cộng vào khoản có thể nhận. Hãy rút tiền và ký quỹ đủ điều kiện; các khoản đã trả trước đó giữ nguyên."
  );
  assert.equal(
    translations.vi.actionPanel.cancelledNavHint,
    "Bạn có thể sử dụng các nút điều hướng phía trên (Danh sách nhóm hoặc Tạo nhóm mới) để khám phá hoặc khởi tạo nhóm hụi khác."
  );

  assert.equal(translations.en.memberStatus.cancelledTitle, "Savings Club Cancelled");
  assert.equal(
    translations.en.memberStatus.cancelledHint,
    "The club is cancelled. Claim your refund and eligible collateral in the action panel."
  );
  assert.equal(translations.en.actionPanel.cancelledTitle, "Savings Club Cancelled");
  assert.equal(
    translations.en.actionPanel.cancelledDesc,
    "The club was cancelled by vote. Contributions and bids from the unsettled round were credited for withdrawal. Claim your payout and eligible collateral; earlier payouts remain final."
  );
  assert.equal(
    translations.en.actionPanel.cancelledNavHint,
    "You can use the navigation buttons above (Club Directory or Create Club) to explore or create another savings club."
  );
});

test("TC-CANCEL-09: GROUP_STATE enum có giá trị CANCELLED === 3 chuẩn theo smart contract", () => {
  assert.equal(
    GROUP_STATE.CANCELLED,
    3,
    "GROUP_STATE.CANCELLED must equal 3 as defined in RotatingSavings.sol"
  );
  assert.equal(GROUP_STATE.OPEN, 0);
  assert.equal(GROUP_STATE.ACTIVE, 1);
  assert.equal(GROUP_STATE.COMPLETED, 2);
});
