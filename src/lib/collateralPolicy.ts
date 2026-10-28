import { classifyCycleCapability } from './cycleCapabilities.ts';

export type CollateralPolicy = 'loading' | 'enforced' | 'legacy' | 'unknown';
export const MAX_COLLATERAL = (1n << 256n) - 1n;

/** None is explicit; custom amounts must be positive, exact satoshis and uint256. */
export function parseCollateralInput(mode: '' | 'none' | 'custom', value: string): bigint | undefined {
  if (mode === 'none') return 0n;
  if (mode !== 'custom' || value.length > 1000 || !/^\d+(?:\.\d+)?$/.test(value)) return undefined;
  const [whole, fraction = ''] = value.split('.');
  if (/[1-9]/.test(fraction.slice(8))) return undefined;
  const raw = BigInt(whole) * 100_000_000n + BigInt(fraction.slice(0, 8).padEnd(8, '0'));
  return raw > 0n && raw <= MAX_COLLATERAL ? raw : undefined;
}

export function formatCollateral(raw: bigint): string {
  return `${raw / 100_000_000n}.${(raw % 100_000_000n).toString().padStart(8, '0')}`;
}

export function collateralAmounts(required: bigint, locked: bigint, balance: bigint) {
  if ([required, locked, balance].some(value => value < 0n || value > MAX_COLLATERAL)) throw new Error('Invalid collateral amount');
  const shortfall = required > locked ? required - locked : 0n;
  const deficit = shortfall > balance ? shortfall - balance : 0n;
  return { required, locked, balance, shortfall, deficit, after: deficit === 0n ? balance - shortfall : undefined };
}

export function classifyCollateralPolicy(input: { data?: unknown; error?: unknown; isPending?: boolean; isFetching?: boolean }): CollateralPolicy {
  const capability = classifyCycleCapability(input);
  if (capability === 'checking') return 'loading';
  if (capability === 'unsupported') return 'legacy';
  return capability === 'supported' && input.data === 1n ? 'enforced' : 'unknown';
}

export interface CollateralQuote extends ReturnType<typeof collateralAmounts> {
  group: `0x${string}`;
  account: `0x${string}`;
  token: `0x${string}`;
  policy: 'enforced' | 'legacy';
  allowance: bigint;
  member: boolean;
  kicked: boolean;
  state: number;
}

export function sameCollateralQuote(a: CollateralQuote, b: CollateralQuote): boolean {
  return (Object.keys(a) as (keyof CollateralQuote)[]).every(key => a[key] === b[key]);
}
