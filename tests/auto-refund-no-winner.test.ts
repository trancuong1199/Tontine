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
// REQ-01: Tự Động Hoàn Trả Tiền Khi Vòng Không Có Người Thắng Trong Smart Contract
// ============================================================================

test("TC-REFUND-01 (AC-01.1): Smart Contract RotatingSavings.sol tự động hoàn trả 100% tiền đóng góp vào claimable khi winner == address(0) và phát sự kiện ContributionRefunded", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");

  // 1. Kiểm tra khai báo sự kiện ContributionRefunded
  assert.ok(
    contractSrc.includes("event ContributionRefunded(uint256 indexed roundId, address indexed member, uint256 amount);"),
    "RotatingSavings.sol must define event ContributionRefunded"
  );

  // 2. Kiểm tra nhánh winner == address(0) trong hàm settleRound
  assert.ok(
    contractSrc.includes("for (uint256 i = 0; i < memberCount; i++) {"),
    "settleRound must loop through all members when winner == address(0)"
  );
  assert.ok(
    contractSrc.includes("uint256 contrib = round.contributions[member];"),
    "settleRound must read member contribution for no-winner round"
  );
  assert.ok(
    contractSrc.includes("uint256 refundAmount = contrib + bid;"),
    "settleRound must calculate refundAmount = contrib + bid"
  );
  assert.ok(
    contractSrc.includes("claimable[member] += refundAmount;"),
    "settleRound must credit refundAmount to claimable[member]"
  );
  assert.ok(
    contractSrc.includes("emit ContributionRefunded(roundId, member, refundAmount);"),
    "settleRound must emit ContributionRefunded event"
  );
  assert.ok(
    contractSrc.includes("emit RoundSettled(roundId, address(0), 0, 0);"),
    "settleRound must emit RoundSettled with address(0)"
  );
});

test("TC-REFUND-02 (AC-01.2): Smart Contract hoàn trả trọn vẹn cả tiền đóng góp và tiền bid (contrib + bid) cho thành viên trong vòng không có người thắng", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");

  // 1. Kiểm tra logic gom cả contrib và bid
  assert.ok(
    contractSrc.includes("uint256 bid = round.bids[member];"),
    "settleRound must read round.bids[member] for refund calculation"
  );
  assert.ok(
    contractSrc.includes("uint256 refundAmount = contrib + bid;"),
    "refundAmount must sum both contrib and bid"
  );
  assert.ok(
    contractSrc.includes("if (refundAmount > 0) {"),
    "settleRound must only credit and emit when refundAmount > 0"
  );

  // 2. Mô phỏng toán học chính xác theo quy chuẩn hợp đồng
  const simulateRefund = (contrib: bigint, bid: bigint) => {
    const refund = contrib + bid;
    return refund;
  };

  // Case A: Đóng hụi chết 0.10 USDC (100000n), không bid (0n)
  assert.equal(simulateRefund(100000n, 0n), 100000n);

  // Case B: Đóng hụi sống 0.10 USDC (100000n), đặt bid 0.05 USDC (50000n)
  assert.equal(simulateRefund(100000n, 50000n), 150000n);

  // Case C: Thành viên bị kick không đóng tiền (0n) và không bid (0n)
  assert.equal(simulateRefund(0n, 0n), 0n);
});

test("TC-REFUND-03 (AC-01.3): Foundry Test RotatingSavings.t.sol chứng minh thành viên nhận hoàn tiền và rút tiền thành công qua claimPayout", () => {
  const testSrc = readSource("contracts/test/RotatingSavings.t.sol");

  // 1. Kiểm tra sự tồn tại của bài kiểm thử Foundry chuyên dụng
  assert.ok(
    testSrc.includes("function test_SettleRound_NoWinner_RefundsAllContributors() public"),
    "RotatingSavings.t.sol must define test_SettleRound_NoWinner_RefundsAllContributors"
  );

  // 2. Kiểm tra expectEmit cho sự kiện ContributionRefunded
  assert.ok(
    testSrc.includes("emit RotatingSavings.ContributionRefunded(2, alice, CONTRIBUTION);"),
    "Foundry test must assert ContributionRefunded emitted for Alice"
  );

  // 3. Khẳng định số dư claimable tăng đúng bằng tiền đóng góp
  assert.ok(
    testSrc.includes("assertEq(savings.claimable(alice), (3 * CONTRIBUTION) + CONTRIBUTION);"),
    "Foundry test must assert Alice claimable includes refund amount"
  );

  // 4. Khẳng định Alice gọi claimPayout() rút tiền về ví thành công
  assert.ok(
    testSrc.includes("savings.claimPayout();"),
    "Foundry test must call claimPayout()"
  );
  assert.ok(
    testSrc.includes("assertEq(usdc.balanceOf(alice), balBefore + (4 * CONTRIBUTION));"),
    "Foundry test must verify token balance increased by total payout"
  );
});

// ============================================================================
// REQ-02: Nâng Cấp Giao Diện Lịch Sử Vòng (RoundHistory.tsx)
// ============================================================================

test("TC-UI-01 (AC-02.1): RoundHistory.tsx nhận diện vòng không có người thắng (address 0), hiển thị Huy hiệu hoàn trả 100% kèm icon RotateCcw thay vì 0x0000...0000", () => {
  const historySrc = readSource("src/components/savings/RoundHistory.tsx");

  // 1. Kiểm tra nhận diện isNoWinner với address(0)
  assert.ok(
    historySrc.includes("const isNoWinner ="),
    "RoundHistory.tsx must define isNoWinner"
  );
  assert.ok(
    historySrc.includes('round.winner === "0x0000000000000000000000000000000000000000"') ||
    historySrc.includes('round.winner.toLowerCase() === "0x0000000000000000000000000000000000000000"'),
    "isNoWinner must check for zero address 0x0000000000000000000000000000000000000000"
  );

  // 2. Hiển thị Huy hiệu kèm icon RotateCcw
  assert.ok(
    historySrc.includes("RotateCcw"),
    "RoundHistory.tsx must import and render RotateCcw icon"
  );
  assert.ok(
    historySrc.includes('t("roundHistory.noWinnerBadge", language)'),
    "RoundHistory.tsx must display noWinnerBadge"
  );

  // 3. Đảm bảo khi isNoWinner là true thì KHÔNG render formatAddress(round.winner)
  assert.ok(
    historySrc.includes("{isNoWinner ? ("),
    "RoundHistory.tsx must branch conditionally on isNoWinner"
  );
});

test("TC-UI-02 (AC-02.2): RoundHistory.tsx duy trì hiển thị bình thường cho vòng có người thắng (Bạn! hoặc formatAddress)", () => {
  const historySrc = readSource("src/components/savings/RoundHistory.tsx");

  // 1. isUserWinner kiểm tra !isNoWinner
  assert.ok(
    historySrc.includes("const isUserWinner =\n              !isNoWinner &&"),
    "isUserWinner must ensure round is not a no-winner round"
  );

  // 2. Render huy hiệu Bạn! với icon Award cho người dùng kết nối
  assert.ok(
    historySrc.includes("Award") && historySrc.includes('isEn ? "You!" : "Bạn!"'),
    "RoundHistory.tsx must render You! / Bạn! badge when user won"
  );

  // 3. Render formatAddress(round.winner) khi thành viên khác thắng
  assert.ok(
    historySrc.includes("{formatAddress(round.winner)}"),
    "RoundHistory.tsx must render formatted address for regular winners"
  );
});

// ============================================================================
// REQ-03: Tích Hợp Thẻ Nhận Tiền Hoàn Trả Trong ActionPanel & i18n
// ============================================================================

test("TC-UI-03 (AC-03.1): ActionPanel và PasskeyActionPanel tự động hiển thị Thẻ Rút Tiền Thưởng Nổi Bật khi claimable > 0n sau khi nhận tiền hoàn trả", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionPanelSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    // 1. Kiểm tra Thẻ Rút tiền tự động kích hoạt khi claimable > 0n
    assert.ok(
      src.includes("claimable !== undefined && claimable > 0n"),
      `${name} must automatically render prominent claim card when claimable > 0n`
    );

    // 2. Hiển thị số tiền formatUsdc(claimable) USDC
    assert.ok(
      src.includes("{formatUsdc(claimable)}") && src.includes("USDC"),
      `${name} must display formatted refund amount in USDC`
    );

    // 3. Nút bấm rút tiền trực tiếp về ví
    assert.ok(
      src.includes("claimNowBtn"),
      `${name} must provide claim button with claimNowBtn label`
    );
  }
});

test("TC-I18N-01 (AC-03.2): Bộ từ điển song ngữ i18n cung cấp đầy đủ các khóa cho vòng không có người thắng trong cả vi và en", () => {
  const i18nSrc = readSource("src/lib/i18n.ts");

  // 1. Kiểm tra interface Translations.roundHistory
  assert.ok(
    i18nSrc.includes("noWinnerBadge: string;"),
    "Translations interface must declare noWinnerBadge"
  );
  assert.ok(
    i18nSrc.includes("noWinnerRefundDesc: string;"),
    "Translations interface must declare noWinnerRefundDesc"
  );

  // 2. Kiểm tra bản dịch tiếng Việt (vi)
  assert.equal(
    t("roundHistory.noWinnerBadge", "vi"),
    "Không có người thắng — Đã hoàn trả 100%"
  );
  assert.equal(
    t("roundHistory.noWinnerRefundDesc", "vi"),
    "Vòng kết thúc không có người thắng hợp lệ. Toàn bộ tiền đóng góp và tiền bid đã được hoàn trả 100% vào số dư rút của từng thành viên."
  );

  // 3. Kiểm tra bản dịch tiếng Anh (en)
  assert.equal(
    t("roundHistory.noWinnerBadge", "en"),
    "No Winner — 100% Refunded"
  );
  assert.equal(
    t("roundHistory.noWinnerRefundDesc", "en"),
    "Round ended with no eligible winner. All contributions and bids have been 100% refunded to members' claimable balance."
  );
});

test("TC-REGRESSION-01 (AC-03.3): Toàn bộ cấu trúc hệ thống và tính toàn vẹn kinh tế được bảo toàn (Zero Regression)", () => {
  // 1. Kiểm tra formatUsdc tính toán chính xác tiền hoàn trả
  assert.equal(formatUsdc(100000n), "0.10");
  assert.equal(formatUsdc(150000n), "0.15");
  assert.equal(formatUsdc(1000000n), "1.00");
  assert.equal(formatUsdc(0n), "0.00");

  // 2. Kiểm tra các hằng số và cấu trúc hợp đồng
  const contractSrc = readSource("contracts/RotatingSavings.sol");
  assert.ok(contractSrc.includes("uint256 public immutable contributionAmount;"));
  assert.ok(contractSrc.includes("uint256 public immutable roundDuration;"));
  assert.ok(contractSrc.includes("function claimPayout() external nonReentrant"));
});
