import { USDC_ADDRESS, USDC_ERC20_DECIMALS, USDC_NATIVE_DECIMALS, TOKEN_DECIMALS } from '../config/arc-constants.ts';
import { formatUnitsExact, parseUnitsExact } from '../onchain-money.ts';
import type { Transaction } from './TransactionHistory.ts';

export interface TokenHolding { address: string; symbol: string; raw: bigint; decimals: number }
export interface AnalyticsTx {
  hash: string; timestamp: string; from: { hash: string }; to: { hash: string } | null;
  valueRaw: bigint | null; decimals: number | null; tokenSymbol: string; isUsdc: boolean;
  status: string; method: string | null; feeRaw: bigint | null;
}
export function parseUnsignedRaw(value: unknown): bigint | null {
  if (typeof value === 'bigint') return value >= 0n ? value : null;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  try { return BigInt(value); } catch { return null; }
}
function parseDecimals(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) return null;
  const decimals = Number(value);
  return Number.isInteger(decimals) && decimals >= 0 && decimals <= 255 ? decimals : null;
}
/** Identity comes from address, never symbol: native and ERC-20 USDC are one pool. */
export function buildTokenHoldings(usdcRaw: bigint | null, rows: unknown[]): TokenHolding[] {
  const canonical = USDC_ADDRESS.toLowerCase();
  const seen = new Set([canonical]);
  const holdings: TokenHolding[] = usdcRaw === null ? [] : [{ address: canonical, symbol: 'USDC', raw: usdcRaw, decimals: USDC_ERC20_DECIMALS }];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const item = row as { token?: { address_hash?: unknown; address?: unknown; symbol?: unknown; decimals?: unknown }; value?: unknown };
    const token = item.token;
    if (!token) continue;
    const address = token.address_hash ?? token.address;
    if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address)) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    const decimals = parseDecimals(token.decimals);
    const raw = parseUnsignedRaw(item.value);
    if (decimals === null || raw === null) continue;
    seen.add(key);
    holdings.push({ address: key, symbol: typeof token.symbol === 'string' && token.symbol ? token.symbol : 'Unknown', raw, decimals });
  }
  return holdings;
}
export function normalizeExplorerTransaction(value: unknown): AnalyticsTx | null {
  if (!value || typeof value !== 'object') return null;
  const tx = value as Record<string, any>;
  if (typeof tx.hash !== 'string' || typeof tx.timestamp !== 'string' || !Number.isFinite(Date.parse(tx.timestamp))) return null;
  return {
    hash: tx.hash, timestamp: tx.timestamp,
    from: { hash: typeof tx.from?.hash === 'string' ? tx.from.hash : '' },
    to: typeof tx.to?.hash === 'string' ? { hash: tx.to.hash } : null,
    valueRaw: parseUnsignedRaw(tx.value), decimals: USDC_NATIVE_DECIMALS, tokenSymbol: 'USDC', isUsdc: true,
    status: typeof tx.status === 'string' ? tx.status : 'unknown',
    method: typeof tx.method === 'string' ? tx.method : null, feeRaw: parseUnsignedRaw(tx.fee?.value),
  };
}
export function normalizeLocalTransaction(tx: Transaction): AnalyticsTx | null {
  if (!tx || !Number.isFinite(tx.timestamp) || !Number.isFinite(new Date(tx.timestamp).getTime())) return null;
  const hash = typeof tx.txHash === 'string' && tx.txHash ? tx.txHash : typeof tx.id === 'string' ? tx.id : '';
  if (!hash) return null;
  const symbol = typeof tx.tokenSymbol === 'string' && tx.tokenSymbol ? tx.tokenSymbol : 'Unknown';
  const decimals = Object.prototype.hasOwnProperty.call(TOKEN_DECIMALS, symbol) ? TOKEN_DECIMALS[symbol] : null;
  let valueRaw: bigint | null = null;
  if (decimals !== null && typeof tx.amount === 'string') {
    try { const raw = parseUnitsExact(tx.amount, decimals); if (raw >= 0n) valueRaw = raw; } catch { /* Invalid history is unavailable, not zero. */ }
  }
  return {
    hash, timestamp: new Date(tx.timestamp).toISOString(),
    from: { hash: typeof tx.from === 'string' ? tx.from : '' }, to: typeof tx.to === 'string' && tx.to ? { hash: tx.to } : null,
    valueRaw, decimals, tokenSymbol: symbol, isUsdc: symbol === 'USDC',
    status: tx.status === 'COMPLETE' ? 'ok' : tx.status === 'FAILED' ? 'error' : 'pending', method: typeof tx.action === 'string' ? tx.action : null, feeRaw: null,
  };
}
export function formatAnalyticsValue(tx: AnalyticsTx): string {
  return tx.valueRaw === null || tx.decimals === null ? '—' : `${formatUnitsExact(tx.valueRaw, tx.decimals)} ${tx.tokenSymbol}`;
}
export function formatNativeFee(raw: bigint | null): string {
  return raw === null ? '—' : `${formatUnitsExact(raw, USDC_NATIVE_DECIMALS)} USDC`;
}
export function sumKnownFees(txs: AnalyticsTx[]): bigint | null {
  const known = txs.filter(tx => tx.feeRaw !== null);
  return known.length ? known.reduce((sum, tx) => sum + tx.feeRaw!, 0n) : null;
}
/** Aggregate only successful outgoing USDC, normalized to native 18 decimals. */
export function usdcVolumeByDay(txs: AnalyticsTx[], account: string): { date: string; raw: bigint }[] {
  const totals = new Map<string, bigint>();
  for (const tx of txs) {
    if (!tx.isUsdc || tx.status !== 'ok' || tx.from.hash.toLowerCase() !== account.toLowerCase() || tx.valueRaw === null || tx.decimals === null || tx.decimals > USDC_NATIVE_DECIMALS) continue;
    const date = tx.timestamp.slice(0, 10);
    const raw = tx.valueRaw * 10n ** BigInt(USDC_NATIVE_DECIMALS - tx.decimals);
    totals.set(date, (totals.get(date) ?? 0n) + raw);
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, raw]) => ({ date, raw }));
}
