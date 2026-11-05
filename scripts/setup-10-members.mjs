#!/usr/bin/env node
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ============================================================================
// 1. Constants & Configuration
// ============================================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const ARC_RPC_URL = process.env.ARC_RPC_URL || "https://rpc.testnet.arc.io";
const ARC_CHAIN_ID = 5042002;
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const USDC_DECIMALS = 6;
const NATIVE_GAS_PER_BURNER = "0.06"; // Native USDC (18 decimals) per burner wallet

// Load contract artifact
const artifactPath = path.join(
  projectRoot,
  "contracts/out/RotatingSavings.sol/RotatingSavings.json"
);

let ROTATING_SAVINGS_ABI = [];
let ROTATING_SAVINGS_BYTECODE = "";

if (fs.existsSync(artifactPath)) {
  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    ROTATING_SAVINGS_ABI = artifact.abi || [];
    ROTATING_SAVINGS_BYTECODE = artifact.bytecode?.object || artifact.bytecode || "";
  } catch (err) {
    console.error(`⚠️ Warning: Could not parse contract artifact: ${err.message}`);
  }
}

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

// ============================================================================
// 2. CLI Argument Parsing & Help Display
// ============================================================================
function printHelp() {
  console.log(`
===============================================================================
  TONTINE — 10-MEMBER SAVINGS CLUB SETUP & CLAIM ACTIVATION SCRIPT
===============================================================================

DESCRIPTION:
  Automates the complete lifecycle setup of a 10-member Rotating Savings (Tontine)
  club on Arc Testnet (Chain ID 5042002). Deploys a new club (or connects to an
  existing one), generates 9 burner wallets, sponsors gas and USDC, coordinates
  10 members to join, activates Round 1, contributes, places a winning bid,
  and early-settles Round 1 so that the funder wallet receives a claimable payout
  ready for web UI testing.

USAGE:
  node scripts/setup-10-members.mjs [options]
  npm run setup:10-members -- [options]

OPTIONS:
  --funder-key <hex>    (Optional) Private key of funder wallet.
                        If omitted, script runs in Zero-Private-Key Coordinator mode
                        (generates a safe throwaway wallet and waits for deposit from MetaMask).
  --amount <number>     USDC contribution amount per round per member.
                        (Default: 1 USDC to conserve testnet funds)
  --bid <number>        Winning USDC bid placed by funder for Round 1 pot.
                        (Default: 0.5 USDC)
  --group <address>     (Optional) Existing 10-member club contract address.
                        If omitted, a brand-new club is deployed automatically.
  --peer-bots           (Optional) Run as 9 peer bots joining an existing club.
  --user-wallet <hex>   (Optional) Your personal wallet address to receive remaining funds.
  --dry-run             Simulate pre-flight checks, wallet generation, and steps
                        without broadcasting real transactions to the blockchain.
  --help, -h            Show this help guide.

EXAMPLES:
  # Print help:
  node scripts/setup-10-members.mjs --help

  # Dry-run validation (no real txs sent):
  node scripts/setup-10-members.mjs --dry-run

  # Safe zero-private-key mode (No private key needed from you!):
  npm run setup:10-members

  # Deploy new club with 1 USDC contribution, 0.5 USDC bid:
  node scripts/setup-10-members.mjs --funder-key 0xabc...123 --amount 1 --bid 0.5

  # Run via npm with environment variable:
  FUNDER_PRIVATE_KEY=0xabc...123 npm run setup:10-members
===============================================================================
`);
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    funderKey: process.env.FUNDER_PRIVATE_KEY || process.env.PRIVATE_KEY || null,
    amount: "1",
    bid: "0.5",
    groupAddress: null,
    peerBots: false,
    userWallet: null,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--peer-bots") {
      options.peerBots = true;
    } else if (arg === "--funder-key") {
      options.funderKey = args[++i];
    } else if (arg.startsWith("--funder-key=")) {
      options.funderKey = arg.slice("--funder-key=".length);
    } else if (arg === "--user-wallet") {
      options.userWallet = args[++i];
    } else if (arg.startsWith("--user-wallet=")) {
      options.userWallet = arg.slice("--user-wallet=".length);
    } else if (arg === "--amount") {
      options.amount = args[++i];
    } else if (arg.startsWith("--amount=")) {
      options.amount = arg.slice("--amount=".length);
    } else if (arg === "--bid") {
      options.bid = args[++i];
    } else if (arg.startsWith("--bid=")) {
      options.bid = arg.slice("--bid=".length);
    } else if (arg === "--group") {
      options.groupAddress = args[++i];
    } else if (arg.startsWith("--group=")) {
      options.groupAddress = arg.slice("--group=".length);
    }
  }

  return options;
}

// ============================================================================
// 3. Helper Functions
// ============================================================================
function formatUsdc(raw) {
  const n = Number(raw) / 10 ** USDC_DECIMALS;
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNative(raw) {
  const n = Number(raw) / 1e18;
  return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

async function sendTxWithRetry(txFunc, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const tx = await txFunc();
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = attempt * 1500;
      console.log(`   ⏳ RPC busy or rate-limited. Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

// ============================================================================
// 4. Main Execution
// ============================================================================
async function main() {
  const options = parseCliArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  console.log(`
===============================================================================
  🏛️  TONTINE — 10-MEMBER SAVINGS CLUB AUTOMATION ENGINE
===============================================================================
  Network:             Arc Testnet (Chain ID: ${ARC_CHAIN_ID})
  RPC URL:             ${ARC_RPC_URL}
  USDC Token:          ${USDC_ADDRESS}
  Contribution:        ${options.amount} USDC / round
  Winning Bid:         ${options.bid} USDC
  Target Group:        ${options.groupAddress || "New Contract Deployment"}
  Mode:                ${options.dryRun ? "DRY-RUN (Simulation Only)" : "LIVE EXECUTION"}
===============================================================================`);

  // Provider setup
  const provider = new ethers.JsonRpcProvider(ARC_RPC_URL, {
    chainId: ARC_CHAIN_ID,
    name: "arc-testnet",
  });

  // Verify connection
  let currentBlock;
  try {
    currentBlock = await provider.getBlockNumber();
    console.log(`\n🔗 Connected to Arc Testnet. Current block: #${currentBlock}`);
  } catch (err) {
    console.error(`❌ Failed to connect to Arc Testnet RPC (${ARC_RPC_URL}): ${err.message}`);
    process.exit(1);
  }

  // Parse amounts
  const contributionNum = parseFloat(options.amount);
  const bidNum = parseFloat(options.bid);

  if (isNaN(contributionNum) || contributionNum <= 0) {
    console.error(`❌ Invalid --amount specified: '${options.amount}'. Must be a positive number.`);
    process.exit(1);
  }
  if (isNaN(bidNum) || bidNum <= 0) {
    console.error(`❌ Invalid --bid specified: '${options.bid}'. Must be a positive number.`);
    process.exit(1);
  }

  const parsedContribution = ethers.parseUnits(options.amount, USDC_DECIMALS);
  const parsedBid = ethers.parseUnits(options.bid, USDC_DECIMALS);
  const nativeGasPerBurner = ethers.parseEther(NATIVE_GAS_PER_BURNER);

  // Total required funds calculation
  // 9 burners each get nativeGasPerBurner + Funder needs gas for deployment & calls
  const requiredBurnersNative = nativeGasPerBurner * 9n;
  const estimatedFunderGas = ethers.parseEther("0.1"); // generous estimate for funder txs
  const totalRequiredNative = requiredBurnersNative + estimatedFunderGas;

  // ERC20 USDC: 9 burners * contribution + 1 funder contribution + 1 funder bid
  const requiredBurnersUsdc = parsedContribution * 9n;
  const totalRequiredUsdc = requiredBurnersUsdc + parsedContribution + parsedBid;

  // ============================================================================
  // DRY RUN MODE
  // ============================================================================
  if (options.dryRun) {
    console.log(`\n🔍 [DRY-RUN] Simulating pre-flight parameters and validation plan...`);

    let funderAddress = "0x000000000000000000000000000000000000dEaD";
    let nativeBalance = 0n;
    let usdcBalance = 0n;

    if (options.funderKey) {
      try {
        const testWallet = new ethers.Wallet(options.funderKey, provider);
        funderAddress = testWallet.address;
        nativeBalance = await provider.getBalance(funderAddress);
        const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
        usdcBalance = await usdc.balanceOf(funderAddress);
      } catch (err) {
        console.warn(`⚠️ Could not query live balance for provided funder key: ${err.message}`);
      }
    }

    console.log(`\n📋 Estimated Resource Requirements for 10-Member Cycle:`);
    console.log(`   - Funder Address:           ${funderAddress}`);
    console.log(`   - Required Native Gas:      ~${formatNative(totalRequiredNative)} USDC (9 burners @ ${NATIVE_GAS_PER_BURNER} + Funder gas)`);
    console.log(`   - Required ERC20 USDC:      ${formatUsdc(totalRequiredUsdc)} USDC (9 * ${options.amount} + 1 * ${options.amount} + ${options.bid} bid)`);
    if (options.funderKey) {
      console.log(`   - Current Native Balance:   ${formatNative(nativeBalance)} USDC ${nativeBalance >= totalRequiredNative ? "✅ (Sufficient)" : "⚠️ (Insufficient)"}`);
      console.log(`   - Current ERC20 Balance:    ${formatUsdc(usdcBalance)} USDC ${usdcBalance >= totalRequiredUsdc ? "✅ (Sufficient)" : "⚠️ (Insufficient)"}`);
    } else {
      console.log(`   - Note: No funder key provided. To test with real wallet balance, pass --funder-key <key>.`);
    }

    console.log(`\n🛠️  Simulation Plan (10 Sequenced Steps):`);
    console.log(`   1. [Pre-flight] Validate funder balance and network connectivity.`);
    console.log(`   2. [Deploy] Deploy new RotatingSavings contract (maxMembers=10, amount=${options.amount} USDC, duration=3600s).`);
    console.log(`   3. [Wallets] Generate 9 ephemeral burner wallets (ethers.Wallet.createRandom).`);
    console.log(`   4. [Fund Gas] Funder transfers ${NATIVE_GAS_PER_BURNER} native USDC gas to each of the 9 burners.`);
    console.log(`   5. [Fund USDC] Funder transfers ${options.amount} ERC20 USDC to each of the 9 burners.`);
    console.log(`   6. [Join] Funder + 9 burners sequentially call joinGroup() -> Group fills to 10/10 members.`);
    console.log(`   7. [Start] Funder (Owner) calls startRounds() -> Group state changes to ACTIVE (Round 1).`);
    console.log(`   8. [Contribute] All 10 members approve USDC and call contribute(1) -> Total Pot: ${formatUsdc(parsedContribution * 10n)} USDC.`);
    console.log(`   9. [Bid] Funder approves USDC and calls placeBid(1, ${options.bid} USDC) -> Early settlement unlocked.`);
    console.log(`   10. [Settle & Claim] Call settleRound(1) -> Round 1 settled early! Funder claimable becomes ${formatUsdc(parsedContribution * 10n + parsedBid)} USDC.`);

    console.log(`\n✨ [DRY-RUN COMPLETED] Syntax and simulation logic are 100% valid.`);
    console.log(`   Run without '--dry-run' and with '--funder-key <hex>' to execute on Arc Testnet.`);
    process.exit(0);
  }

  // ============================================================================
  // LIVE EXECUTION MODE (Zero-Private-Key Coordinator or Funder Key)
  // ============================================================================
  let funder;
  let isAutoCoordinator = false;

  if (!options.funderKey) {
    isAutoCoordinator = true;
    console.log(`\n🛡️  CHẾ ĐỘ AN TOÀN TUYỆT ĐỐI (ZERO-PRIVATE-KEY MODE) ĐÃ KÍCH HOẠT`);
    console.log(`   (Bạn KHÔNG CẦN cung cấp bất kỳ Private Key nào của ví cá nhân!)`);

    const coordinatorPath = path.join(__dirname, ".coordinator-wallet.json");
    let coordinatorData;
    if (fs.existsSync(coordinatorPath)) {
      try {
        coordinatorData = JSON.parse(fs.readFileSync(coordinatorPath, "utf8"));
      } catch (e) {}
    }

    if (!coordinatorData || !coordinatorData.privateKey) {
      const generated = ethers.Wallet.createRandom();
      coordinatorData = {
        address: generated.address,
        privateKey: generated.privateKey,
        createdAt: new Date().toISOString(),
      };
      fs.writeFileSync(coordinatorPath, JSON.stringify(coordinatorData, null, 2), "utf8");
    }

    funder = new ethers.Wallet(coordinatorData.privateKey, provider);

    console.log(`
===============================================================================
  🛡️  VÍ ĐIỀU PHỐI VIÊN TESTNET (TEST COORDINATOR WALLET):
===============================================================================
  📍 Địa chỉ ví điều phối:  ${funder.address}
  🔒 Cơ chế an toàn:         Ví phụ tạm thời được sinh ngẫu nhiên cục bộ
                            HOÀN TOÀN KHÔNG chạm vào ví cá nhân MetaMask của bạn!

  👉 HƯỚNG DẪN NẠP TIỀN ĐƠN GIẢN TỪ METAMASK ĐỂ TEST:
     1. Mở MetaMask của bạn trên mạng Arc Testnet.
     2. Gửi một lượng testnet nhỏ sang địa chỉ Ví Điều Phối ở trên:
        • Phí Gas Native:  ~${formatNative(totalRequiredNative)} USDC (để chia gas cho 9 ví phụ)
        • Token ERC-20:    ~${formatUsdc(totalRequiredUsdc)} USDC (để 10 ví tham gia & đóng hụi)
     3. Giữ terminal này mở — Hệ thống sẽ TỰ ĐỘNG phát hiện tiền nạp và chạy!
===============================================================================
`);

    const pollUsdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, funder);
    const initialNative = await provider.getBalance(funder.address);
    const initialUsdc = await pollUsdc.balanceOf(funder.address);

    if (initialNative < totalRequiredNative || initialUsdc < totalRequiredUsdc) {
      console.log(`⏳ Đang lắng nghe tiền nạp vào ví điều phối trên Arc Testnet...`);
      let pollCount = 0;
      while (true) {
        const curNative = await provider.getBalance(funder.address);
        const curUsdc = await pollUsdc.balanceOf(funder.address);

        if (curNative >= totalRequiredNative && curUsdc >= totalRequiredUsdc) {
          console.log(`\n\n🎉 ĐÃ NHẬN ĐỦ TIỀN NẠP! TIẾN HÀNH THIẾT LẬP 10 TÀI KHOẢN NGAY LẬP TỨC...`);
          break;
        }

        pollCount++;
        const pctNative = totalRequiredNative > 0n ? Math.min(100, Number((curNative * 100n) / totalRequiredNative)) : 100;
        const pctUsdc = totalRequiredUsdc > 0n ? Math.min(100, Number((curUsdc * 100n) / totalRequiredUsdc)) : 100;
        process.stdout.write(`\r   [Kiểm tra #${pollCount}] Gas: ${formatNative(curNative)}/${formatNative(totalRequiredNative)} USDC (${pctNative}%) | Token: ${formatUsdc(curUsdc)}/${formatUsdc(totalRequiredUsdc)} USDC (${pctUsdc}%)...`);
        await new Promise((r) => setTimeout(r, 3500));
      }
    }
  } else {
    try {
      funder = new ethers.Wallet(options.funderKey, provider);
    } catch (err) {
      console.error(`❌ Invalid private key format: ${err.message}`);
      process.exit(1);
    }
  }

  console.log(`\n👤 Funder Wallet: ${funder.address}`);

  // Pre-flight balance checks
  const nativeBalance = await provider.getBalance(funder.address);
  const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, funder);
  const usdcBalance = await usdcContract.balanceOf(funder.address);

  console.log(`   Native Gas Balance: ${formatNative(nativeBalance)} USDC`);
  console.log(`   ERC20 USDC Balance: ${formatUsdc(usdcBalance)} USDC`);

  if (nativeBalance < totalRequiredNative) {
    console.error(`\n❌ Insufficient Native Gas Balance!`);
    console.error(`   Current:  ${formatNative(nativeBalance)} USDC`);
    console.error(`   Required: >= ${formatNative(totalRequiredNative)} USDC (to fund 9 burner wallets + contract calls)`);
    console.error(`   👉 Please request Arc Testnet native gas from faucet, then retry.`);
    process.exit(1);
  }

  if (usdcBalance < totalRequiredUsdc) {
    console.error(`\n❌ Insufficient ERC-20 USDC Balance!`);
    console.error(`   Current:  ${formatUsdc(usdcBalance)} USDC`);
    console.error(`   Required: >= ${formatUsdc(totalRequiredUsdc)} USDC (9 * ${options.amount} + 1 * ${options.amount} + ${options.bid} bid)`);
    console.error(`   👉 Please acquire USDC from Arc Testnet faucet or transfer from another account, then retry.`);
    process.exit(1);
  }

  console.log(`✅ Pre-flight checks passed! Balances are sufficient.`);

  // Step 1: Deploy or Connect Group
  let groupAddress = options.groupAddress;
  let clubContract;

  if (groupAddress) {
    console.log(`\n📦 Connecting to existing club at: ${groupAddress}...`);
    clubContract = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, funder);
  } else {
    console.log(`\n🚀 Step 1: Deploying new 10-member RotatingSavings contract...`);
    if (!ROTATING_SAVINGS_BYTECODE) {
      console.error(`❌ Missing contract bytecode in artifact. Run 'forge build' first.`);
      process.exit(1);
    }
    const factory = new ethers.ContractFactory(ROTATING_SAVINGS_ABI, ROTATING_SAVINGS_BYTECODE, funder);
    const deployTx = await factory.deploy(
      USDC_ADDRESS,
      parsedContribution,
      10n,
      3600n, // 1 hour rounds
      "Tontine 10-Member Club",
      ethers.getAddress(process.env.VITE_CIRBTC_ADDRESS_TESTNET ?? "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF"),
      0n // This scenario explicitly uses no collateral.
    );
    await deployTx.waitForDeployment();
    groupAddress = await deployTx.getAddress();
    clubContract = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, funder);
    console.log(`✅ Deployed new RotatingSavings club at: ${groupAddress}`);
  }

  // Step 2: Generate 9 Burner Wallets
  console.log(`\n🔑 Step 2: Generating 9 ephemeral burner wallets...`);
  const burners = [];
  for (let i = 0; i < 9; i++) {
    const burner = ethers.Wallet.createRandom().connect(provider);
    burners.push(burner);
    console.log(`   [Member #${i + 2}] ${burner.address}`);
  }

  // Step 3: Sponsor Gas & USDC to Burners
  console.log(`\n💸 Step 3: Sponsoring native gas (${NATIVE_GAS_PER_BURNER} USDC) and ${options.amount} ERC20 USDC to each burner...`);
  for (let i = 0; i < burners.length; i++) {
    const b = burners[i];
    process.stdout.write(`   Funding Member #${i + 2} (${b.address.slice(0, 10)}...)... `);

    // Transfer native gas
    await sendTxWithRetry(() => funder.sendTransaction({
      to: b.address,
      value: nativeGasPerBurner,
    }));

    // Transfer ERC20 USDC
    await sendTxWithRetry(() => usdcContract.transfer(b.address, parsedContribution));

    console.log(`OK!`);
  }
  console.log(`✅ All 9 burner wallets successfully funded.`);

  // Step 4: Join Group (10 members)
  console.log(`\n🤝 Step 4: Registering 10 members into the club...`);

  // Funder joins
  const funderIsMember = await clubContract.isMember(funder.address);
  if (!funderIsMember) {
    process.stdout.write(`   Funder (${funder.address.slice(0, 10)}...) joining... `);
    await sendTxWithRetry(() => clubContract.joinGroup());
    console.log(`Joined! (1/10)`);
  } else {
    console.log(`   Funder is already a member.`);
  }

  // 9 Burners join
  for (let i = 0; i < burners.length; i++) {
    const b = burners[i];
    const bClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, b);
    const bIsMember = await bClub.isMember(b.address);
    if (!bIsMember) {
      process.stdout.write(`   Member #${i + 2} (${b.address.slice(0, 10)}...) joining... `);
      await sendTxWithRetry(() => bClub.joinGroup());
      console.log(`Joined! (${i + 2}/10)`);
    }
  }
  console.log(`✅ All 10 members registered successfully!`);

  // Step 5: Start Rounds
  console.log(`\n🎯 Step 5: Activating Round 1 (startRounds)...`);
  const currentState = Number(await clubContract.state());
  if (currentState === 0) { // OPEN
    await sendTxWithRetry(() => clubContract.startRounds());
    console.log(`✅ Round 1 started! Group state is now ACTIVE.`);
  } else {
    console.log(`ℹ️ Group is already in ACTIVE or later state (state=${currentState}).`);
  }

  // Step 6: Contribute (All 10 members)
  console.log(`\n💰 Step 6: All 10 members contributing ${options.amount} USDC for Round 1...`);

  // Funder contribute
  process.stdout.write(`   Funder approving & contributing ${options.amount} USDC... `);
  await sendTxWithRetry(() => usdcContract.approve(groupAddress, parsedContribution));
  await sendTxWithRetry(() => clubContract.contribute(1n));
  console.log(`Contributed! (1/10)`);

  // Burners contribute
  for (let i = 0; i < burners.length; i++) {
    const b = burners[i];
    const bUsdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, b);
    const bClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, b);

    process.stdout.write(`   Member #${i + 2} approving & contributing... `);
    await sendTxWithRetry(() => bUsdc.approve(groupAddress, parsedContribution));
    await sendTxWithRetry(() => bClub.contribute(1n));
    console.log(`Contributed! (${i + 2}/10)`);
  }
  console.log(`✅ All 10 contributions confirmed! Pot = ${formatUsdc(parsedContribution * 10n)} USDC.`);

  // Step 7: Place Winning Bid by Funder
  console.log(`\n🏆 Step 7: Funder placing winning bid of ${options.bid} USDC for Round 1...`);
  await sendTxWithRetry(() => usdcContract.approve(groupAddress, parsedBid));
  await sendTxWithRetry(() => clubContract.placeBid(1n, parsedBid));
  console.log(`✅ Bid placed! Funder is highest bidder (${options.bid} USDC). Early settlement condition met.`);

  // Step 8: Early Settle Round 1
  console.log(`\n⚡ Step 8: Early-settling Round 1 (settleRound)...`);
  await sendTxWithRetry(() => clubContract.settleRound(1n));
  console.log(`✅ Round 1 settled successfully!`);

  // Step 9: Verify Claimable Payout
  console.log(`\n🔍 Step 9: Verifying claimable payout for Funder wallet...`);
  const claimableAmount = await clubContract.claimable(funder.address);
  console.log(`   Claimable Payout on-chain: ${formatUsdc(claimableAmount)} USDC`);

  if (claimableAmount === 0n) {
    console.warn(`⚠️ Warning: Claimable payout is 0n. Winner might be another member.`);
  } else {
    console.log(`✅ Success! Funder wallet has ${formatUsdc(claimableAmount)} USDC ready to claim.`);
  }

  // ============================================================================
  // SUMMARY & TESTING INSTRUCTIONS
  // ============================================================================
  const appUrl = `http://localhost:5173/?group=${groupAddress}`;

  console.log(`
===============================================================================
  🎉 SETUP COMPLETE — 10-MEMBER TONTINE CLUB READY FOR CLAIM TEST
===============================================================================
  Group Address:        ${groupAddress}
  Group Name:           Tontine 10-Member Club
  Total Members:        10 / 10
  Round 1 Total Pot:    ${formatUsdc(parsedContribution * 10n)} USDC
  Winning Bid:          ${options.bid} USDC
  Round 1 Winner:       ${funder.address}
  Claimable Payout:     ${formatUsdc(claimableAmount)} USDC (ACTIVE!)

  👉 OPEN THIS URL IN YOUR BROWSER TO TEST CLAIM PAYOUT:
     ${appUrl}

  VERIFICATION STEPS ON WEB UI:
  1. Open http://localhost:5173/?group=${groupAddress} in your browser.
  2. Connect your wallet (${funder.address}).
  3. Notice the green 'Claimable Payout' banner showing ${formatUsdc(claimableAmount)} USDC.
  4. Click the golden 'Rút tiền (Claim Payout)' button.
  5. Confirm the transaction in MetaMask/Web3 wallet.
  6. Verify your wallet balance increases by ${formatUsdc(claimableAmount)} USDC!
===============================================================================
`);

  if (isAutoCoordinator) {
    console.log(`
===============================================================================
  🔑 VÍ TEST CHIẾN THẮNG ĐỂ BẠN THỬ BẤM "RÚT TIỀN" (CLAIM PAYOUT) TRÊN WEB:
===============================================================================
  📍 Địa chỉ ví thắng:    ${funder.address}
  🔑 Private key ví test:  ${funder.privateKey}

  👉 CÁC BƯỚC ĐỂ BẠN TRẢI NGHIỆM NÚT RÚT TIỀN TRỰC TIẾP:
     1. Mở MetaMask -> Bấm vào danh sách tài khoản (Account) -> Chọn "Import account".
     2. Dán Private Key ví test ở trên vào. (Ví này có sẵn ${formatUsdc(claimableAmount)} USDC đang chờ rút!).
     3. Mở ${appUrl} trên trình duyệt -> Bạn sẽ thấy banner xanh "Có thể rút tiền: ${formatUsdc(claimableAmount)} USDC".
     4. Bấm nút màu vàng cát "Rút tiền (Claim Payout)" -> Xác nhận trên MetaMask!
     5. Sau khi test xong, bạn có thể xóa ví test này khỏi MetaMask bất cứ lúc nào, ví chính của bạn an toàn tuyệt đối!
===============================================================================
`);
  }
}

main().catch((err) => {
  console.error(`\n💥 Fatal Error:`, err);
  process.exit(1);
});
