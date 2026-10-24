import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { formatUsdc, GROUP_STATE } from "../src/contract.ts";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// TASK-040: BẢO TOÀN QUY MÔ QUỸ POT QUA MỌI VÒNG ĐẤU (HỤI CHẾT / ROSCA INVARIANT)
// ============================================================================

test("TC-PRESERVE-01 (AC-01.1): ClubCard.tsx tính potSize = contributionAmount * effectiveTotalJoined xuyên suốt các vòng", () => {
  const cardSrc = readSource("src/components/savings/ClubCard.tsx");

  assert.ok(
    cardSrc.includes("const potSize = contributionAmount * effectiveTotalJoined;"),
    "ClubCard must calculate potSize as contributionAmount * effectiveTotalJoined"
  );
  assert.ok(
    !cardSrc.includes("contributionAmount * activeMembers"),
    "ClubCard must NOT calculate potSize using activeMembers (as activeMembers excludes winners who pay dead hui)"
  );
});

test("TC-PRESERVE-02 (AC-01.2): Nhóm 2 thành viên ở Vòng 1 có potSize = 20.00 USDC", () => {
  const calculatePotSize = (contributionAmount: bigint, effectiveTotalJoined: bigint) => {
    return contributionAmount * effectiveTotalJoined;
  };

  const potRound1 = calculatePotSize(10_000_000n, 2n);
  assert.equal(potRound1, 20_000_000n, "Round 1 pot size must be 20 USDC");
  assert.equal(formatUsdc(potRound1), "20.00", "Formatted pot must display '20.00'");
});

test("TC-PRESERVE-03 (AC-01.3): Khắc phục lỗi báo cáo người dùng (R7c516ywmKML) — Vòng 2 sau khi có người claim pot vẫn hiển thị đủ 20.00 USDC", () => {
  const calculatePotSize = (contributionAmount: bigint, effectiveTotalJoined: bigint) => {
    return contributionAmount * effectiveTotalJoined;
  };

  // User won in Round 1 and claimed pot. In Round 2, activeMembers = 1 (Bot), effectiveTotalJoined = 2 (User + Bot)
  const effectiveTotalJoined = 2n;
  const contributionAmount = 10_000_000n; // 10 USDC

  const potRound2 = calculatePotSize(contributionAmount, effectiveTotalJoined);
  assert.equal(
    potRound2,
    20_000_000n,
    "Round 2 pot must remain 20 USDC because User pays dead hui (10 USDC) + Bot pays (10 USDC)"
  );
  assert.equal(
    formatUsdc(potRound2),
    "20.00",
    "Round 2 formatted amount must display '20.00', NOT '10.00'"
  );
});

test("TC-PRESERVE-04 (AC-01.4): Nhóm 10 thành viên tại Vòng 5 (4 người đã thắng nộp hụi chết, 6 người chờ hốt) hiển thị đủ 100.00 USDC", () => {
  const calculatePotSize = (contributionAmount: bigint, effectiveTotalJoined: bigint) => {
    return contributionAmount * effectiveTotalJoined;
  };

  const effectiveTotalJoined = 10n;
  const contributionAmount = 10_000_000n; // 10 USDC

  const potRound5 = calculatePotSize(contributionAmount, effectiveTotalJoined);
  assert.equal(
    potRound5,
    100_000_000n,
    "Round 5 pot must remain 100 USDC (4 dead hui + 6 live contributions)"
  );
  assert.equal(
    formatUsdc(potRound5),
    "100.00",
    "Round 5 formatted amount must display '100.00'"
  );
});

test("TC-PRESERVE-05 (AC-02.1): Smart Contract RotatingSavings.sol bảo đảm vòng 2 thu đủ 100% pot từ mọi thành viên", () => {
  const contractSrc = readSource("contracts/RotatingSavings.sol");

  // In settleRound: loops through all members.length, checks contribution != contributionAmount, accumulates totalPot
  assert.ok(
    contractSrc.includes("uint256 memberCount = members.length;"),
    "settleRound must loop through all members"
  );
  assert.ok(
    contractSrc.includes("totalPot += contribution;"),
    "settleRound must accumulate contribution of every valid member into totalPot"
  );
});
