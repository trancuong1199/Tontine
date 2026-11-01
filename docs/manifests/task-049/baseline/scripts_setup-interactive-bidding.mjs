#!/usr/bin/env node
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const ARC_RPC_URL = process.env.ARC_RPC_URL || "https://rpc.testnet.arc.io";
const ARC_CHAIN_ID = 5042002;
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const USDC_DECIMALS = 6;
const NATIVE_GAS_PER_BURNER = "0.06";

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
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

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
      console.log(`   ⏳ RPC busy. Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function main() {
  console.log(`
===============================================================================
  🥊 TONTINE — INTERACTIVE BIDDING ARENA SETUP (10 MEMBERS)
===============================================================================
  Network:             Arc Testnet (Chain ID: ${ARC_CHAIN_ID})
  RPC URL:             ${ARC_RPC_URL}
  USDC Token:          ${USDC_ADDRESS}
  Contribution:        1.00 USDC / member / round
  Bot Low Bid:         1.00 USDC (placed by Member #2)
  Target Winner:       YOU (Place bid > 1.00 USDC on Web UI to win!)
===============================================================================`);

  const provider = new ethers.JsonRpcProvider(ARC_RPC_URL, {
    chainId: ARC_CHAIN_ID,
    name: "arc-testnet",
  });

  const coordinatorPath = path.join(__dirname, ".coordinator-wallet.json");
  if (!fs.existsSync(coordinatorPath)) {
    console.error(`❌ Coordinator wallet file not found at: ${coordinatorPath}`);
    process.exit(1);
  }

  const coordinatorData = JSON.parse(fs.readFileSync(coordinatorPath, "utf8"));
  const funder = new ethers.Wallet(coordinatorData.privateKey, provider);

  console.log(`\n👤 User/Funder Wallet: ${funder.address}`);

  const nativeBalance = await provider.getBalance(funder.address);
  const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, funder);
  const usdcBalance = await usdcContract.balanceOf(funder.address);

  console.log(`   Native Gas Balance: ${formatNative(nativeBalance)} USDC`);
  console.log(`   ERC20 USDC Balance: ${formatUsdc(usdcBalance)} USDC`);

  // Parse amount from CLI or auto-detect based on balance (0.5 USDC to fit safely)
  const args = process.argv.slice(2);
  let amountStr = "0.5";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--amount" && args[i + 1]) {
      amountStr = args[i + 1];
    }
  }

  const contributionAmount = ethers.parseUnits(amountStr, USDC_DECIMALS);
  const botBidAmount = contributionAmount;
  const nativeGasPerBurner = ethers.parseEther(NATIVE_GAS_PER_BURNER);

  // Total funds check: 9 burners * amount + 1 burner * amount bid + funder amount contrib = 11 * amount
  const totalRequiredUsdc = contributionAmount * 11n;
  const totalRequiredNative = nativeGasPerBurner * 9n + ethers.parseEther("0.1");

  if (nativeBalance < totalRequiredNative || usdcBalance < totalRequiredUsdc) {
    console.error(`❌ Insufficient funds in wallet!`);
    console.error(`   Required: Gas >= ${formatNative(totalRequiredNative)}, USDC >= ${formatUsdc(totalRequiredUsdc)}`);
    process.exit(1);
  }

  console.log(`✅ Balance check passed! (Amount: ${amountStr} USDC/member, Total: ${formatUsdc(totalRequiredUsdc)} USDC). Starting setup...\n`);

  // Step 1: Deploy new RotatingSavings contract with 86400s (24 hour) rounds
  console.log(`🚀 Step 1: Deploying new 10-member RotatingSavings contract (24h round duration)...`);
  const factory = new ethers.ContractFactory(ROTATING_SAVINGS_ABI, ROTATING_SAVINGS_BYTECODE, funder);
  const deployTx = await factory.deploy(
    USDC_ADDRESS,
    contributionAmount,
    10n,
    86400n, // 1 day rounds (ample time to test without expiration)
    "Tontine 10-Member Arena"
  );
  await deployTx.waitForDeployment();
  const groupAddress = await deployTx.getAddress();
  const clubContract = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, funder);
  console.log(`✅ Deployed new contract at: ${groupAddress}`);

  // Step 2: Generate 9 burner wallets
  console.log(`\n🔑 Step 2: Generating 9 ephemeral burner wallets...`);
  const burners = [];
  for (let i = 0; i < 9; i++) {
    const burner = ethers.Wallet.createRandom().connect(provider);
    burners.push(burner);
    console.log(`   [Member #${i + 2}] ${burner.address}`);
  }

  // Step 3: Sponsor Gas & USDC to Burners
  // Burner #2 gets 2 USDC (1 for contribution + 1 for low bid)
  // Burners #3-#10 get 1 USDC each
  console.log(`\n💸 Step 3: Sponsoring gas & USDC to 9 burner wallets...`);
  for (let i = 0; i < burners.length; i++) {
    const b = burners[i];
    const amountToSend = i === 0 ? contributionAmount + botBidAmount : contributionAmount;
    process.stdout.write(`   Funding Member #${i + 2} (${b.address.slice(0, 10)}... with ${formatUsdc(amountToSend)} USDC)... `);

    // Send native gas
    await sendTxWithRetry(() => funder.sendTransaction({
      to: b.address,
      value: nativeGasPerBurner,
    }));

    // Send ERC20 USDC
    await sendTxWithRetry(() => usdcContract.transfer(b.address, amountToSend));
    console.log(`OK!`);
  }
  console.log(`✅ All 9 burner wallets funded.`);

  // Step 4: All 10 members join the group
  console.log(`\n🤝 Step 4: Registering 10 members into the club...`);
  process.stdout.write(`   Member #1 (You: ${funder.address.slice(0, 10)}...) joining... `);
  await sendTxWithRetry(() => clubContract.joinGroup());
  console.log(`Joined! (1/10)`);

  for (let i = 0; i < burners.length; i++) {
    const b = burners[i];
    const bClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, b);
    process.stdout.write(`   Member #${i + 2} (${b.address.slice(0, 10)}...) joining... `);
    await sendTxWithRetry(() => bClub.joinGroup());
    console.log(`Joined! (${i + 2}/10)`);
  }
  console.log(`✅ All 10 members joined successfully!`);

  // Step 5: Start Rounds
  console.log(`\n🎯 Step 5: Activating Round 1 (startRounds)...`);
  await sendTxWithRetry(() => clubContract.startRounds());
  console.log(`✅ Round 1 started! Group is ACTIVE.`);

  // Step 6: Contributions
  console.log(`\n💰 Step 6: All 10 members contributing 1.00 USDC for Round 1...`);
  process.stdout.write(`   Member #1 (You) approving & contributing 1.00 USDC... `);
  await sendTxWithRetry(() => usdcContract.approve(groupAddress, contributionAmount));
  await sendTxWithRetry(() => clubContract.contribute(1n));
  console.log(`Contributed! (1/10)`);

  for (let i = 0; i < burners.length; i++) {
    const b = burners[i];
    const bUsdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, b);
    const bClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, b);
    process.stdout.write(`   Member #${i + 2} approving & contributing... `);
    await sendTxWithRetry(() => bUsdc.approve(groupAddress, contributionAmount));
    await sendTxWithRetry(() => bClub.contribute(1n));
    console.log(`Contributed! (${i + 2}/10)`);
  }
  console.log(`✅ All 10 members contributed! Total Pot = 10.00 USDC.`);

  // Step 7: Burner #2 (Member #2) places LOW bid of 1.00 USDC
  console.log(`\n🤖 Step 7: Member #2 placing bot baseline bid of 1.00 USDC...`);
  const botUsdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, burners[0]);
  const botClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, burners[0]);
  await sendTxWithRetry(() => botUsdc.approve(groupAddress, botBidAmount));
  await sendTxWithRetry(() => botClub.placeBid(1n, botBidAmount));
  console.log(`✅ Member #2 placed bid of 1.00 USDC!`);

  const appUrl = `http://localhost:5173/?group=${groupAddress}`;

  console.log(`
===============================================================================
  🎉 SETUP COMPLETE — BIDDING ARENA IS LIVE FOR YOUR INTERACTION!
===============================================================================
  Group Address:        ${groupAddress}
  Group Name:           Tontine Bidding Arena
  Total Members:        10 / 10 (All contributed!)
  Total Pot Round 1:    10.00 USDC
  Current Highest Bid:  1.00 USDC (placed by Member #2: ${burners[0].address})
  Your Wallet:          ${funder.address}

  👉 MỞ ĐƯỜNG LINK NÀY ĐỂ BẮT ĐẦU ĐẤU GIÁ VÀ RÚT TIỀN:
     ${appUrl}

  📋 CÁC BƯỚC ĐỂ BẠN TỰ TAY ĐẶT GIÁ THẦU CAO NHẤT:
  1. Mở ${appUrl} trên trình duyệt.
  2. Đảm bảo ví kết nối là: ${funder.address}.
  3. Tại mục "Đặt bid để nhận pot sớm" (Bid for Pot early):
     • Nhập mức bid cao hơn 1.00 USDC (Ví dụ: 1.5 hoặc 2 USDC).
     • Bấm nút "Approve bid" (nếu cần), sau đó bấm "Đặt bid (Place Bid)".
     • Xác nhận giao dịch trên MetaMask.
  4. Sau khi đặt bid thành công, bạn sẽ trở thành người dẫn đầu!
  5. Bấm nút "Kết thúc vòng (Settle Round)" ở ngay bên dưới để chốt thắng.
  6. Banner xanh "Có thể rút tiền" sẽ hiện ra ➔ Bấm "Rút tiền (Claim Payout)"!
===============================================================================
`);
}

main().catch((err) => {
  console.error(`\n💥 Fatal Error:`, err);
  process.exit(1);
});
