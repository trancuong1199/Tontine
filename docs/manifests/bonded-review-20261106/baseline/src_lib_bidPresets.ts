import { formatUsdcExact, parseUsdc } from "../onchain-money.ts";

export const BID_PRESETS = Object.freeze(["1", "2", "5", "10"] as const);

/** Raise a raw bid without converting its rounded display back into a number. */
export function getRaisedBidInput(userBid: bigint, delta: string): string {
  return formatUsdcExact(userBid + parseUsdc(delta));
}
