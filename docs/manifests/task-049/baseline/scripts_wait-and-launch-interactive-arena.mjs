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
      const delay = attempt * 1500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

async function main() {
  console.log(`
===============================================================================
  🥊 TONTINE — 10-MEMBER INTERACTIVE ARENA (AUTONOMOUS WATCHER)
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
  const coordinator = new ethers.Wallet(coordinatorData.privateKey, provider);

  const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, coordinator);

  const requiredGas = ethers.parseEther("0.25");
  const requiredUsdc = 1500000n; // 1.5 USDC

  console.log(`👤 Coordinator Wallet: ${coordinator.address}`);
  console.log(`   Yêu cầu tối thiểu:  >= 0.25 Arc Gas | >= 1.50 USDC`);

  // Polling loop waiting for user deposit
  let depositReady = false;
  let checkCount = 0;

  while (!depositReady) {
    const curGas = await provider.getBalance(coordinator.address);
    const curUsdc = await usdcContract.balanceOf(coordinator.address);
    checkCount++;

    if (curGas >= requiredGas && curUsdc >= requiredUsdc) {
      console.log(`\n🎉 ĐÃ NHẬN ĐƯỢC TIỀN NẠP THÀNH CÔNG!`);
      console.log(`   Gas hiện tại:  ${formatNative(curGas)} Arc`);
      console.log(`   USDC hiện tại: ${formatUsdc(curUsdc)} USDC`);
      depositReady = true;
      break;
    }

    process.stdout.write(`\r[Kiểm tra #${checkCount}] Đang đợi tiền nạp vào ${coordinator.address}... (Gas: ${formatNative(curGas)}/0.25 Arc | USDC: ${formatUsdc(curUsdc)}/1.50 USDC)`);
    await new Promise((r) => setTimeout(r, 3000));
  }

  const contributionAmount = 100000n; // 0.10 USDC
  const botBidAmount = 50000n; // 0.05 USDC
  const gasPerBot = ethers.parseEther("0.02"); // 0.02 Arc
  const usdcPerBot = 250000n; // 0.25 USDC (enough for round 1 + round 2 + bid)

  // Step 1: Deploy new RotatingSavings contract
  console.log(`\n🚀 Step 1: Triển khai Smart Contract phòng hụi mới (chu kỳ 24h)...`);
  const factory = new ethers.ContractFactory(ROTATING_SAVINGS_ABI, ROTATING_SAVINGS_BYTECODE, coordinator);
  const deployTx = await factory.deploy(
    USDC_ADDRESS,
    contributionAmount,
    10n,
    86400n, // 24 hours per round
    "Tontine 10-Member Arena"
  );
  await deployTx.waitForDeployment();
  const groupAddress = await deployTx.getAddress();
  const clubContract = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, coordinator);
  console.log(`✅ Đã tạo phòng hụi mới tại: ${groupAddress}`);

  // Step 2: Generate 9 burner bots & persist private keys
  console.log(`\n🔑 Step 2: Khởi tạo 9 ví bot thành viên...`);
  const bots = [];
  const botData = [];
  for (let i = 0; i < 9; i++) {
    const bot = ethers.Wallet.createRandom().connect(provider);
    bots.push(bot);
    botData.push({ index: i + 1, address: bot.address, privateKey: bot.privateKey });
    console.log(`   [Bot #${i + 1}] ${bot.address}`);
  }
  fs.writeFileSync(path.join(__dirname, ".burner-bots.json"), JSON.stringify(botData, null, 2), "utf8");

  // Step 3: Sponsor gas and USDC to 9 bots
  console.log(`\n💸 Step 3: Cấp phát gas và USDC cho 9 bot...`);
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    process.stdout.write(`   Cấp vốn cho Bot #${i + 1}... `);
    await sendTx(() => coordinator.sendTransaction({ to: b.address, value: gasPerBot }));
    await sendTx(() => usdcContract.transfer(b.address, usdcPerBot));
    console.log(`OK!`);
  }
  console.log(`✅ 9 ví bot đã nhận đủ gas và USDC.`);

  // Step 4: 9 bots join group
  console.log(`\n🤝 Step 4: 9 ví bot tiến hành tham gia phòng (joinGroup)...`);
  for (let i = 0; i < bots.length; i++) {
    const b = bots[i];
    const bClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, b);
    process.stdout.write(`   Bot #${i + 1} tham gia... `);
    await sendTx(() => bClub.joinGroup());
    console.log(`Joined! (${i + 1}/10)`);
  }
  console.log(`✅ Đã có 9/10 thành viên! Chỗ thứ 10 đang chờ BẠN tham gia trên Web UI.`);

  const appUrl = `http://localhost:5173/?group=${groupAddress}`;

  console.log(`
===============================================================================
  🎉 PHÒNG HỤI 10 NGƯỜI ĐÃ SẴN SÀNG! ĐANG ĐỢI BẠN VÀO PHÒNG
===============================================================================
  Địa chỉ phòng:      ${groupAddress}
  Tên phòng:          Tontine 10-Member Arena
  Mức đóng mỗi vòng:  0.10 USDC
  Số thành viên hiện: 9 / 10 (9 bot đã vào, còn 1 chỗ cho bạn!)
  Chu kỳ vòng:        86.400 giây (24 giờ, thoải mái thử nghiệm không lo hết hạn)

  👉 VUI LÒNG MỞ LIÊN KẾT NÀY TRÊN TRÌNH DUYỆT ĐỂ BẮT ĐẦU:
     ${appUrl}
===============================================================================
`);

  // Step 5: Watch on-chain for the 10th member (User) to join
  console.log(`⏳ Bot watcher đang lắng nghe giao dịch gia nhập từ ví của bạn (slot 10/10)...`);
  let isRoundsStarted = false;

  while (true) {
    await new Promise((r) => setTimeout(r, 2500));
    const memberCount = await getMembersCount(clubContract);

    if (!isRoundsStarted && memberCount >= 10) {
      console.log(`\n🎉 BẠN ĐÃ THAM GIA THÀNH CÔNG (10/10 THÀNH VIÊN)!`);
      console.log(`🎯 Tiến hành kích hoạt Vòng 1 (startRounds)...`);
      await sendTx(() => clubContract.startRounds());
      console.log(`✅ Vòng 1 đã chính thức bắt đầu (ACTIVE)!`);
      isRoundsStarted = true;

      // Have all 9 bots contribute for Round 1
      console.log(`\n💰 9 bot tự động Approve và Đóng tiền cho Vòng 1...`);
      for (let i = 0; i < bots.length; i++) {
        const b = bots[i];
        const bUsdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, b);
        const bClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, b);
        process.stdout.write(`   Bot #${i + 1} đóng tiền... `);
        await sendTx(() => bUsdc.approve(groupAddress, contributionAmount * 20n));
        await sendTx(() => bClub.contribute(1n));
        console.log(`Contributed! (${i + 1}/9 bots)`);
      }
      console.log(`✅ Cả 9 bot đã đóng 0.10 USDC! Bây giờ tới lượt BẠN đóng tiền trên Web UI.`);

      // Bot #1 places baseline low bid of 0.05 USDC
      console.log(`\n🤖 Bot #1 đặt giá sàn tượng trưng 0.05 USDC...`);
      const b1Usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, bots[0]);
      const b1Club = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, bots[0]);
      await sendTx(() => b1Usdc.approve(groupAddress, botBidAmount));
      await sendTx(() => b1Club.placeBid(1n, botBidAmount));
      console.log(`✅ Bot #1 đã đặt bid 0.05 USDC.`);
      console.log(`👉 BẠN HÃY ĐẶT BID >= 0.06 USDC TRÊN GIAO DIỆN ĐỂ CHIẾN THẮNG VÒNG 1!`);
      break;
    }
  }

  // Step 6: Watch for Round 1 settlement
  console.log(`\n⏳ Bot watcher đang chờ bạn đặt bid và bấm Tất toán Vòng 1...`);
  while (true) {
    await new Promise((r) => setTimeout(r, 3000));
    const round1 = await clubContract.getRoundSummary(1n);

    if (round1.settled) {
      console.log(`\n🏆 VÒNG 1 ĐÃ ĐƯỢC TẤT TOÁN THÀNH CÔNG!`);
      console.log(`   Người chiến thắng Vòng 1: ${round1.winner}`);
      console.log(`   Tổng Pot: ${formatUsdc(round1.totalPot)} USDC`);
      console.log(`👉 BẠN HÃY BẤM "RÚT TIỀN" (CLAIM PAYOUT) TRÊN WEB UI ĐỂ RÚT TIỀN VỀ VÍ!`);

      // Now Round 2 is active! All 9 bots contribute for Round 2 so User can test dead hui!
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
          console.log(`Skipped or already contributed: ${e.message}`);
        }
      }
      console.log(`✅ 9 bot đã đóng tiền Vòng 2.`);
      console.log(`👉 BẠN LÀ NGƯỜI THẮNG VÒNG 1 (HỤI CHẾT): HÃY BẤM "ĐÓNG HỤI CHẾT (0.10 USDC)" TRÊN WEB UI ĐỂ KIỂM TRA TÍNH NĂNG!`);
      break;
    }
  }

  console.log(`\n🎉 SETUP ARENA HOÀN TẤT TRỌN VẸN. CHÚC BẠN TEST THÀNH CÔNG!`);
}

async function getMembersCount(contract) {
  let count = 0;
  while (true) {
    try {
      await contract.members(count);
      count++;
    } catch {
      break;
    }
  }
  return count;
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
