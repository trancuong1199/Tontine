import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CIRBTC_ADDRESS,
  CIRBTC_DECIMALS,
  formatCirBtc,
  parseCirBtc,
  COLLATERAL_ABI_ITEMS,
} from "../src/contract.ts";
import { translations } from "../src/lib/i18n.ts";

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

test("TC-VAULT-01 (AC-01.1..01.3): Smart Contract RotatingSavings.sol tích hợp CirBTC Collateral Vault và setCollateralAmount", () => {
  const sol = readSource("contracts/RotatingSavings.sol");

  assert.ok(sol.includes("address public immutable cirBtcToken;"), "Must declare cirBtcToken");
  assert.ok(sol.includes("uint256 public cirBtcCollateralAmount;"), "Must declare cirBtcCollateralAmount");
  assert.ok(sol.includes("mapping(address => uint256) public cirBtcCollateral;"), "Must declare cirBtcCollateral mapping");
  assert.ok(sol.includes("mapping(address => uint256) public claimableCirBtc;"), "Must declare claimableCirBtc mapping");
  assert.ok(sol.includes("cirBtcToken = cirBtcToken_;"), "Task-044 must use the constructor token instead of a hardcoded network token");
  assert.ok(sol.includes("function setCollateralAmount(uint256 collateralAmount_) external onlyGroupOwner"), "Must allow owner to configure collateral amount");
  assert.ok(sol.includes("emit CollateralDeposited(member, cirBtcCollateralAmount);"), "Must emit CollateralDeposited when member joins with collateral");
});

test("TC-VAULT-02 (AC-01.4, AC-01.5): Cơ chế Slashing kẻ bùng hụi, chia thưởng CirBTC cho thành viên chân chính và rút cọc qua claimCollateral", () => {
  const sol = readSource("contracts/RotatingSavings.sol");

  assert.ok(sol.includes("function _slashCollateral(uint256 roundId, address member)"), "Must implement _slashCollateral");
  assert.ok(sol.includes("emit CollateralSlashed(roundId, member, slashed);"), "Must emit CollateralSlashed on default");
  assert.ok(sol.includes("function _distributeSlashedCirBtc(uint256 roundId, uint256 roundSlashed)"), "Must distribute slashed CirBTC to honest contributors");
  assert.ok(sol.includes("claimableCirBtc[m] += share;"), "Must credit share to honest contributors");
  assert.ok(sol.includes("function claimCollateral() external nonReentrant"), "Must provide nonReentrant claimCollateral()");
  assert.ok(sol.includes("function getMemberCollateralStatus(address member) external view"), "Must provide getMemberCollateralStatus view");
});

test("TC-VAULT-03 (AC-02.1, AC-02.2): Cấu hình CIRBTC_ADDRESS (8 decimals) và hàm formatCirBtc / parseCirBtc chuẩn xác", () => {
  assert.equal(CIRBTC_ADDRESS, "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF");
  assert.equal(CIRBTC_DECIMALS, 8);
  assert.equal(formatCirBtc(100_000n), "0.0010");
  assert.equal(formatCirBtc(500_000n), "0.0050");
  assert.equal(parseCirBtc("0.001"), 100_000n);
  assert.equal(parseCirBtc("0.005"), 500_000n);
  assert.ok(COLLATERAL_ABI_ITEMS.some((item) => item.name === "claimCollateral"), "COLLATERAL_ABI_ITEMS must include claimCollateral");
});

test("TC-VAULT-04 (AC-03.1..03.3): ClubCard.tsx, ActionPanel.tsx, PasskeyActionPanel.tsx và CreateClubModal.tsx tích hợp UI Ký quỹ CirBTC", () => {
  const clubCard = readSource("src/components/savings/ClubCard.tsx");
  const actionPanel = readSource("src/components/savings/ActionPanel.tsx");
  const passkeyPanel = readSource("src/components/savings/PasskeyActionPanel.tsx");
  const createModal = readSource("src/components/savings/CreateClubModal.tsx");

  assert.ok(clubCard.includes("collateral.badgeTitle") && clubCard.includes("formatCirBtc"), "ClubCard must render CirBTC collateral badge");
  assert.ok(actionPanel.includes("claimCollateral") && actionPanel.includes("collateral.claimBtn"), "ActionPanel must support claiming CirBTC collateral");
  assert.ok(passkeyPanel.includes("claimCollateral") && passkeyPanel.includes("collateral.claimBtn"), "PasskeyActionPanel must support claiming CirBTC collateral");
  assert.ok(createModal.includes("collateral.createFieldLabel") && createModal.includes("collateral.presetStandard"), "CreateClubModal must render CirBTC collateral presets");
});

test("TC-VAULT-05 (AC-04.1): Từ điển song ngữ i18n cung cấp đầy đủ khóa collateral với 100% key parity giữa vi và en", () => {
  const viKeys = Object.keys(translations.vi.collateral).sort();
  const enKeys = Object.keys(translations.en.collateral).sort();
  assert.deepEqual(viKeys, enKeys, "vi and en collateral keys must match 100%");
  assert.ok(viKeys.length >= 11, "Must include all 11 collateral translation keys");
});
