#!/usr/bin/env node
/**
 * Real Deployment & Pre-Broadcast Validation Script for BondedTontineFactory (Section 12, 12.1 & T3)
 *
 * Usage:
 *   DEPLOYER_PRIVATE_KEY=0x... node --experimental-strip-types scripts/deploy-bonded-tontine-factory.mjs --env testnet
 */

import { ethers } from "ethers";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireChain, getUsdc } from "../src/onchain-facts.ts";
import { CIRBTC_ADDRESS, USDC_ADDRESS } from "../src/config/arc-constants.ts";
import {
  ARC_TESTNET_CHAIN_ID,
  ARC_MAINNET_CHAIN_ID,
  MAINNET_ORACLE_ALLOWLIST,
} from "../src/config/bonded-tontine.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

export { ARC_TESTNET_CHAIN_ID };
export const ARC_TESTNET_USDC = USDC_ADDRESS;
export const ARC_TESTNET_CIRBTC = CIRBTC_ADDRESS;

export function validatePreBroadcastConfig({
  env,
  chainId,
  expectedChainId,
  usdc,
  cirBtc,
  usdcDecimals = 6,
  cirBtcDecimals = 8,
  usdcHasCode = true,
  cirBtcHasCode = true,
  priceFeed,
  maxPriceAge,
  feedDecimals,
  feedDescription,
  latestRoundData,
  nowSeconds,
  mainnetAllowlist = [],
}) {
  const zero = "0x0000000000000000000000000000000000000000";
  if (chainId !== expectedChainId) {
    throw new Error(`ChainIdMismatch: expected ${expectedChainId}, got ${chainId}`);
  }
  if (!usdc || usdc === zero || !cirBtc || cirBtc === zero) {
    throw new Error("InvalidConfiguration: zero token address");
  }
  if (usdc.toLowerCase() === cirBtc.toLowerCase()) {
    throw new Error("InvalidConfiguration: usdc and cirBtc must be distinct");
  }
  if (!usdcHasCode) {
    throw new Error("InvalidConfiguration: usdc address has no deployed bytecode on-chain");
  }
  if (!cirBtcHasCode) {
    throw new Error("InvalidConfiguration: cirBtc address has no deployed bytecode on-chain");
  }
  if (Number(usdcDecimals) !== 6) {
    throw new Error(`InvalidConfiguration: usdc.decimals() must be 6, got ${usdcDecimals}`);
  }
  if (Number(cirBtcDecimals) !== 8) {
    throw new Error(`InvalidConfiguration: cirBtc.decimals() must be 8, got ${cirBtcDecimals}`);
  }
  if (!priceFeed || priceFeed === zero) {
    throw new Error("InvalidConfiguration: zero priceFeed address");
  }
  if (BigInt(maxPriceAge) < 3600n || BigInt(maxPriceAge) > 172800n) {
    throw new Error("InvalidConfiguration: maxPriceAge must be between 1h and 48h");
  }
  if (feedDecimals < 0 || feedDecimals > 18) {
    throw new Error("InvalidConfiguration: feedDecimals > 18");
  }

  const isMock = typeof feedDescription === "string" && feedDescription.startsWith("MOCK");
  if (env === "mainnet") {
    if (isMock) {
      throw new Error("MainnetOracleRejected: MOCK oracle feed is forbidden on mainnet");
    }
    const normalizedAllowlist = mainnetAllowlist.map((a) => a.toLowerCase());
    if (!normalizedAllowlist.includes(priceFeed.toLowerCase())) {
      throw new Error("MainnetOracleRejected: priceFeed is not in mainnet allowlist");
    }
  } else if (env === "testnet") {
    if (!isMock) {
      throw new Error("TestnetOracleRejected: testnet mock feed description must start with MOCK");
    }
  }

  const { roundId, answer, updatedAt, answeredInRound } = latestRoundData;
  const now = BigInt(nowSeconds);
  if (
    BigInt(answer) <= 0n ||
    BigInt(updatedAt) === 0n ||
    BigInt(updatedAt) > now ||
    BigInt(answeredInRound) < BigInt(roundId)
  ) {
    throw new Error("BadPrice: oracle latestRoundData failed sanity checks");
  }
  if (now - BigInt(updatedAt) > BigInt(maxPriceAge)) {
    throw new Error("StalePrice: oracle latestRoundData is older than maxPriceAge");
  }

  return {
    ok: true,
    env,
    chainId,
    usdc,
    cirBtc,
    usdcDecimals: Number(usdcDecimals),
    cirBtcDecimals: Number(cirBtcDecimals),
    priceFeed,
    maxPriceAge: Number(maxPriceAge),
    feedDecimals: Number(feedDecimals),
    feedDescription,
  };
}

const ERC20_META_ABI = ["function decimals() view returns (uint8)", "function symbol() view returns (string)"];

export async function verifyTokensOnChain(provider, usdcAddress, cirBtcAddress) {
  const [usdcCode, cirBtcCode] = await Promise.all([
    provider.getCode(usdcAddress),
    provider.getCode(cirBtcAddress),
  ]);
  const usdcHasCode = Boolean(usdcCode && usdcCode !== "0x");
  const cirBtcHasCode = Boolean(cirBtcCode && cirBtcCode !== "0x");
  if (!usdcHasCode) {
    throw new Error(`InvalidConfiguration: usdc (${usdcAddress}) has no code on chain`);
  }
  if (!cirBtcHasCode) {
    throw new Error(`InvalidConfiguration: cirBtc (${cirBtcAddress}) has no code on chain`);
  }
  const usdcContract = new ethers.Contract(usdcAddress, ERC20_META_ABI, provider);
  const cirBtcContract = new ethers.Contract(cirBtcAddress, ERC20_META_ABI, provider);
  const [usdcDecimals, cirBtcDecimals] = await Promise.all([
    usdcContract.decimals(),
    cirBtcContract.decimals(),
  ]);
  return {
    usdcHasCode,
    cirBtcHasCode,
    usdcDecimals: Number(usdcDecimals),
    cirBtcDecimals: Number(cirBtcDecimals),
  };
}

function parseCliEnv(argv) {
  const idx = argv.indexOf("--env");
  const val = idx !== -1 ? argv[idx + 1] : "testnet";
  if (val !== "testnet" && val !== "mainnet") {
    throw new Error(`Invalid --env '${val}'. Must be 'testnet' or 'mainnet'.`);
  }
  return val;
}

async function runDeploy() {
  const env = parseCliEnv(process.argv.slice(2));
  const targetChainId = env === "testnet" ? ARC_TESTNET_CHAIN_ID : ARC_MAINNET_CHAIN_ID;
  const chainFact = requireChain(targetChainId);
  const usdcFact = getUsdc(targetChainId);
  if (!usdcFact || !chainFact.rpcUrls[0]) {
    throw new Error(`Missing chain/USDC facts for chainId ${targetChainId}`);
  }

  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    throw new Error("Missing DEPLOYER_PRIVATE_KEY environment variable");
  }

  const provider = new ethers.JsonRpcProvider(chainFact.rpcUrls[0], {
    chainId: targetChainId,
    name: chainFact.name,
  });
  const wallet = new ethers.Wallet(pk, provider);
  const network = await provider.getNetwork();
  const actualChainId = Number(network.chainId);

  console.log(`[Deploy] Environment: ${env} | Chain: ${chainFact.name} (${actualChainId})`);
  console.log(`[Deploy] Deployer address: ${wallet.address}`);

  const usdcAddress = usdcFact.address;
  const cirBtcAddress = CIRBTC_ADDRESS;

  // 1. Read token code & decimals from chain
  const tokenChecks = await verifyTokensOnChain(provider, usdcAddress, cirBtcAddress);
  console.log(
    `[Deploy] Verified tokens on-chain: USDC (${usdcAddress}, decimals=${tokenChecks.usdcDecimals}), cirBTC (${cirBtcAddress}, decimals=${tokenChecks.cirBtcDecimals})`
  );

  const mockArtifact = JSON.parse(
    fs.readFileSync(path.join(ROOT, "contracts/out/MockAggregatorV3.sol/MockAggregatorV3.json"), "utf8")
  );
  const factoryArtifact = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "contracts/out/BondedTontineFactory.sol/BondedTontineFactory.json"),
      "utf8"
    )
  );

  let priceFeedAddress = process.env.PRICE_FEED_ADDRESS;
  const maxPriceAge = env === "testnet" ? 86_400 : 90_000;

  if (env === "testnet" && !priceFeedAddress) {
    console.log(`[Deploy] Deploying MockAggregatorV3 (8 decimals, $60,000, "MOCK BTC / USD")...`);
    const mockFactory = new ethers.ContractFactory(
      mockArtifact.abi,
      mockArtifact.bytecode.object,
      wallet
    );
    const mockContract = await mockFactory.deploy(8, 60_000_00000000n, "MOCK BTC / USD");
    await mockContract.waitForDeployment();
    priceFeedAddress = await mockContract.getAddress();
    console.log(`[Deploy] MockAggregatorV3 deployed at: ${priceFeedAddress}`);
  }

  if (!priceFeedAddress) {
    throw new Error("Missing PRICE_FEED_ADDRESS for deployment");
  }

  // 2. Read oracle state on-chain before deploying BondedTontineFactory
  const feedContract = new ethers.Contract(priceFeedAddress, mockArtifact.abi, provider);
  const [feedDecimals, feedDescription, roundData, latestBlock] = await Promise.all([
    feedContract.decimals(),
    feedContract.description(),
    feedContract.latestRoundData(),
    provider.getBlock("latest"),
  ]);

  const nowSeconds = BigInt(latestBlock?.timestamp ?? Math.floor(Date.now() / 1000));

  validatePreBroadcastConfig({
    env,
    chainId: actualChainId,
    expectedChainId: targetChainId,
    usdc: usdcAddress,
    cirBtc: cirBtcAddress,
    usdcDecimals: tokenChecks.usdcDecimals,
    cirBtcDecimals: tokenChecks.cirBtcDecimals,
    usdcHasCode: tokenChecks.usdcHasCode,
    cirBtcHasCode: tokenChecks.cirBtcHasCode,
    priceFeed: priceFeedAddress,
    maxPriceAge,
    feedDecimals: Number(feedDecimals),
    feedDescription,
    latestRoundData: {
      roundId: roundData[0],
      answer: roundData[1],
      startedAt: roundData[2],
      updatedAt: roundData[3],
      answeredInRound: roundData[4],
    },
    nowSeconds,
    mainnetAllowlist: MAINNET_ORACLE_ALLOWLIST[targetChainId] ?? [],
  });

  // 3. Deploy BondedTontineFactory
  console.log(`[Deploy] Deploying BondedTontineFactory...`);
  const btFactory = new ethers.ContractFactory(
    factoryArtifact.abi,
    factoryArtifact.bytecode.object,
    wallet
  );
  const deployedFactory = await btFactory.deploy(
    usdcAddress,
    cirBtcAddress,
    priceFeedAddress,
    maxPriceAge
  );
  await deployedFactory.waitForDeployment();
  const factoryAddress = await deployedFactory.getAddress();
  console.log(`[Deploy] BondedTontineFactory deployed at: ${factoryAddress}`);

  // 4. Read back and verify on-chain immutables
  const [onchainUsdc, onchainCirBtc, onchainFeed, onchainMaxAge] = await Promise.all([
    deployedFactory.usdc(),
    deployedFactory.cirBtc(),
    deployedFactory.priceFeed(),
    deployedFactory.maxPriceAge(),
  ]);

  if (
    onchainUsdc.toLowerCase() !== usdcAddress.toLowerCase() ||
    onchainCirBtc.toLowerCase() !== cirBtcAddress.toLowerCase() ||
    onchainFeed.toLowerCase() !== priceFeedAddress.toLowerCase() ||
    Number(onchainMaxAge) !== maxPriceAge
  ) {
    throw new Error("Post-deployment verification mismatch on BondedTontineFactory immutables");
  }

  console.log(`[Deploy] Verified BondedTontineFactory on-chain:`);
  console.log(`  - usdc():        ${onchainUsdc}`);
  console.log(`  - cirBtc():      ${onchainCirBtc}`);
  console.log(`  - priceFeed():   ${onchainFeed}`);
  console.log(`  - maxPriceAge(): ${onchainMaxAge.toString()}`);

  // 5. On testnet, also create a default verified BondedTontine club for immediate inspection
  let sampleClubAddress = undefined;
  if (env === "testnet") {
    console.log(`[Deploy] Creating initial verified BondedTontine club via factory.createClub()...`);
    const createTx = await deployedFactory.createClub(
      "Saigon Bonded Club V2",
      10_000_000n, // 10 USDC
      4n,          // 4 members
      120n,        // 120s (2 min) round duration for fast testnet cycle
      200n,        // 2% per round
      20_000n,     // 200% safety ratio
      12_000n,     // 120% liquidation ratio
      120n,        // 120s interest grace
      3600n        // 1h settlement grace
    );
    await createTx.wait();
    sampleClubAddress = await deployedFactory.clubAt(0);
    const isVerified = await deployedFactory.isClub(sampleClubAddress);
    console.log(`[Deploy] Created verified BondedTontine club #0: ${sampleClubAddress} (isClub=${isVerified})`);
  }

  return {
    factoryAddress,
    priceFeedAddress,
    sampleClubAddress,
    usdcAddress,
    cirBtcAddress,
    maxPriceAge,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDeploy().catch((err) => {
    console.error("[Deploy Error]:", err.message || err);
    process.exit(1);
  });
}
