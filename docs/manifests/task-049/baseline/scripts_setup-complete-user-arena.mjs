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

const artifactPath = path.join(
  projectRoot,
  "contracts/out/RotatingSavings.sol/RotatingSavings.json"
);

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const ROTATING_SAVINGS_ABI = artifact.abi;
const ROTATING_SAVINGS_BYTECODE = artifact.bytecode?.object || artifact.bytecode;

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

async function sendTx(txFunc, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const tx = await txFunc();
      const receipt = await tx.wait();
      return receipt;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = attempt * 1200;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function main() {
  console.log(`
===============================================================================
  🥊 TONTINE — 10-MEMBER PERFECT ARENA (YOU = MEMBER #1 + 9 BOTS)
===============================================================================
  Network:             Arc Testnet (Chain ID: ${ARC_CHAIN_ID})
  RPC URL:             ${ARC_RPC_URL}
  USDC Token:          ${USDC_ADDRESS}
  Contribution:        0.10 USDC / member / round
  Round Duration:      86,400s (24 hours per round)
===============================================================================`);

  const provider = new ethers.JsonRpcProvider(ARC_RPC_URL, {
    chainId: ARC_CHAIN_ID,
    name: "arc-testnet",
  });

  const coordinatorPath = path.join(__dirname, ".coordinator-wallet.json");
  const coordinatorData = JSON.parse(fs.readFileSync(coordinatorPath, "utf8"));
  const userWallet = new ethers.Wallet(coordinatorData.privateKey, provider);

  const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, userWallet);

  const nativeBalance = await provider.getBalance(userWallet.address);
  const usdcBalance = await usdcContract.balanceOf(userWallet.address);

  console.log(`👤 User / Coordinator Wallet: ${userWallet.address}`);
  console.log(`   Native Gas Balance:         ${formatNative(nativeBalance)} Arc`);
  console.log(`   USDC Balance:               ${formatUsdc(usdcBalance)} USDC`);

  const contributionAmount = 100000n; // 0.10 USDC
  const botBidAmount = 50000n; // 0.05 USDC
  const gasPerBot = ethers.parseEther("0.02"); // 0.02 Arc
  const usdcPerBot = 300000n; // 0.30 USDC (for round 1 + round 2 + bid)

  // Step 1: Deploy new RotatingSavings contract
  console.log(`\n🚀 Step 1: Triển khai Smart Contract phòng hụi mới (chu kỳ 24h)...`);
  const factory = new ethers.ContractFactory(ROTATING_SAVINGS_ABI, ROTATING_SAVINGS_BYTECODE, userWallet);
  const deployTx = await factory.deploy(
    USDC_ADDRESS,
    contributionAmount,
    10n,
    86400n, // 24 hours per round
    "Tontine 10-Member Arena"
  );
  await deployTx.waitForDeployment();
  const groupAddress = await deployTx.getAddress();
  const clubContract = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, userWallet);
  console.log(`✅ Đã tạo phòng hụi mới tại: ${groupAddress}`);

  // Step 2: Member #1 (YOU) joins group FIRST!
  console.log(`\n🤝 Step 2: Ví của bạn (${userWallet.address.slice(0, 10)}...) gia nhập phòng làm Thành viên #1...`);
  await sendTx(() => clubContract.joinGroup());
  console.log(`✅ BẠN ĐÃ LÀ THÀNH VIÊN CHÍNH THỨC (Member #1/10)!`);

  // Step 3: Generate 9 burner bots
  console.log(`\n🔑 Step 3: Khởi tạo 9 ví bot thành viên...`);
  const bots = [];
  for (let i = 0; i < 9; i++) {
    const bot = ethers.Wallet.createRandom().connect(provider);
    bots.push(bot);
    console.log(`   [Bot #${i + 1}] ${bot.address}`);
  }

  // Step 4: Sponsor gas and USDC to 9 bots
  console.log(`\n💸 Step 4: Cấp phát gas và USDC cho 9 bot...`);
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    process.stdout.write(`   Cấp vốn cho Bot #${i + 1}... `);
    await sendTx(() => userWallet.sendTransaction({ to: b.address, value: gasPerBot }));
    await sendTx(() => usdcContract.transfer(b.address, usdcPerBot));
    console.log(`OK!`);
  }
  console.log(`✅ 9 ví bot đã nhận đủ gas và USDC.`);

  // Step 5: 9 bots join group -> FULL 10/10!
  console.log(`\n🤝 Step 5: 9 ví bot tiến hành tham gia phòng (joinGroup)...`);
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    const bClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, b);
    process.stdout.write(`   Bot #${i + 1} tham gia... `);
    await sendTx(() => bClub.joinGroup());
    console.log(`Joined! (${i + 2}/10)`);
  }
  console.log(`✅ PHÒNG ĐÃ ĐỦ 10/10 THÀNH VIÊN (1 BẠN + 9 BOT)!`);

  // Step 6: Start Rounds!
  console.log(`\n🎯 Step 6: Kích hoạt Vòng 1 (startRounds)...`);
  await sendTx(() => clubContract.startRounds());
  console.log(`✅ VÒNG 1 ĐÃ CHÍNH THỨC BẮT ĐẦU (ACTIVE)!`);

  // Step 7: All 9 bots contribute for Round 1
  console.log(`\n💰 Step 7: Cả 9 bot tự động đóng tiền 0.10 USDC cho Vòng 1...`);
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    const bUsdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, b);
    const bClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, b);
    process.stdout.write(`   Bot #${i + 1} đóng tiền... `);
    await sendTx(() => bUsdc.approve(groupAddress, contributionAmount * 20n));
    await sendTx(() => bClub.contribute(1n));
    console.log(`Contributed! (${i + 1}/9 bots)`);
  }
  console.log(`✅ 9/9 bot đã hoàn tất đóng tiền 0.10 USDC.`);

  // Step 8: Bot #1 places baseline bid of 0.05 USDC
  console.log(`\n🤖 Step 8: Bot #1 đặt giá sàn tượng trưng 0.05 USDC...`);
  const b1Usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, bots[0]);
  const b1Club = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, bots[0]);
  await sendTx(() => b1Usdc.approve(groupAddress, botBidAmount));
  await sendTx(() => b1Club.placeBid(1n, botBidAmount));
  console.log(`✅ Bot #1 đã đặt bid 0.05 USDC.`);

  const appUrl = `http://localhost:5173/?group=${groupAddress}`;

  console.log(`
===============================================================================
  🎉 PHÒNG HỤI 10 NGƯỜI ĐÃ SẴN SÀNG 100% ĐỂ BẠN THỬ NGHIỆM!
===============================================================================
  Địa chỉ phòng:      ${groupAddress}
  Tên phòng:          Tontine 10-Member Arena
  Thành viên:         10 / 10 (Bạn là Member #1 + 9 Bot)
  Trạng thái:         VÒNG 1 ĐANG ACTIVE
  Tiến độ:            9/10 thành viên đã đóng (chỉ chờ bạn đóng!)
  Giá bid hiện tại:   0.05 USDC (do Bot #1 đặt)

  👉 VUI LÒNG MỞ LIÊN KẾT NÀY TRÊN TRÌNH DUYỆT ĐỂ BẮT ĐẦU:
     ${appUrl}
===============================================================================
`);

  // Step 9: Background watcher for Round 1 settlement -> auto-trigger 9 bots for Round 2!
  console.log(`⏳ Bot watcher đang chạy ngầm: Khi bạn đóng tiền, đặt bid và tất toán Vòng 1, các bot sẽ tự động đóng tiền Vòng 2 để bạn test Đóng Hụi Chết!`);

  while (true) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const round1 = await clubContract.getRoundSummary(1n);
      if (round1.settled) {
        console.log(`\n🏆 VÒNG 1 ĐÃ ĐƯỢC TẤT TOÁN THÀNH CÔNG!`);
        console.log(`   Người chiến thắng Vòng 1: ${round1.winner}`);
        console.log(`   Tổng Pot: ${formatUsdc(round1.totalPot)} USDC`);
        console.log(`👉 BẠN HÃY BẤM "RÚT TIỀN" (CLAIM PAYOUT) TRÊN WEB UI ĐỂ RÚT TIỀN VỀ VÍ!`);

        console.log(`\n💰 Vòng 2 bắt đầu! 9 bot chuẩn bị đóng tiền Vòng 2...`);
        await new Promise((r) => setTimeout(r, 4000));
        for (let i = 0; i < bots.length; i++) {
          const b = bots[i];
          const bClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, b);
          process.stdout.write(`   Bot #${i + 1} đóng tiền Vòng 2... `);
          try {
            await sendTx(() => bClub.contribute(2n));
            console.log(`Contributed!`);
          } catch (e) {
            console.log(`Skipped or done: ${e.message}`);
          }
        }
        console.log(`✅ 9 bot đã đóng tiền Vòng 2.`);
        console.log(`👉 BẠN LÀ NGƯỜI THẮNG VÒNG 1 (HỤI CHẾT): HÃY BẤM "ĐÓNG HỤI CHẾT (0.10 USDC)" TRÊN WEB UI ĐỂ KIỂM TRA TÍNH NĂNG!`);
        break;
      }
    } catch {
      // ignore
    }
  }

  console.log(`\n🎉 SETUP ARENA HOÀN TẤT TRỌN VẸN. CHÚC BẠN TEST THÀNH CÔNG!`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
