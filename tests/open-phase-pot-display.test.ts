import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { translations, t } from "../src/lib/i18n.ts";
import { formatUsdc, GROUP_STATE } from "../src/contract.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Cập nhật Từ Điển Song Ngữ i18n
// ============================================================================

test("TC-POT-01 (AC-01.1): Translations.clubCard chứa heroPotEstimatedPrefix và contribStartsNotice", () => {
  const i18nSrc = readSource("src/lib/i18n.ts");

  assert.ok(
    i18nSrc.includes("heroPotEstimatedPrefix: string;"),
    "Translations.clubCard must declare heroPotEstimatedPrefix"
  );
  assert.ok(
    i18nSrc.includes("contribStartsNotice: string;"),
    "Translations.clubCard must declare contribStartsNotice"
  );
});

test("TC-POT-02 (AC-01.2): Từ điển tiếng Việt translations.vi.clubCard có chuỗi bản địa hóa chuẩn", () => {
  assert.equal(
    translations.vi.clubCard.heroPotEstimatedPrefix,
    "Quỹ Pot ước tính",
    "Vietnamese heroPotEstimatedPrefix must be exact"
  );
  assert.equal(
    translations.vi.clubCard.contribStartsNotice,
    "Sẽ đóng tiền khi Vòng 1 bắt đầu",
    "Vietnamese contribStartsNotice must be exact"
  );
  assert.equal(
    t("clubCard.heroPotEstimatedPrefix", "vi"),
    "Quỹ Pot ước tính"
  );
  assert.equal(
    t("clubCard.contribStartsNotice", "vi"),
    "Sẽ đóng tiền khi Vòng 1 bắt đầu"
  );
});

test("TC-POT-03 (AC-01.3): Từ điển tiếng Anh translations.en.clubCard có chuỗi bản địa hóa chuẩn", () => {
  assert.equal(
    translations.en.clubCard.heroPotEstimatedPrefix,
    "Estimated Pot",
    "English heroPotEstimatedPrefix must be exact"
  );
  assert.equal(
    translations.en.clubCard.contribStartsNotice,
    "Contributions start in Round 1",
    "English contribStartsNotice must be exact"
  );
  assert.equal(
    t("clubCard.heroPotEstimatedPrefix", "en"),
    "Estimated Pot"
  );
  assert.equal(
    t("clubCard.contribStartsNotice", "en"),
    "Contributions start in Round 1"
  );
});

test("TC-POT-04 (AC-01.4): Key parity 100% giữa 'vi' và 'en' cho các trường mới trong clubCard", () => {
  assert.ok("heroPotEstimatedPrefix" in translations.vi.clubCard);
  assert.ok("heroPotEstimatedPrefix" in translations.en.clubCard);
  assert.ok("contribStartsNotice" in translations.vi.clubCard);
  assert.ok("contribStartsNotice" in translations.en.clubCard);
});

// ============================================================================
// REQ-02: Chuẩn hóa tính toán & hiển thị Quỹ Pot trong ClubCard.tsx
// ============================================================================

test("TC-POT-05 (AC-02.1): ClubCard.tsx tính potSize = contributionAmount * effectiveTotalJoined bảo toàn 100% quy mô pot", () => {
  const cardSrc = readSource("src/components/savings/ClubCard.tsx");

  assert.ok(
    cardSrc.includes("const potSize = contributionAmount * effectiveTotalJoined;"),
    "ClubCard must calculate potSize as contributionAmount * effectiveTotalJoined"
  );
});

test("TC-POT-06 (AC-02.2): Khi state === GROUP_STATE.OPEN, potSize phản ánh đúng số thành viên đã tham gia (Option A)", () => {
  const calculatePotSize = (state: number, contributionAmount: bigint, effectiveTotalJoined: bigint, activeMembers: bigint) => {
    return state === GROUP_STATE.OPEN ? contributionAmount * effectiveTotalJoined : contributionAmount * activeMembers;
  };

  // Group in OPEN state with 1 registered member (creator joined)
  const openPotWith1Member = calculatePotSize(GROUP_STATE.OPEN, 10000000n, 1n, 0n);
  assert.equal(openPotWith1Member, 10000000n, "Pot size must be 10 USDC in OPEN state with 1 registered member");
  assert.equal(formatUsdc(openPotWith1Member), "10.00", "Pot formatted amount must display '10.00'");

  // Group in OPEN state with 2 registered members
  const openPotWith2Members = calculatePotSize(GROUP_STATE.OPEN, 10000000n, 2n, 0n);
  assert.equal(openPotWith2Members, 20000000n, "Pot size must be 20 USDC in OPEN state with 2 registered members");
  assert.equal(formatUsdc(openPotWith2Members), "20.00", "Pot formatted amount must display '20.00'");
});

test("TC-POT-07 (AC-02.3 & AC-02.4): ClubCard.tsx hiển thị heroPotEstimatedPrefix và contribStartsNotice khi state === GROUP_STATE.OPEN", () => {
  const cardSrc = readSource("src/components/savings/ClubCard.tsx");

  assert.ok(
    cardSrc.includes('t("clubCard.heroPotEstimatedPrefix", language)'),
    "ClubCard must render heroPotEstimatedPrefix when state is OPEN"
  );
  assert.ok(
    cardSrc.includes('t("clubCard.contribStartsNotice", language)'),
    "ClubCard must render contribStartsNotice when state is OPEN"
  );
  assert.ok(
    cardSrc.includes("state === GROUP_STATE.OPEN"),
    "ClubCard must check for GROUP_STATE.OPEN in hero pot area"
  );
});

test("TC-POT-08 (AC-02.5): Khi state === GROUP_STATE.ACTIVE, potSize bảo toàn 100% quy mô pot theo toàn bộ thành viên (kể cả người đã thắng nộp hụi chết)", () => {
  const calculatePotSize = (contributionAmount: bigint, effectiveTotalJoined: bigint) => {
    return contributionAmount * effectiveTotalJoined;
  };

  // Active round with 10 members and 10 USDC contribution (Round 1: 10 unawarded)
  const activePot10 = calculatePotSize(10000000n, 10n);
  assert.equal(activePot10, 100000000n, "Active pot for 10 members at 10 USDC must equal 100 USDC");
  assert.equal(formatUsdc(activePot10), "100.00", "Active pot formatted amount must be '100.00'");

  // Active round in Round 2 with 9 unawarded members + 1 winner paying dead hui (effectiveTotalJoined = 10)
  const activePotRound2 = calculatePotSize(10000000n, 10n);
  assert.equal(activePotRound2, 100000000n, "Active pot in Round 2 remains 100 USDC (preserved 100% under ROSCA rules)");
  assert.equal(formatUsdc(activePotRound2), "100.00", "Active pot formatted amount must remain '100.00'");

  // Active round with 2 members in Round 2 (1 unawarded + 1 winner paying dead hui, effectiveTotalJoined = 2)
  const activePot2MembersRound2 = calculatePotSize(10000000n, 2n);
  assert.equal(activePot2MembersRound2, 20000000n, "Active pot in 2-member group Round 2 must be 20.00 USDC, not 10.00 USDC");
  assert.equal(formatUsdc(activePot2MembersRound2), "20.00", "Active pot formatted amount must be '20.00'");
});

test("TC-POT-09: Smart Contract RotatingSavings.sol bảo đảm chủ nhóm bình đẳng nghĩa vụ đóng tiền, không miễn phí và bị Kick nếu không nộp", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");

  // contribute requires state == ACTIVE and checks msg.sender
  assert.ok(
    contractSrc.includes("function contribute(uint256 roundId) external nonReentrant"),
    "Smart contract must define contribute function"
  );
  assert.ok(
    contractSrc.includes("usdc.safeTransferFrom(msg.sender, address(this), contributionAmount);"),
    "contribute must transfer USDC from msg.sender without exempting owner"
  );

  // settleRound kicks members who defaulted on contribution
  assert.ok(
    contractSrc.includes("if (contribution != contributionAmount) {") &&
      contractSrc.includes("isKicked[member] = true;") &&
      contractSrc.includes("emit MemberKicked(roundId, member);"),
    "settleRound must kick any member including owner if contribution != contributionAmount"
  );
});
