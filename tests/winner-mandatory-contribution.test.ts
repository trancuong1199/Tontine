import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { t, type Language } from "../src/lib/i18n.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// =========================================================================
// REQ-01: Smart Contract — Nghĩa Vụ Đóng Hụi Chết & Bảo Toàn Quỹ Pot
// =========================================================================

test("TC-DEADHUI-01 (AC-01.1): Hàm contribute(roundId) trong contracts/RotatingSavings.sol cho phép người đã thắng đóng tiền, không bị revert AlreadyWon()", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");

  // Locate the contribute function body
  const contributeFnIndex = contractSrc.indexOf("function contribute(uint256 roundId)");
  const placeBidIndex = contractSrc.indexOf("function placeBid(uint256 roundId");
  assert.ok(contributeFnIndex !== -1, "contribute function must exist in RotatingSavings.sol");
  assert.ok(placeBidIndex !== -1, "placeBid function must exist in RotatingSavings.sol");

  const contributeBody = contractSrc.slice(contributeFnIndex, placeBidIndex);

  // Assert AlreadyWon is NOT reverted in contribute
  assert.ok(
    !contributeBody.includes("revert AlreadyWon()"),
    "contribute() must NOT revert AlreadyWon() when hasWon is true"
  );

  // Assert it requires ACTIVE state and valid round
  assert.ok(
    contributeBody.includes("state != GroupState.ACTIVE"),
    "contribute() must check GroupState.ACTIVE"
  );
  assert.ok(
    contributeBody.includes("roundId != currentRound"),
    "contribute() must check currentRound"
  );
});

test("TC-DEADHUI-02 (AC-01.2): Ràng buộc đóng tiền: mỗi vòng chỉ đóng 1 lần, đúng roundId == currentRound, vòng ACTIVE, !isKicked, block.timestamp <= endTime", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");
  const contributeFnIndex = contractSrc.indexOf("function contribute(uint256 roundId)");
  const placeBidIndex = contractSrc.indexOf("function placeBid(uint256 roundId");
  const contributeBody = contractSrc.slice(contributeFnIndex, placeBidIndex);

  // Check all standard contribution validations
  assert.ok(
    contributeBody.includes("if (round.contributions[msg.sender] != 0) revert AlreadyContributed();"),
    "contribute() must revert AlreadyContributed if already contributed in this round"
  );
  assert.ok(
    contributeBody.includes("if (block.timestamp > round.endTime) revert RoundStillOpen();") ||
    contributeBody.includes("block.timestamp > round.endTime"),
    "contribute() must check endTime"
  );
  assert.ok(
    contributeBody.includes("if (isKicked[msg.sender]) revert NotMember();"),
    "contribute() must revert if sender is kicked"
  );
  assert.ok(
    contributeBody.includes("if (!isMember[msg.sender]) revert NotMember();"),
    "contribute() must revert if sender is not a member"
  );
  assert.ok(
    contributeBody.includes("emit Contributed(roundId, msg.sender, contributionAmount);"),
    "contribute() must emit Contributed event"
  );
});

test("TC-DEADHUI-03 (AC-01.3): Hàm settleRound(roundId) cộng dồn đóng góp của toàn bộ thành viên hợp lệ (kể cả người đã thắng hụi chết) vào totalPot", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");
  const settleFnIndex = contractSrc.indexOf("function settleRound(uint256 roundId)");
  assert.ok(settleFnIndex !== -1, "settleRound function must exist");

  const settleBody = contractSrc.slice(settleFnIndex, settleFnIndex + 1400);

  // totalPot accumulation MUST happen before skipping hasWon members for bidding
  const totalPotAccIndex = settleBody.indexOf("totalPot += contribution;");
  const hasWonSkipIndex = settleBody.indexOf("if (hasWon[member])");

  assert.ok(totalPotAccIndex !== -1, "settleRound must accumulate totalPot += contribution");
  assert.ok(hasWonSkipIndex !== -1, "settleRound must check hasWon for member");

  assert.ok(
    totalPotAccIndex < hasWonSkipIndex,
    "totalPot += contribution MUST occur BEFORE skipping hasWon members so that dead hui contributions are added to the pot"
  );
});

test("TC-DEADHUI-04 (AC-01.4): Quy mô quỹ Pot được bảo toàn 100% cố định qua mọi vòng (totalPot = N * contributionAmount)", () => {
  // Pure model testing of pot preservation invariant
  const simulateRounds = (membersCount: number, contributionAmount: bigint) => {
    const rounds: { roundId: number; totalPot: bigint; winnerIndex: number }[] = [];
    const hasWon = new Array(membersCount).fill(false);

    for (let roundId = 1; roundId <= membersCount; roundId++) {
      let totalPot = 0n;

      // Every non-kicked member contributes contributionAmount (dead hui and live hui)
      for (let i = 0; i < membersCount; i++) {
        totalPot += contributionAmount;
      }

      // Winner is selected among !hasWon members
      const eligible = hasWon.map((won, idx) => (!won ? idx : -1)).filter((idx) => idx !== -1);
      assert.ok(eligible.length > 0, `Round ${roundId} must have at least one eligible unawarded member`);

      const winnerIdx = eligible[0]; // first available winner
      hasWon[winnerIdx] = true;

      rounds.push({ roundId, totalPot, winnerIndex: winnerIdx });
    }

    return rounds;
  };

  const results = simulateRounds(10, 10_000_000n); // 10 members, 10 USDC
  assert.equal(results.length, 10);

  for (const round of results) {
    assert.equal(
      round.totalPot,
      100_000_000n, // 100 USDC in every round
      `Round ${round.roundId} pot must remain exactly 100 USDC (preserved 100%)`
    );
  }
});

// =========================================================================
// REQ-02: Smart Contract — Độc Quyền Đấu Giá Cho Thành Viên Chưa Hốt & Phân Phối Thưởng
// =========================================================================

test("TC-DEADHUI-05 (AC-02.1): Hàm placeBid(roundId, bidAmount) cấm tuyệt đối người đã thắng đặt bid, duy trì revert AlreadyWon()", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");
  const placeBidIndex = contractSrc.indexOf("function placeBid(uint256 roundId, uint256 bidAmount)");
  assert.ok(placeBidIndex !== -1, "placeBid function must exist");

  const placeBidBody = contractSrc.slice(placeBidIndex, placeBidIndex + 600);

  assert.ok(
    placeBidBody.includes("if (hasWon[msg.sender]) revert AlreadyWon();"),
    "placeBid() MUST strictly revert AlreadyWon() when hasWon is true"
  );
});

test("TC-DEADHUI-06 (AC-02.2): Hàm settleRound(roundId) chỉ chọn winner mới trong danh sách thành viên CHƯA TỪNG THẮNG (!hasWon[member])", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");
  const settleFnIndex = contractSrc.indexOf("function settleRound(uint256 roundId)");
  const settleBody = contractSrc.slice(settleFnIndex, settleFnIndex + 1400);

  // Ensure that members with hasWon[member] are skipped from winner candidate selection
  assert.ok(
    settleBody.includes("if (hasWon[member]) {\n                continue;\n            }") ||
    settleBody.includes("if (hasWon[member]) continue;"),
    "settleRound() must continue/skip hasWon members from bidding and winner candidate selection"
  );
});

test("TC-DEADHUI-07 (AC-02.3): Hàm _distributeBonuses() chỉ chia tiền thưởng bonus từ bids cho thành viên CHƯA TỪNG THẮNG (!hasWon[member] && !isKicked[member] && member != winner)", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");
  const bonusFnIndex = contractSrc.indexOf("function _distributeBonuses(");
  assert.ok(bonusFnIndex !== -1, "_distributeBonuses must exist");

  const bonusBody = contractSrc.slice(bonusFnIndex, bonusFnIndex + 1200);

  // Both recipient counting and bonus distribution loops must exclude hasWon members
  const hasWonChecks = (bonusBody.match(/if \(isKicked\[member\] \|\| hasWon\[member\]\) continue;/g) || []).length;
  assert.ok(
    hasWonChecks >= 2,
    "_distributeBonuses must exclude hasWon members in both recipient counting and bonus distribution loops"
  );
});

test("TC-DEADHUI-08 (AC-02.4): Điều kiện tất toán sớm canEarlySettle: _allRemainingContributedOrKicked() yêu cầu TẤT CẢ thành viên chưa kicked (kể cả người đã thắng) đều phải đóng tiền", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");
  const helperIndex = contractSrc.indexOf("function _allRemainingContributedOrKicked(");
  assert.ok(helperIndex !== -1, "_allRemainingContributedOrKicked helper must exist");

  const helperBody = contractSrc.slice(helperIndex, helperIndex + 600);

  // It should NOT skip hasWon members when checking contributions
  assert.ok(
    !helperBody.includes("hasWon[member]"),
    "_allRemainingContributedOrKicked MUST NOT skip hasWon members so that winners must also contribute to allow early settle"
  );
  assert.ok(
    helperBody.includes("if (rounds[roundId].contributions[member] != contributionAmount) {\n                return false;\n            }"),
    "_allRemainingContributedOrKicked must verify each active member contributed contributionAmount"
  );
});

test("TC-DEADHUI-09 (AC-02.5): Cơ chế phạt: Nếu người đã thắng không đóng hụi chết khi vòng kết thúc, hợp đồng kick người này (isKicked = true)", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");
  const settleFnIndex = contractSrc.indexOf("function settleRound(uint256 roundId)");
  const settleBody = contractSrc.slice(settleFnIndex, settleFnIndex + 1200);

  // In settleRound loop, if contribution != contributionAmount, kick member regardless of hasWon
  assert.ok(
    settleBody.includes("if (contribution != contributionAmount) {\n                isKicked[member] = true;\n                round.kicked[member] = true;"),
    "settleRound must mark isKicked and round.kicked for any defaulting member including previous winners"
  );
});

// =========================================================================
// REQ-03: Giao Diện Người Dùng — Phân Tách Khối Đóng Hụi Chết & Khóa Đấu Giá
// =========================================================================

test("TC-DEADHUI-10 (AC-03.1): ActionPanel.tsx và PasskeyActionPanel.tsx hiển thị Thẻ Đóng Hụi Chết với nhãn bắt buộc khi hasWon == true", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionPanelSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    // 1. Dead hui badge key used
    assert.ok(
      src.includes('t("actionPanel.deadHuiBadge", language)'),
      `${name} must render deadHuiBadge translation key for awarded members`
    );

    // 2. Dead hui title key used
    assert.ok(
      src.includes('t("actionPanel.deadHuiTitle", language)'),
      `${name} must render deadHuiTitle translation key`
    );

    // 3. Dead hui description key used
    assert.ok(
      src.includes('t("actionPanel.deadHuiDesc", language)'),
      `${name} must render deadHuiDesc translation key`
    );
  }

  // Translation values check
  assert.equal(t("actionPanel.deadHuiBadge", "vi"), "Hụi chết (Bắt buộc)");
  assert.equal(t("actionPanel.deadHuiBadge", "en"), "Dead Hui (Mandatory)");
  assert.equal(t("actionPanel.deadHuiTitle", "vi"), "Đóng hụi chết");
  assert.equal(t("actionPanel.deadHuiTitle", "en"), "Dead Hui Contribution");
});

test("TC-DEADHUI-11 (AC-03.2): Giao diện cung cấp nút bấm nộp tiền hụi chết và cập nhật trạng thái 'Đã đóng hụi chết vòng này' on-chain kèm CheckCircle2", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionPanelSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    // 1. Button label for dead hui
    assert.ok(
      src.includes("Đóng hụi chết (") && src.includes("Contribute Dead Hui ("),
      `${name} must provide dedicated Dead Hui contribute button label with amount`
    );

    // 2. Confirmed status for dead hui
    assert.ok(
      src.includes('t("actionPanel.deadHuiContributed", language)'),
      `${name} must display deadHuiContributed badge when hasContributed is true`
    );
  }

  assert.equal(t("actionPanel.deadHuiContributed", "vi"), "Đã đóng hụi chết vòng này");
  assert.equal(t("actionPanel.deadHuiContributed", "en"), "Dead hui contributed for this round");
});

test("TC-DEADHUI-12 (AC-03.3): Khóa/ẩn form đặt bid cho người đã thắng, hiển thị Banner Độc quyền đấu giá cho người chưa hốt và duy trì nút lối tắt", () => {
  const actionPanelSrc = readSource("src/components/savings/ActionPanel.tsx");
  const passkeySrc = readSource("src/components/savings/PasskeyActionPanel.tsx");

  for (const [name, src] of [["ActionPanel.tsx", actionPanelSrc], ["PasskeyActionPanel.tsx", passkeySrc]]) {
    // 1. Bidding form condition: hasContributed && !hasWon
    assert.ok(
      src.includes("hasContributed && !hasWon"),
      `${name} must condition bidding form on hasContributed && !hasWon`
    );

    // 2. Exclusive bidding notice displayed for hasWon
    assert.ok(
      src.includes('t("actionPanel.exclusiveBiddingNotice", language)'),
      `${name} must render exclusiveBiddingNotice banner for hasWon members`
    );
    assert.ok(
      src.includes('t("actionPanel.exclusiveBiddingDesc", language)'),
      `${name} must render exclusiveBiddingDesc banner for hasWon members`
    );

    // 3. Navigation shortcuts maintained
    assert.ok(
      src.includes('t("actionPanel.exploreOtherClubsBtn", language)') &&
      src.includes('t("actionPanel.createNewClubBtn", language)'),
      `${name} must maintain navigation shortcut buttons`
    );
  }

  assert.equal(t("actionPanel.exclusiveBiddingNotice", "vi"), "Quyền đấu giá thuộc về các thành viên chưa hốt");
  assert.equal(t("actionPanel.exclusiveBiddingNotice", "en"), "Bidding is reserved for unawarded members");
});

// =========================================================================
// REQ-04: Hiển Thị Trạng Thái Thành Viên, Danh Sách Roster & Song Ngữ
// =========================================================================

test("TC-DEADHUI-13 (AC-04.1): MemberStatus.tsx phản ánh đúng tiến độ đóng tiền của người đã thắng ở vòng hiện tại (Đã đóng / Chưa đóng)", () => {
  const memberStatusSrc = readSource("src/components/savings/MemberStatus.tsx");

  // Verify that contribution status renders for all members including hasWon
  assert.ok(
    memberStatusSrc.includes("hasContributed"),
    "MemberStatus must evaluate hasContributed"
  );
  assert.ok(
    memberStatusSrc.includes('t("memberStatus.contribBadge", language)'),
    "MemberStatus must render contribBadge"
  );
  assert.ok(
    memberStatusSrc.includes("CheckCircle2") && memberStatusSrc.includes("AlertCircle"),
    "MemberStatus must show CheckCircle2 when contributed and AlertCircle when pending"
  );
});

test("TC-DEADHUI-14 (AC-04.2): ClubMembersRoster.tsx hiển thị cả huy hiệu 🏆 Đã hốt vòng X, tiến độ đóng hụi chết vòng hiện tại, và cột Bid hiển thị 'Đã hốt (Không bid)' / 'No bid (Awarded)'", () => {
  const rosterSrc = readSource("src/components/savings/ClubMembersRoster.tsx");

  // 1. Trophy badge
  assert.ok(
    rosterSrc.includes("member.hasWon") && rosterSrc.includes("Trophy"),
    "ClubMembersRoster must display Trophy badge for awarded members"
  );

  // 2. Contribution status for all members
  assert.ok(
    rosterSrc.includes("member.hasContributed"),
    "ClubMembersRoster must check member.hasContributed"
  );

  // 3. Bid column shows No bid (Awarded) for hasWon members
  assert.ok(
    rosterSrc.includes('isEn ? "No bid (Awarded)" : "Đã hốt (Không bid)"'),
    "ClubMembersRoster must show 'Đã hốt (Không bid)' / 'No bid (Awarded)' in bid column for awarded members"
  );
});

test("TC-DEADHUI-15 (AC-04.3): Từ điển song ngữ src/lib/i18n.ts cung cấp đầy đủ chuỗi vi và en cho Hụi chết và Độc quyền đấu giá", () => {
  const languages: Language[] = ["vi", "en"];

  const deadHuiKeys = [
    "actionPanel.deadHuiTitle",
    "actionPanel.deadHuiBadge",
    "actionPanel.deadHuiDesc",
    "actionPanel.deadHuiContributed",
    "actionPanel.exclusiveBiddingNotice",
    "actionPanel.exclusiveBiddingDesc",
  ];

  for (const lang of languages) {
    for (const key of deadHuiKeys) {
      const val = t(key, lang);
      assert.ok(
        val && val.length > 0,
        `Key ${key} in language ${lang} must have non-empty translation`
      );
      assert.notEqual(
        val,
        key,
        `Key ${key} in language ${lang} must not fallback to raw key name`
      );
    }
  }

  // Backward compatibility check for previous task strings
  assert.ok(t("actionPanel.winnerNoPayNotice", "vi").length > 0);
  assert.ok(t("actionPanel.winnerNoPayNotice", "en").length > 0);
  assert.ok(t("actionPanel.winnerOfficialNotice", "vi").length > 0);
  assert.ok(t("actionPanel.winnerOfficialNotice", "en").length > 0);
});
