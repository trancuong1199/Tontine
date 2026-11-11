#!/usr/bin/env node
import process from "node:process";
/** Read-only: node scripts/refresh-mock-oracle.mjs --status (or --dry-run).
 * Write: DEPLOYER_PRIVATE_KEY=... node scripts/refresh-mock-oracle.mjs --live --interval 1800
 */
import { createPublicClient, createWalletClient, http, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";
import { pathToFileURL } from "node:url";
import { ARC_RPC } from "../src/config/arc-constants.ts";
import { ARC_TESTNET_MOCK_FEED, ARC_TESTNET_DEFAULT_BONDED_CLUB } from "../src/config/bonded-tontine.ts";
import { MOCK_AGGREGATOR_V3_ABI, BONDED_TONTINE_ABI } from "../src/lib/bondedTontine.ts";
import { parseUnitsExact } from "../src/onchain-money.ts";

/** Fetch real-time market price of BTC from Binance (fallback to Coinbase) */
export async function getLiveBtcPrice() {
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const val = parseFloat(data.price);
      if (val > 0) return val.toFixed(2);
    }
  } catch {}

  try {
    const res = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const val = parseFloat(data?.data?.amount);
      if (val > 0) return val.toFixed(2);
    }
  } catch {}

  return null;
}

/** @param {string[]} args */
export function parseOptions(args) {
  let price = null, interval = null, readOnly = false, live = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--status" || arg === "--dry-run") readOnly = true;
    else if (arg === "--live") live = true;
    else if (arg === "--price") {
      price = args[++i];
      if (!price || !/^\d+(\.\d{1,8})?$/.test(price) || parseUnitsExact(price, 8) <= 0n) throw new Error("--price must be positive with at most 8 decimals");
    } else if (arg === "--interval") {
      interval = Number(args[++i]);
      if (!Number.isSafeInteger(interval) || interval < 60) throw new Error("--interval must be an integer >= 60 seconds");
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return { price, interval, readOnly, live };
}

export async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http(ARC_RPC) });
  const [maxPriceAge, feed, decimals, round] = await Promise.all([
    publicClient.readContract({ address: ARC_TESTNET_DEFAULT_BONDED_CLUB, abi: BONDED_TONTINE_ABI, functionName: "maxPriceAge" }),
    publicClient.readContract({ address: ARC_TESTNET_DEFAULT_BONDED_CLUB, abi: BONDED_TONTINE_ABI, functionName: "priceFeed" }),
    publicClient.readContract({ address: ARC_TESTNET_MOCK_FEED, abi: MOCK_AGGREGATOR_V3_ABI, functionName: "decimals" }),
    publicClient.readContract({ address: ARC_TESTNET_MOCK_FEED, abi: MOCK_AGGREGATOR_V3_ABI, functionName: "latestRoundData" }),
  ]);
  if (feed.toLowerCase() !== ARC_TESTNET_MOCK_FEED.toLowerCase()) throw new Error("Default club does not use configured mock feed");
  if (options.interval !== null && BigInt(options.interval) >= maxPriceAge) throw new Error("--interval must be below the club maxPriceAge");
  const now = BigInt(Math.floor(Date.now() / 1000));
  console.log(JSON.stringify({ feed, price: formatUnits(round[1], decimals), updatedAt: String(round[3]), ageSeconds: String(now - round[3]), maxPriceAge: String(maxPriceAge), stale: now - round[3] > maxPriceAge, readOnly: options.readOnly }));
  if (options.readOnly) return;
  const rawKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  if (!rawKey) throw new Error("Missing DEPLOYER_PRIVATE_KEY environment variable");
  const account = privateKeyToAccount(rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`);
  const admin = await publicClient.readContract({ address: feed, abi: MOCK_AGGREGATOR_V3_ABI, functionName: "admin" });
  if (admin.toLowerCase() !== account.address.toLowerCase()) throw new Error("Configured signer is not the live oracle admin");
  const wallet = createWalletClient({ account, chain: arcTestnet, transport: http(ARC_RPC) });

  const refresh = async () => {
    let priceStr = options.price;
    if (!priceStr || options.live) {
      const live = await getLiveBtcPrice();
      priceStr = live || priceStr || "74000";
    }
    const answer = parseUnitsExact(priceStr, decimals);
    const hash = await wallet.writeContract({ address: feed, abi: MOCK_AGGREGATOR_V3_ABI, functionName: "setPrice", args: [answer] });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`Refresh reverted: ${hash}`);
    console.log(`[Oracle] Refreshed with live BTC price $${priceStr} | tx: ${hash}`);
  };

  await refresh();
  while (options.interval !== null) {
    await new Promise(resolve => setTimeout(resolve, options.interval * 1000));
    try { await refresh(); } catch (error) { console.error("Refresh failed:", error instanceof Error ? error.message : "provider request failed"); }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : "Oracle operation failed"); process.exitCode = 1; });
}
