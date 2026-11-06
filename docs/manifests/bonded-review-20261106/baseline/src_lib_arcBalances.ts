import { Contract, JsonRpcProvider, type ContractRunner } from 'ethers';
import { ARC_CHAIN_ID, ARC_RPC, TOKEN_ADDRESSES, TOKEN_DECIMALS } from '../config/arc-constants.ts';
import { formatUsdc, formatUnitsFixed, formatUnitsExact } from '../onchain-money.ts';

export type ArcToken = 'USDC' | 'EURC' | 'cirBTC';
export type ArcBalances = { usdc: bigint | null; eurc: bigint | null; cirbtc: bigint | null };
export const EMPTY_ARC_BALANCES: ArcBalances = { usdc: null, eurc: null, cirbtc: null };
// Never use the connected wallet's current-chain native balance as Arc USDC.
export const arcBalanceProvider = new JsonRpcProvider(ARC_RPC, Number(ARC_CHAIN_ID), { staticNetwork: true });
const BALANCE_ABI = ['function balanceOf(address account) view returns (uint256)'];

export async function readArcTokenBalance(account: string, token: ArcToken, runner: ContractRunner = arcBalanceProvider): Promise<bigint> {
  const balance: unknown = await new Contract(TOKEN_ADDRESSES[token], BALANCE_ABI, runner).balanceOf(account);
  if (typeof balance !== 'bigint' || balance < 0n) throw new Error('Invalid ERC-20 balance');
  return balance;
}
export async function readArcBalances(account: string, runner: ContractRunner = arcBalanceProvider): Promise<ArcBalances> {
  const values = await Promise.allSettled((['USDC', 'EURC', 'cirBTC'] as const).map(token => readArcTokenBalance(account, token, runner)));
  const value = (index: number) => values[index].status === 'fulfilled' ? values[index].value : null;
  return { usdc: value(0), eurc: value(1), cirbtc: value(2) };
}
export function formatArcBalance(raw: bigint | null, token: ArcToken): string {
  if (raw === null) return '—';
  return token === 'USDC' ? formatUsdc(raw) : formatUnitsFixed(raw, TOKEN_DECIMALS[token], token === 'cirBTC' ? 6 : 4, 'half-up');
}
/** Approximate chart/price-estimate boundary only; never feed this into money logic. */
export function toApproximateChartValue(raw: bigint | null, decimals: number, rate = 1): number {
  if (raw === null) return 0;
  const value = Number(formatUnitsExact(raw, decimals)) * rate;
  return Number.isFinite(value) ? value : 0;
}
/** User-facing estimate only; never used to construct a transaction amount. */
export function formatApproximateQuote(input: string, rate: number, fractionDigits = 4): string {
  const value = Number(input) * rate;
  return Number.isFinite(value) && value >= 0 ? value.toFixed(fractionDigits) : '—';
}
