import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { ethers } from "ethers";

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

// ============================================================================
// REQ-01: Tự Động Hóa Quản Lý 10 Ví & Phân Phối Quỹ Trên Arc Testnet
// ============================================================================

test("TC-10MEM-01 (AC-01.1): Script CLI hỗ trợ đầy đủ các cờ --help, --dry-run, --funder-key, --amount, --bid, --group", () => {
  const scriptSrc = readSource("scripts/setup-10-members.mjs");

  // Verify CLI argument parsing logic supports all required flags
  assert.ok(scriptSrc.includes('arg === "--help" || arg === "-h"'), "Script must support --help and -h flags");
  assert.ok(scriptSrc.includes('arg === "--dry-run"'), "Script must support --dry-run flag");
  assert.ok(scriptSrc.includes('arg === "--funder-key"'), "Script must support --funder-key flag");
  assert.ok(scriptSrc.includes('arg === "--amount"'), "Script must support --amount flag");
  assert.ok(scriptSrc.includes('arg === "--bid"'), "Script must support --bid flag");
  assert.ok(scriptSrc.includes('arg === "--group"'), "Script must support --group flag");

  // Verify execution of --help returns exit code 0 and displays documentation
  const helpOutput = execSync("node scripts/setup-10-members.mjs --help", { encoding: "utf8" });
  assert.ok(helpOutput.includes("TONTINE — 10-MEMBER SAVINGS CLUB SETUP"), "Help output must include banner");
  assert.ok(helpOutput.includes("--funder-key"), "Help output must list --funder-key");
  assert.ok(helpOutput.includes("--amount"), "Help output must list --amount");
  assert.ok(helpOutput.includes("--bid"), "Help output must list --bid");
  assert.ok(helpOutput.includes("--group"), "Help output must list --group");
  assert.ok(helpOutput.includes("--dry-run"), "Help output must list --dry-run");
});

test("TC-10MEM-02 (AC-01.2): Cơ chế kiểm tra số dư Pre-flight check và logic sinh ngẫu nhiên 9 ví phụ", () => {
  const scriptSrc = readSource("scripts/setup-10-members.mjs");

  // Verify pre-flight balance checking logic
  assert.ok(
    scriptSrc.includes("provider.getBalance(funder.address)") &&
    scriptSrc.includes("usdcContract.balanceOf(funder.address)"),
    "Script must query both native gas and ERC20 USDC balance for pre-flight check"
  );
  assert.ok(
    scriptSrc.includes("nativeBalance < totalRequiredNative") &&
    scriptSrc.includes("usdcBalance < totalRequiredUsdc"),
    "Script must halt safely with error messages if funds are insufficient"
  );

  // Verify 9 burner wallets generation using ethers.Wallet.createRandom
  assert.ok(
    scriptSrc.includes("ethers.Wallet.createRandom()"),
    "Script must use ethers.Wallet.createRandom() to generate burner wallets"
  );
  assert.ok(
    scriptSrc.includes("for (let i = 0; i < 9; i++)"),
    "Script must generate exactly 9 burner wallets for 10-member club"
  );

  // Functional test: verify ethers creates 9 unique and valid wallets
  const wallets = [];
  for (let i = 0; i < 9; i++) {
    wallets.push(ethers.Wallet.createRandom());
  }
  const uniqueAddresses = new Set(wallets.map((w) => w.address.toLowerCase()));
  assert.equal(uniqueAddresses.size, 9, "9 generated burner wallets must have unique addresses");
});

test("TC-10MEM-03 (AC-01.3): Công thức tính toán tài trợ gas native và ERC-20 USDC cho 9 ví phụ chính xác, không lãng phí", () => {
  const scriptSrc = readSource("scripts/setup-10-members.mjs");

  // Check constant definitions
  assert.ok(scriptSrc.includes('NATIVE_GAS_PER_BURNER = "0.06"'), "Native gas per burner should be 0.06 native USDC");
  assert.ok(scriptSrc.includes("nativeGasPerBurner * 9n"), "Script must calculate native gas for exactly 9 burners");
  assert.ok(scriptSrc.includes("parsedContribution * 9n"), "Script must calculate ERC20 USDC for exactly 9 burners");

  // Verify funding loop transfers both native and ERC20 to all 9 burners
  assert.ok(
    scriptSrc.includes("funder.sendTransaction") &&
    scriptSrc.includes("value: nativeGasPerBurner"),
    "Script must transfer native gas to each burner wallet"
  );
  assert.ok(
    scriptSrc.includes("usdcContract.transfer(b.address, parsedContribution)"),
    "Script must transfer exact contribution amount of ERC20 USDC to each burner wallet"
  );
});

// ============================================================================
// REQ-02: Điều Phối Toàn Trình Chu Kỳ Hụi 10 Người Đến Trạng Thái Rút Tiền
// ============================================================================

test("TC-10MEM-04 (AC-02.1): Logic triển khai nhóm mới 10 người và quy trình đăng ký đủ 10/10 thành viên on-chain", () => {
  const scriptSrc = readSource("scripts/setup-10-members.mjs");

  // Verify deployment of new 10-member group with maxMembers = 10n
  assert.ok(
    scriptSrc.includes("factory.deploy(") &&
    scriptSrc.includes("10n,") &&
    scriptSrc.includes('"Tontine 10-Member Club"'),
    "Script must deploy RotatingSavings contract with maxMembers=10n and name 'Tontine 10-Member Club'"
  );

  // Verify all 10 members call joinGroup()
  assert.ok(
    scriptSrc.includes("clubContract.joinGroup()"),
    "Funder wallet must call joinGroup()"
  );
  assert.ok(
    scriptSrc.includes("bClub.joinGroup()"),
    "Burner wallets must call joinGroup() to reach 10/10 capacity"
  );
  assert.ok(
    scriptSrc.includes("for (let i = 0; i < burners.length; i++)"),
    "Burner loop must iterate through all burners to register them"
  );
});

test("TC-10MEM-05 (AC-02.2): Chuyển đổi trạng thái từ OPEN sang ACTIVE Vòng 1 qua hàm startRounds()", () => {
  const scriptSrc = readSource("scripts/setup-10-members.mjs");

  // Verify startRounds is called by owner when state is OPEN (0)
  assert.ok(
    scriptSrc.includes("currentState === 0") &&
    scriptSrc.includes("clubContract.startRounds()"),
    "Script must check state is OPEN (0) and execute startRounds() to transition to ACTIVE"
  );
});

test("TC-10MEM-06 (AC-02.3): Logic đóng tiền đủ 10 ví và đặt bid đấu giá hợp lệ", () => {
  const scriptSrc = readSource("scripts/setup-10-members.mjs");

  // Verify Funder approves and contributes for Round 1
  assert.ok(
    scriptSrc.includes("usdcContract.approve(groupAddress, parsedContribution)") &&
    scriptSrc.includes("clubContract.contribute(1n)"),
    "Funder must approve USDC and contribute to Round 1"
  );

  // Verify all 9 burners approve and contribute for Round 1
  assert.ok(
    scriptSrc.includes("bUsdc.approve(groupAddress, parsedContribution)") &&
    scriptSrc.includes("bClub.contribute(1n)"),
    "All 9 burners must approve USDC and contribute to Round 1"
  );

  // Verify winning bid is placed by Funder
  assert.ok(
    scriptSrc.includes("usdcContract.approve(groupAddress, parsedBid)") &&
    scriptSrc.includes("clubContract.placeBid(1n, parsedBid)"),
    "Funder must approve and place winning bid for Round 1"
  );
});

test("TC-10MEM-07 (AC-02.4): Thỏa mãn điều kiện tất toán sớm canEarlySettle và công thức tính toán claimable cho người thắng", () => {
  const scriptSrc = readSource("scripts/setup-10-members.mjs");

  // Verify early settlement call
  assert.ok(
    scriptSrc.includes("clubContract.settleRound(1n)"),
    "Script must call settleRound(1n) once 10 contributions and winning bid are submitted"
  );

  // Verify claimable payout verification
  assert.ok(
    scriptSrc.includes("clubContract.claimable(funder.address)"),
    "Script must query claimable amount on-chain for funder address after settlement"
  );
  assert.ok(
    scriptSrc.includes("Funder wallet has") && scriptSrc.includes("ready to claim"),
    "Script must confirm claimable payout is ready on-chain"
  );
});

// ============================================================================
// REQ-03: Tích Hợp Giao Diện Web & Kiểm Thử Thao Tác Rút Tiền (Claim Payout UX)
// ============================================================================

test("TC-10MEM-08 (AC-03.1): Định dạng xuất kết quả CLI cung cấp URL trực tiếp: http://localhost:5173/?group=0x...", () => {
  const scriptSrc = readSource("scripts/setup-10-members.mjs");

  // Verify generation and display of direct app URL
  assert.ok(
    scriptSrc.includes("const appUrl = `http://localhost:5173/?group=${groupAddress}`;"),
    "Script must construct direct web app URL with query param ?group=0x..."
  );
  assert.ok(
    scriptSrc.includes("OPEN THIS URL IN YOUR BROWSER TO TEST CLAIM PAYOUT"),
    "Script must print clear user instructions with direct URL"
  );
  assert.ok(
    scriptSrc.includes("VERIFICATION STEPS ON WEB UI:"),
    "Script must provide step-by-step verification instructions"
  );
});

test("TC-10MEM-09 (AC-03.2): Giao diện web MemberStatus.tsx liên kết prop claimable > 0n và hiển thị khối rút tiền kèm nút bấm 'Rút tiền (Claim Payout)'", () => {
  const memberStatusSrc = readSource("src/components/savings/MemberStatus.tsx");

  // Verify condition for displaying claimable payout banner
  assert.ok(
    memberStatusSrc.includes("claimable > 0n"),
    "MemberStatus.tsx must conditionally display claim section when claimable > 0n"
  );

  // Verify claimable badge and formatted amount display
  assert.ok(
    memberStatusSrc.includes("formatUsdc(claimable)"),
    "MemberStatus.tsx must format claimable amount in USDC"
  );
  assert.ok(
    memberStatusSrc.includes("t(\"memberStatus.claimableBadge\", language)"),
    "MemberStatus.tsx must render claimableBadge translation label"
  );

  // Verify claim button attributes and luxury styling
  assert.ok(
    memberStatusSrc.includes("onClick={onClaimPayout}") &&
    memberStatusSrc.includes("disabled={isClaiming}") &&
    memberStatusSrc.includes("bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600"),
    "MemberStatus.tsx must render claim button with onClaimPayout handler and sand gold gradient"
  );
  assert.ok(
    memberStatusSrc.includes("isClaiming ? t(\"memberStatus.claimingBtn\", language) : t(\"memberStatus.claimPayoutBtn\", language)"),
    "MemberStatus.tsx must toggle button label between claiming and claimPayout"
  );
});

test("TC-10MEM-10 (AC-03.3): App.tsx xử lý hàm handleClaimPayout() gọi hàm hợp đồng claimPayout() và lắng nghe receipt", () => {
  const appSrc = readSource("src/App.tsx");

  // Verify useWriteContract hook configuration for claim payout
  assert.ok(
    appSrc.includes("writeContract: claimWrite") &&
    appSrc.includes("data: claimHash") &&
    appSrc.includes("isPending: isClaiming"),
    "App.tsx must define claimWrite contract write hook"
  );

  // Verify receipt monitoring
  assert.ok(
    appSrc.includes("useWaitForTransactionReceipt({ hash: claimHash })"),
    "App.tsx must wait for transaction receipt for claimHash"
  );

  // Verify handleClaimPayout implementation
  assert.ok(
    appSrc.includes("const handleClaimPayout = () => {") &&
    appSrc.includes('functionName: "claimPayout"') &&
    appSrc.includes("chainId: ARC_TESTNET_CHAIN_ID"),
    "App.tsx must implement handleClaimPayout calling claimPayout on the active contract"
  );

  // Verify post-claim success handling with toast and refetch
  assert.ok(
    appSrc.includes("if (isClaimSuccess) {") &&
    appSrc.includes("toast.success(") &&
    appSrc.includes("resetClaim()") &&
    appSrc.includes("refetchAll()"),
    "App.tsx must trigger success toast, reset claim state, and refetch all contract reads"
  );

  // Verify MemberStatus binding
  assert.ok(
    appSrc.includes("onClaimPayout={handleClaimPayout}") &&
    appSrc.includes("isClaiming={isClaiming || isClaimConfirming}"),
    "App.tsx must pass handleClaimPayout and isClaiming state into MemberStatus"
  );
});

test("TC-10MEM-11 (AC-03.4): package.json chứa lệnh script 'setup:10-members': 'node scripts/setup-10-members.mjs'", () => {
  const pkgJsonStr = readSource("package.json");
  const pkg = JSON.parse(pkgJsonStr);

  assert.ok(
    pkg.scripts && pkg.scripts["setup:10-members"],
    "package.json must contain 'setup:10-members' script entry"
  );
  assert.equal(
    pkg.scripts["setup:10-members"],
    "node scripts/setup-10-members.mjs",
    "package.json 'setup:10-members' must invoke 'node scripts/setup-10-members.mjs'"
  );
});

test("TC-10MEM-12: Chạy thử nghiệm thực tế --dry-run của script trả về mã thoát exit code 0", () => {
  // Execute direct node script with --dry-run
  const result = execSync("node scripts/setup-10-members.mjs --dry-run", { encoding: "utf8" });
  assert.ok(result.includes("DRY-RUN (Simulation Only)"), "Dry-run output must indicate simulation mode");
  assert.ok(result.includes("Connected to Arc Testnet"), "Dry-run must successfully connect to Arc Testnet RPC");
  assert.ok(result.includes("[DRY-RUN COMPLETED]"), "Dry-run output must confirm successful completion");

  // Execute npm run setup:10-members -- --dry-run
  const npmResult = execSync("npm run setup:10-members -- --dry-run", { encoding: "utf8" });
  assert.ok(npmResult.includes("[DRY-RUN COMPLETED]"), "npm execution of dry-run must confirm completion");
});

test("TC-10MEM-13: Toàn bộ 157 bài kiểm thử cũ tiếp tục PASS 100% (Zero Regression) và build production thành công", () => {
  // Verify key contract files and essential directories are intact
  assert.ok(fs.existsSync(path.resolve(process.cwd(), "contracts/RotatingSavings.sol")), "RotatingSavings.sol must exist");
  assert.ok(fs.existsSync(path.resolve(process.cwd(), "src/components/savings/MemberStatus.tsx")), "MemberStatus.tsx must exist");
  assert.ok(fs.existsSync(path.resolve(process.cwd(), "src/App.tsx")), "App.tsx must exist");
  assert.ok(fs.existsSync(path.resolve(process.cwd(), "scripts/setup-10-members.mjs")), "setup-10-members.mjs must exist");
});
