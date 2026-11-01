import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RPC_URL = "https://rpc.testnet.arc.io";
const CHAIN_ID = 5042002n;
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const CIRBTC_ADDRESS = "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF";

const artifactPath = path.join(
  __dirname,
  "..",
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
  "function decimals() view returns (uint8)",
];

async function main() {
  console.log("=== BẮT ĐẦU TẠO PHÒNG HỤI CIRBTC TEST CLUB ===");
  const provider = new ethers.JsonRpcProvider(RPC_URL, {
    chainId: Number(CHAIN_ID),
    name: "arc-testnet",
  });

  const botsPath = path.join(__dirname, ".burner-bots.json");
  const botsData = JSON.parse(fs.readFileSync(botsPath, "utf8"));
  const bot1Data = botsData[0]; // Bot 1
  const bot1 = new ethers.Wallet(bot1Data.privateKey, provider);

  const coordPath = path.join(__dirname, ".coordinator-wallet.json");
  const coordData = JSON.parse(fs.readFileSync(coordPath, "utf8"));
  const coordinator = new ethers.Wallet(coordData.privateKey, provider);

  console.log(`👤 Deployer (Bot1): ${bot1.address}`);
  const bot1Eth = await provider.getBalance(bot1.address);
  console.log(`   Bot1 Gas: ${ethers.formatEther(bot1Eth)} Arc`);

  const cirBtc = new ethers.Contract(CIRBTC_ADDRESS, ERC20_ABI, bot1);
  const bot1CirBtc = await cirBtc.balanceOf(bot1.address);
  console.log(`   Bot1 CirBTC: ${bot1CirBtc.toString()} satoshis (${ethers.formatUnits(bot1CirBtc, 8)} BTC)`);

  const requiredCollateral = 100n; // 100 satoshis = 0.00000100 CirBTC
  const contributionAmount = 1000000n; // 1 USDC (6 decimals)
  const maxMembers = 5n;
  const roundDuration = 86400n; // 1 day
  const groupName = "CirBTC VIP Club";

  console.log(`\n📋 Cấu hình Club:`);
  console.log(`   - Group Name:           ${groupName}`);
  console.log(`   - Contribution Amount:  1 USDC`);
  console.log(`   - Required Collateral:  ${requiredCollateral.toString()} satoshis (0.000001 CirBTC)`);
  console.log(`   - Max Members:          ${maxMembers.toString()}`);
  console.log(`   - Round Duration:       24h`);

  if (bot1CirBtc < requiredCollateral) {
    throw new Error(`Bot1 không đủ CirBTC (có ${bot1CirBtc}, cần ${requiredCollateral})`);
  }

  // 1. Deploy Club
  console.log(`\n🚀 [1/3] Đang deploy contract RotatingSavings mới...`);
  const factory = new ethers.ContractFactory(
    ROTATING_SAVINGS_ABI,
    ROTATING_SAVINGS_BYTECODE,
    bot1
  );

  const deployTx = await factory.deploy(
    USDC_ADDRESS,
    contributionAmount,
    maxMembers,
    roundDuration,
    groupName,
    CIRBTC_ADDRESS,
    requiredCollateral
  );
  await deployTx.waitForDeployment();
  const groupAddress = await deployTx.getAddress();
  console.log(`✅ Smart contract đã deploy thành công tại: ${groupAddress}`);

  const clubContract = new ethers.Contract(
    groupAddress,
    ROTATING_SAVINGS_ABI,
    bot1
  );

  // 2. Bot 1 approves CirBTC collateral
  console.log(`\n🔑 [2/3] Bot1 phê duyệt (approve) cọc ${requiredCollateral.toString()} satoshis CirBTC...`);
  const approveTx = await cirBtc.approve(groupAddress, requiredCollateral);
  await approveTx.wait();
  console.log(`✅ Bot1 đã approve CirBTC cho club!`);

  // 3. Bot 1 joins the club
  console.log(`\n🤝 [3/3] Bot1 tham gia (join) phòng hụi với cọc CirBTC...`);
  const joinTx = await clubContract.joinGroupWithCollateral(requiredCollateral);
  await joinTx.wait();
  console.log(`✅ Bot1 đã gia nhập thành công!`);

  // Verify state
  const members = await clubContract.getMembers();
  const lockedCollateral = await clubContract.cirBtcCollateral(bot1.address);
  const clubState = await clubContract.state();
  const activeCollateral = await clubContract.cirBtcCollateralAmount();

  console.log(`\n🎉 === THÔNG TIN KIỂM CHỨNG TRÊN CHAIN ===`);
  console.log(`   - Club Address:       ${groupAddress}`);
  console.log(`   - Group State:        ${clubState.toString()} (0 = OPEN)`);
  console.log(`   - Member Count:       ${members.length}`);
  console.log(`   - Member #1:          ${members[0]} (Bot1)`);
  console.log(`   - Bot1 Locked Cọc:    ${lockedCollateral.toString()} satoshis CirBTC`);
  console.log(`   - Club Required Cọc:  ${activeCollateral.toString()} satoshis CirBTC`);

  console.log(`\n🔗 Link truy cập kiểm thử ngay cho bạn:`);
  console.log(`   http://localhost:5173/?tab=app&group=${groupAddress.toLowerCase()}`);
  console.log(`==========================================`);

  return { groupAddress, requiredCollateral };
}

main().catch((err) => {
  console.error("Lỗi khi triển khai:", err);
  process.exit(1);
});
