#!/usr/bin/env node
/**
 * Refresh MockAggregatorV3 BTC/USD price on Arc Testnet (U2)
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node scripts/refresh-mock-oracle.mjs [--price 60000]
 *
 * Security:
 * - Reads DEPLOYER_PRIVATE_KEY strictly from environment variable; never logs or writes it to disk.
 * - Reads RPC URL from src/onchain-facts.ts and feed address from src/config/bonded-tontine.ts.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";
import { getChain } from "../src/onchain-facts.ts";
import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_MOCK_FEED,
} from "../src/config/bonded-tontine.ts";
import { parseUnitsExact } from "../src/onchain-money.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

async function main() {
  const args = process.argv.slice(2);
  const priceIdx = args.indexOf("--price");
  const usdPriceStr =
    priceIdx >= 0 && args[priceIdx + 1] ? args[priceIdx + 1] : "60000";

  const rawKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!rawKey) {
    throw new Error(
      "Missing DEPLOYER_PRIVATE_KEY environment variable. Set DEPLOYER_PRIVATE_KEY=0x... before running."
    );
  }
  const formattedKey = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
  const account = privateKeyToAccount(formattedKey);

  const chainFacts = getChain(ARC_TESTNET_CHAIN_ID);
  const rpcUrl = chainFacts?.rpcUrls[0] ?? "https://rpc.testnet.arc.network";

  const publicClient = createPublicClient({
    chain: arcTestnet,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(rpcUrl),
  });

  const mockArtifact = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "contracts/out/MockAggregatorV3.sol/MockAggregatorV3.json"),
      "utf8"
    )
  );

  const rawAnswer = parseUnitsExact(usdPriceStr, 8);
  console.log(
    `[RefreshOracle] Updating MockAggregatorV3 (${ARC_TESTNET_MOCK_FEED}) to $${usdPriceStr} (${rawAnswer.toString()})...`
  );

  const hash = await walletClient.writeContract({
    address: ARC_TESTNET_MOCK_FEED,
    abi: mockArtifact.abi,
    functionName: "setPrice",
    args: [rawAnswer],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`[RefreshOracle] setPrice transaction reverted: ${hash}`);
  }

  const [roundId, answer, , updatedAt] = await publicClient.readContract({
    address: ARC_TESTNET_MOCK_FEED,
    abi: mockArtifact.abi,
    functionName: "latestRoundData",
  });

  console.log(`[RefreshOracle] Success! tx=${hash}`);
  console.log(
    `[RefreshOracle] roundId=${roundId.toString()}, answer=$${formatUnits(answer, 8)} (${answer.toString()}), updatedAt=${updatedAt.toString()} (${new Date(Number(updatedAt) * 1000).toISOString()})`
  );
}

main().catch((err) => {
  console.error("[RefreshOracle] Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
