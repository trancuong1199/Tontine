import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARC_RPC_URL = process.env.ARC_RPC_URL || "https://rpc.testnet.arc.io";
const targetClub = "0x5435dd030fd4a5a4dd91e873285e7742349611c9";
const usdcAddress = "0x3600000000000000000000000000000000000000";

const bots = JSON.parse(fs.readFileSync(path.join(__dirname, ".burner-bots.json"), "utf8"));
const provider = new ethers.JsonRpcProvider(ARC_RPC_URL, 5042002, { staticNetwork: true });
const botWallet = new ethers.Wallet(bots[0].privateKey, provider);

const groupAbi = [
  "function state() view returns (uint8)",
  "function currentRound() view returns (uint256)",
  "function contributionAmount() view returns (uint256)",
  "function isMember(address) view returns (bool)",
  "function hasWon(address) view returns (bool)",
  "function contribute(uint256 roundId) external",
  "function placeBid(uint256 roundId, uint256 bidAmount) external",
  "function getRoundContribution(uint256 roundId, address member) external view returns (uint256)",
  "function getRoundBid(uint256 roundId, address member) external view returns (uint256)"
];

const contract = new ethers.Contract(targetClub, groupAbi, botWallet);

console.log("==================================================================");
console.log(`🤖 COMPANION BOT WATCHER ACTIVE FOR CLUB: ${targetClub}`);
console.log(`Bot Address: ${botWallet.address}`);
console.log("==================================================================");

let inFlight = false;

async function checkAndAct() {
  if (inFlight) return;
  inFlight = true;
  try {
    const [state, round] = await Promise.all([
      contract.state(),
      contract.currentRound()
    ]);

    // state: 0 = OPEN, 1 = ACTIVE, 2 = COMPLETED, 3 = CANCELLED
    if (state === 1 && round > 0n) {
      const contrib = await contract.getRoundContribution(round, botWallet.address);
      if (contrib === 0n) {
        console.log(`[Round ${round}] Bot contributing 5 USDC...`);
        const tx = await contract.contribute(round, { gasLimit: 300000 });
        console.log(`[Round ${round}] Contributed: ${tx.hash}`);
        await tx.wait();
        console.log(`[Round ${round}] Contribution confirmed!`);
      }

      const bid = await contract.getRoundBid(round, botWallet.address);
      if (bid === 0n) {
        const bidAmount = ethers.parseUnits("0.25", 6); // 0.25 USDC
        console.log(`[Round ${round}] Bot placing friendly test bid 0.25 USDC...`);
        const tx = await contract.placeBid(round, bidAmount, { gasLimit: 300000 });
        console.log(`[Round ${round}] Bid placed: ${tx.hash}`);
        await tx.wait();
        console.log(`[Round ${round}] Bid confirmed!`);
      }
    }
  } catch (err) {
    console.error("Companion check error:", err.message);
  } finally {
    inFlight = false;
  }
}

setInterval(checkAndAct, 3000);
checkAndAct();
