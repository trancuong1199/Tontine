import { formatUsdcExact, parseUsdc } from "../onchain-money.ts";

/** Raise a raw bid without converting its rounded display back into a number. */
export function getRaisedBidInput(userBid: bigint, delta: string): string {
  return formatUsdcExact(userBid + parseUsdc(delta));
}
