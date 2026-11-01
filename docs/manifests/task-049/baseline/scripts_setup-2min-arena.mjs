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
  ⚡ TONTINE — 120-SECOND RAPID ARENA (YOU = OWNER & MEMBER #1 + 9 BOTS)
===============================================================================
  Network:             Arc Testnet (Chain ID: ${ARC_CHAIN_ID})
  RPC URL:             ${ARC_RPC_URL}
  USDC Token:          ${USDC_ADDRESS}
  Contribution:        0.10 USDC / member / round
  Round Duration:      120s (ĐÚNG 2 PHÚT MỖI VÒNG)
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
  const gasPerBot = ethers.parseEther("0.02"); // 0.02 Arc
  const usdcPerBot = 300000n; // 0.30 USDC

  // Step 1: Deploy new RotatingSavings contract with 120s duration
  console.log(`\n🚀 Step 1: Triển khai Smart Contract phòng hụi mới (chu kỳ đúng 120 giây / 2 phút)...`);
  const factory = new ethers.ContractFactory(ROTATING_SAVINGS_ABI, ROTATING_SAVINGS_BYTECODE, userWallet);
  const deployTx = await factory.deploy(
    USDC_ADDRESS,
    contributionAmount,
    10n,
    120n, // 120 SECONDS = 2 MINUTES PER ROUND
    "Tontine 2-Phút Siêu Tốc (120s)"
  );
  await deployTx.waitForDeployment();
  const groupAddress = await deployTx.getAddress();
  const clubContract = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, userWallet);
  console.log(`✅ Đã tạo phòng hụi 2 phút tại: ${groupAddress}`);

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

  // Step 5: 9 bots join group in parallel & approve USDC in parallel!
  console.log(`\n🤝 Step 5: 9 ví bot gia nhập phòng (joinGroup) và Approve USDC...`);
  await Promise.all(
    bots.map(async (b, i) => {
      const bClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, b);
      const bUsdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, b);
      await sendTx(() => bClub.joinGroup());
      await sendTx(() => bUsdc.approve(groupAddress, contributionAmount * 20n));
      console.log(`   Bot #${i + 1} đã tham gia & Approve USDC!`);
    })
  );
  console.log(`✅ PHÒNG ĐÃ ĐỦ 10/10 THÀNH VIÊN (1 BẠN + 9 BOT) VÀ ĐÃ SẴN SÀNG!`);

  const appUrl = `http://localhost:5173/?group=${groupAddress}`;

  console.log(`
===============================================================================
  🎉 PHÒNG HỤI ĐÃ SẴN SÀNG 10/10 THÀNH VIÊN (TRẠNG THÁI OPEN)!
===============================================================================
  Địa chỉ phòng:      ${groupAddress}
  Tên phòng:          Tontine 2-Phút Siêu Tốc (120s)
  Thành viên:         10 / 10 (Bạn là Chủ phòng + Member #1 + 9 Bot)
  Chu kỳ vòng:        120 giây (2 phút)
  Trạng thái:         OPEN (Chờ bạn bấm "Bắt đầu các vòng" trên Web UI)

  👉 VUI LÒNG MỞ LIÊN KẾT NÀY TRÊN TRÌNH DUYỆT:
     ${appUrl}

  💡 HƯỚNG DẪN:
     1. Mở trang web theo link trên.
     2. Bấm nút "Bắt đầu các vòng" (Start Rounds) màu vàng gold trên màn hình.
     3. 2 phút sẽ bắt đầu đếm ngược CHÍNH XÁC từ khoảnh khắc bạn bấm!
     4. Bot Daemon sẽ lập tức đóng tiền và đặt bid cho 9 bot trong 3 giây.
     5. Bạn sẽ có trọn vẹn 120 giây để đóng 0.10 USDC và đặt bid 0.06 USDC!
===============================================================================
`);

  console.log(`⏳ Bot daemon đang lắng nghe sự kiện kích hoạt Vòng 1 từ bạn trên Web UI...`);

  // Step 6: Wait for room to become ACTIVE (either via User clicking on UI or script trigger)
  let isRoundActive = false;
  while (!isRoundActive) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const state = await clubContract.state();
      if (Number(state) === 1) { // GroupState.ACTIVE
        isRoundActive = true;
        console.log(`\n🎯 PHÁT HIỆN BẠN ĐÃ BẤM "BẮT ĐẦU CÁC VÒNG"! VÒNG 1 CHÍNH THỨC BẮT ĐẦU!`);
      }
    } catch {
      // ignore
    }
  }

  // Step 7: All 9 bots contribute in parallel (super fast, ~3-4 seconds)
  console.log(`\n💰 Step 7: Cả 9 bot đồng loạt đóng tiền 0.10 USDC cho Vòng 1...`);
  await Promise.all(
    bots.map(async (b, i) => {
      try {
        const bClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, b);
        await sendTx(() => bClub.contribute(1n));
        console.log(`   Bot #${i + 1} đã đóng tiền!`);
      } catch (err) {
        console.warn(`   Bot #${i + 1} đóng tiền:`, err.message);
      }
    })
  );
  console.log(`✅ 9 bot đã hoàn tất đóng tiền 0.10 USDC.`);

  // Step 8: Bots place bids in parallel (bids from 0.01 to 0.05 USDC)
  console.log(`\n🤖 Step 8: 9 bot đặt bid nhẹ từ 0.01 đến 0.05 USDC...`);
  const botBids = [10000n, 15000n, 20000n, 25000n, 30000n, 35000n, 40000n, 45000n, 50000n];
  await Promise.all(
    bots.map(async (b, i) => {
      try {
        const bidAmount = botBids[i];
        const bClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, b);
        await sendTx(() => bClub.placeBid(1n, bidAmount));
        console.log(`   Bot #${i + 1} đã đặt bid ${formatUsdc(bidAmount)} USDC!`);
      } catch (err) {
        console.warn(`   Bot #${i + 1} đặt bid:`, err.message);
      }
    })
  );
  console.log(`✅ Các bot đã hoàn tất đặt bid. Mức bid cao nhất hiện tại của bot là 0.05 USDC.`);
  console.log(`👉 BÂY GIỜ ĐẾN LƯỢT BẠN:`);
  console.log(`   1. Bấm "Đóng góp 0.10 USDC"`);
  console.log(`   2. Nhập 0.06 USDC và bấm "Đặt giá đấu"`);
  console.log(`   3. Bấm "Kết thúc sớm" (hoặc đợi đồng hồ 2 phút về 00:00)`);
  console.log(`   4. Bấm "Rút tiền" (Claim Payout) để nhận 0.90 USDC Pot về ví!`);

  // Step 9: Background watcher for Round 1 settlement -> auto-trigger 9 bots for Round 2!
  console.log(`\n⏳ Bot watcher đang chờ Vòng 1 được tất toán để nộp tiền Vòng 2...`);

  while (true) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const round1 = await clubContract.getRoundSummary(1n);
      if (round1.settled) {
        console.log(`\n🏆 VÒNG 1 ĐÃ ĐƯỢC TẤT TOÁN THÀNH CÔNG!`);
        console.log(`   Người chiến thắng Vòng 1: ${round1.winner}`);
        console.log(`   Tổng Pot: ${formatUsdc(round1.totalPot)} USDC`);
        console.log(`👉 BẠN HÃY BẤM "RÚT TIỀN" (CLAIM PAYOUT) TRÊN WEB UI ĐỂ RÚT TIỀN VỀ VÍ!`);

        console.log(`\n💰 Vòng 2 bắt đầu! 9 bot chuẩn bị đóng tiền Vòng 2...`);
        await new Promise((r) => setTimeout(r, 4000));
        await Promise.all(
          bots.map(async (b, i) => {
            try {
              const bClub = new ethers.Contract(groupAddress, ROTATING_SAVINGS_ABI, b);
              await sendTx(() => bClub.contribute(2n));
              console.log(`   Bot #${i + 1} đã đóng tiền Vòng 2!`);
            } catch (e) {
              console.log(`   Bot #${i + 1} đóng tiền Vòng 2: ${e.message}`);
            }
          })
        );
        console.log(`✅ 9 bot đã đóng tiền Vòng 2.`);
        console.log(`👉 BẠN LÀ NGƯỜI THẮNG VÒNG 1 (HỤI CHẾT): HÃY BẤM "ĐÓNG HỤI CHẾT (0.10 USDC)" TRÊN WEB UI ĐỂ KIỂM TRA TÍNH NĂNG!`);
        break;
      }
    } catch {
      // ignore
    }
  }

  console.log(`\n🎉 SETUP ARENA 2 PHÚT HOÀN TẤT TRỌN VẸN. CHÚC BẠN TEST THÀNH CÔNG!`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
