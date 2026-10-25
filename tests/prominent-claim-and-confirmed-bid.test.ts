import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { t, translations, type Language } from "../src/lib/i18n.ts";
import { formatUsdc } from "../src/contract.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Tích Hợp Thẻ Rút Tiền Thưởng Nổi Bật Ngay Trong ActionPanel
// ============================================================================

test("TC-CLAIM-01 (AC-01.1): Khi claimable > 0n, ActionPanel và PasskeyActionPanel hiển thị Thẻ Rút Tiền Thưởng Nổi Bật với số tiền formatUsdc và nút CTA lớn", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionPanelSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    // 1. Interface props khai báo claimable
    assert.ok(src.includes("claimable?: bigint;"), `${name} props must define claimable?: bigint`);

    // 2. Render thẻ rút tiền khi claimable > 0n ở vị trí ưu tiên cao
    assert.ok(
      src.includes("claimable !== undefined && claimable > 0n"),
      `${name} must conditionally render prominent claim card when claimable > 0n`
    );

    // 3. Hiển thị số tiền formatUsdc(claimable) kèm đơn vị USDC
    assert.ok(
      src.includes("{formatUsdc(claimable)}") && src.includes("USDC"),
      `${name} must render formatted claimable USDC amount`
    );

    // 4. Tiêu đề và mô tả song ngữ thẻ rút tiền
    assert.ok(
      src.includes('t("actionPanel.claimReadyTitle", language)'),
      `${name} must render claimReadyTitle`
    );
    assert.ok(
      src.includes('t("actionPanel.claimReadyDesc", language)'),
      `${name} must render claimReadyDesc`
    );

    // 5. Nút CTA lớn hiển thị nhãn claimNowBtn với số tiền thay thế
    assert.ok(
      src.includes('t("actionPanel.claimNowBtn", language).replace("{amount}", formatUsdc(claimable))'),
      `${name} must render claimNowBtn with interpolated formatted amount`
    );
  }
});

test("TC-CLAIM-02 (AC-01.2): Nút rút tiền trong ActionPanel gọi trực tiếp hàm rút tiền và kích hoạt trạng thái loading", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  // 1. ActionPanel: Nút gọi onClaimPayout và bị vô hiệu hóa khi isClaiming = true
  assert.ok(
    actionPanelSrc.includes("onClick={onClaimPayout}"),
    "ActionPanel claim button must attach onClick={onClaimPayout}"
  );
  assert.ok(
    actionPanelSrc.includes("disabled={isClaiming}"),
    "ActionPanel claim button must be disabled when isClaiming is true"
  );
  assert.ok(
    actionPanelSrc.includes('t("actionPanel.claimingPayout", language)'),
    "ActionPanel claim button must show claimingPayout text when loading"
  );

  // 2. PasskeyActionPanel: Nút gọi handleClaimPayoutPasskey và bị vô hiệu hóa khi loading
  assert.ok(
    passkeySrc.includes("onClick={handleClaimPayoutPasskey}"),
    "PasskeyActionPanel claim button must attach onClick={handleClaimPayoutPasskey}"
  );
  assert.ok(
    passkeySrc.includes("disabled={isClaiming || isLoading}"),
    "PasskeyActionPanel claim button must be disabled during claiming or loading"
  );
  assert.ok(
    passkeySrc.includes("const handleClaimPayoutPasskey = async () => {"),
    "PasskeyActionPanel must define handleClaimPayoutPasskey"
  );
  assert.ok(
    passkeySrc.includes('functionName: "claimPayout"'),
    "PasskeyActionPanel handleClaimPayoutPasskey must encode claimPayout function call"
  );
});

test("TC-CLAIM-03 (AC-01.3, AC-01.4): Không render Thẻ Rút tiền khi claimable === 0n hoặc claimable === undefined", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionPanelSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    // Điều kiện nghiêm ngặt: chỉ khi claimable !== undefined && claimable > 0n
    // Khi claimable = 0n hoặc undefined, biểu thức điều kiện trả về false, card hoàn toàn không render
    const pattern = /\{\s*claimable\s*!==\s*undefined\s*&&\s*claimable\s*>\s*0n\s*&&/m;
    assert.ok(pattern.test(src), `${name} must strictly guard claim card with claimable > 0n`);
  }
});

// ============================================================================
// REQ-02: Minh Bạch Trạng Thái Đặt Bid & Huy Hiệu Người Dẫn Đầu
// ============================================================================

test("TC-BID-01 (AC-02.1): Khi userBid > 0n, ẩn form nhập trống mặc định, render Thẻ Đã Đặt Bid hiển thị mức giá và huy hiệu xác nhận", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionPanelSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    // 1. Phân nhánh rõ ràng theo userBid > 0n
    assert.ok(
      src.includes("userBid !== undefined && userBid > 0n ?"),
      `${name} must check userBid > 0n to switch to Confirmed Bid Card`
    );

    // 2. Hiển thị mức bid của người dùng
    assert.ok(
      src.includes('t("actionPanel.confirmedBidLabel", language)'),
      `${name} must render confirmedBidLabel`
    );
    assert.ok(
      src.includes("{formatUsdc(userBid)} USDC"),
      `${name} must display formatted userBid USDC amount`
    );

    // 3. Huy hiệu xác nhận đã đặt bid
    assert.ok(
      src.includes('t("actionPanel.confirmedBidBadge", language)'),
      `${name} must render confirmedBidBadge`
    );
    assert.ok(
      src.includes("CheckCircle2"),
      `${name} must include CheckCircle2 icon for confirmed bid badge`
    );
  }
});

test("TC-BID-02 (AC-02.2): Khi userBid >= highestBid && highestBid > 0n, hiển thị huy hiệu cúp vàng 🏆 Đang dẫn đầu Pot!", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionPanelSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    // 1. Kiểm tra điều kiện người dẫn đầu: userBid >= highestBid
    assert.ok(
      src.includes("userBid >= highestBid"),
      `${name} must compare userBid >= highestBid`
    );

    // 2. Hiển thị huy hiệu cúp vàng kèm nhãn leadingPotBadge
    assert.ok(
      src.includes('t("actionPanel.leadingPotBadge", language)'),
      `${name} must render leadingPotBadge when userBid >= highestBid`
    );
    assert.ok(
      src.includes("Trophy"),
      `${name} must include Trophy icon for leading bidder badge`
    );
  }
});

test("TC-BID-03 (AC-02.3): Khi userBid < highestBid, hiển thị huy hiệu cảnh báo bị vượt giá với mức cao nhất hiện tại", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionPanelSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    // 1. Phân nhánh else khi userBid < highestBid
    assert.ok(
      src.includes('t("actionPanel.outbidBadge", language).replace("{amount}", formatUsdc(highestBid))'),
      `${name} must render outbidBadge interpolated with highestBid amount`
    );

    // 2. Icon cảnh báo AlertCircle
    assert.ok(
      src.includes("AlertCircle"),
      `${name} must include AlertCircle icon for outbid badge`
    );
  }
});

// ============================================================================
// REQ-03: Quy Trình Gập/Mở Nâng Mức Giá (Raise Bid Flow) & Ràng Buộc Hợp Lệ
// ============================================================================

test("TC-RAISE-01 (AC-03.1): Mặc định gập khung nâng bid, hiển thị nút toggle + Nâng mức giá (Nâng bid)", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionPanelSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    // 1. Khai báo state isRaiseExpanded mặc định false
    assert.ok(
      src.includes("const [isRaiseExpanded, setIsRaiseExpanded] = useState(false);"),
      `${name} must declare isRaiseExpanded state initialized to false`
    );

    // 2. Nút toggle chuyển trạng thái
    assert.ok(
      src.includes("onClick={() => setIsRaiseExpanded(!isRaiseExpanded)}"),
      `${name} must toggle isRaiseExpanded on click`
    );

    // 3. Nhãn toggle song ngữ
    assert.ok(
      src.includes('t("actionPanel.raiseBidCollapse", language)') &&
      src.includes('t("actionPanel.raiseBidToggle", language)'),
      `${name} must switch between raiseBidCollapse and raiseBidToggle`
    );
  }
});

test("TC-RAISE-02 (AC-03.2): Mở rộng form nâng bid, kiểm tra ràng buộc newBid > userBid, vô hiệu hóa submit khi <= userBid", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionPanelSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    // 1. Hiển thị form mở rộng khi isRaiseExpanded là true
    assert.ok(
      src.includes("{isRaiseExpanded && ("),
      `${name} must conditionally render raise form when isRaiseExpanded is true`
    );

    // 2. Dòng giải thích cơ chế delta kèm số tiền chênh lệch
    assert.ok(
      src.includes('t("actionPanel.raiseBidDesc", language).replace("{userBid}", formatUsdc(userBid))'),
      `${name} must render raiseBidDesc interpolated with current userBid`
    );
    assert.ok(
      src.includes("formatUsdc(bidRaw - userBid)"),
      `${name} must calculate and display delta to pay (bidRaw - userBid)`
    );

    // 3. Placeholder gợi ý mức lớn hơn userBid
    assert.ok(
      src.includes("placeholder={`> ${formatUsdc(userBid)}`}"),
      `${name} must use placeholder showing > current userBid`
    );

    // 4. Vô hiệu hóa nút submit khi bidRaw <= userBid
    assert.ok(
      src.includes("bidRaw <= userBid"),
      `${name} must validate bidRaw <= userBid to disable submit button`
    );

    // 5. Nhãn nút động: cảnh báo khi <= userBid và hiển thị số tiền nâng khi hợp lệ
    assert.ok(
      src.includes('t("actionPanel.raiseBidMustBeHigher", language).replace("{userBid}", formatUsdc(userBid))'),
      `${name} must show raiseBidMustBeHigher when bidRaw <= userBid`
    );
    assert.ok(
      src.includes('t("actionPanel.raiseBidBtn", language).replace("{amount}", formatUsdc(bidRaw))'),
      `${name} must show raiseBidBtn with new amount when bidRaw > userBid`
    );
  }
});

test("TC-RAISE-03 (AC-03.3): App.tsx đồng bộ đầy đủ các props claimable, onClaimPayout, isClaiming, userBid, highestBid vào ActionPanel và PasskeyActionPanel", () => {
  const appSrc = readSource("src/App.tsx");

  // 1. Kiểm tra truyền props vào PasskeyActionPanel
  assert.ok(
    appSrc.includes("claimable={memberStatus.claimable ?? 0n}"),
    "App.tsx must pass memberStatus.claimable to ActionPanels"
  );
  assert.ok(
    appSrc.includes("onClaimPayout={handleClaimPayout}"),
    "App.tsx must pass handleClaimPayout to ActionPanels"
  );
  assert.ok(
    appSrc.includes("isClaiming={isClaiming || isClaimConfirming || isOwnerOpLoading}"),
    "App.tsx must pass isClaiming state to ActionPanels"
  );
  assert.ok(
    appSrc.includes("userBid={roundMemberStatus.bid ?? 0n}"),
    "App.tsx must pass roundMemberStatus.bid as userBid to ActionPanels"
  );
  assert.ok(
    appSrc.includes("highestBid={clubMembers.highestBid ?? 0n}"),
    "App.tsx must pass clubMembers.highestBid as highestBid to ActionPanels"
  );
});

// ============================================================================
// REQ-04: Từ Điển Song Ngữ & Zero Regression Invariant
// ============================================================================

test("TC-I18N-01: Bộ từ điển song ngữ i18n cung cấp đầy đủ 13 khóa mới cho tính năng nhận thưởng và trạng thái bid", () => {
  const i18nSrc = readSource("src/lib/i18n.ts");

  const requiredKeys = [
    "claimReadyTitle",
    "claimReadyDesc",
    "claimNowBtn",
    "claimingPayout",
    "confirmedBidLabel",
    "confirmedBidBadge",
    "leadingPotBadge",
    "outbidBadge",
    "raiseBidToggle",
    "raiseBidCollapse",
    "raiseBidDesc",
    "raiseBidBtn",
    "raiseBidMustBeHigher",
  ];

  for (const key of requiredKeys) {
    // Kiểm tra type interface
    assert.ok(i18nSrc.includes(`${key}: string;`), `Translations interface must declare ${key}`);

    // Kiểm tra bản dịch tiếng Việt (vi)
    const viVal = t(`actionPanel.${key}`, "vi");
    assert.ok(viVal && viVal.length > 0, `Vietnamese translation for actionPanel.${key} must not be empty`);

    // Kiểm tra bản dịch tiếng Anh (en)
    const enVal = t(`actionPanel.${key}`, "en");
    assert.ok(enVal && enVal.length > 0, `English translation for actionPanel.${key} must not be empty`);
  }

  // Kiểm tra cụ thể một số chuỗi trọng tâm
  assert.equal(t("actionPanel.leadingPotBadge", "vi"), "🏆 Đang dẫn đầu Pot!");
  assert.equal(t("actionPanel.leadingPotBadge", "en"), "🏆 Leading the Pot!");
  assert.equal(t("actionPanel.confirmedBidBadge", "vi"), "✓ Đã đặt giá");
  assert.equal(t("actionPanel.confirmedBidBadge", "en"), "✓ Bid Placed");
  assert.equal(t("actionPanel.raiseBidToggle", "vi"), "+ Nâng mức giá (Nâng bid)");
  assert.equal(t("actionPanel.raiseBidToggle", "en"), "+ Raise Bid to higher amount");
});

test("TC-REGRESSION-01 (AC-03.4): Toàn bộ cấu trúc hệ thống và các hàm cốt lõi được bảo toàn (Zero Regression)", () => {
  // 1. Kiểm tra formatUsdc hoạt động chuẩn xác với 6 decimals
  assert.equal(formatUsdc(2000000n), "2.00");
  assert.equal(formatUsdc(500000n), "0.50");
  assert.equal(formatUsdc(800000n), "0.80");
  assert.equal(formatUsdc(0n), "0.00");

  // 2. Kiểm tra MemberStatus.tsx vẫn duy trì claimable button cho trường hợp người dùng xem ở footer
  const memberStatusSrc = readSource("src/components/savings/MemberStatus.tsx");
  assert.ok(
    memberStatusSrc.includes("onClaimPayout"),
    "MemberStatus must retain onClaimPayout for footer view compatibility"
  );
});
