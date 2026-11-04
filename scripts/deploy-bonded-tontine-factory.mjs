#!/usr/bin/env node
/**
 * Deployment & Pre-Broadcast Validation Script for BondedTontineFactory (Section 12 & 12.1)
 *
 * Pre-broadcast assertions enforced:
 *  1. Chain ID matches expected target (Arc Testnet: 5042002 or Mainnet target).
 *  2. usdc != address(0), cirBtc != address(0), usdc != cirBtc.
 *  3. priceFeed.decimals() <= 18.
 *  4. priceFeed.latestRoundData() returns answer > 0, updatedAt <= now, now - updatedAt <= maxPriceAge, answeredInRound >= roundId.
 *  5. If env == "mainnet":
 *     - priceFeed.description() MUST NOT start with "MOCK".
 *     - priceFeed address MUST be in the audited mainnet allowlist.
 */

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_USDC = "0x3600000000000000000000000000000000000000";
export const ARC_TESTNET_CIRBTC = "0x1cbb6874ef4b97c2f3f062a9f45fbbfc44f81a88";

export function validatePreBroadcastConfig({
  env,
  chainId,
  expectedChainId,
  usdc,
  cirBtc,
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
    priceFeed,
    maxPriceAge: Number(maxPriceAge),
    feedDecimals,
    feedDescription,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("BondedTontineFactory pre-broadcast validator ready.");
}
