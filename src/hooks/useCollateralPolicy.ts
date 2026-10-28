import { useCallback, useEffect, useRef, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { erc20Abi, isAddress, zeroAddress, type PublicClient } from 'viem';
import { ARC_TESTNET_CHAIN_ID, ROTATING_SAVINGS_ABI } from '../contract';
import { classifyCollateralPolicy, collateralAmounts, sameCollateralQuote, type CollateralPolicy, type CollateralQuote } from '../lib/collateralPolicy';

export async function readCollateralQuote(client: Pick<PublicClient, 'readContract'>, group: `0x${string}`, account: `0x${string}`): Promise<CollateralQuote> {
  const read = (functionName: string, args?: readonly unknown[]) => client.readContract({ address: group, abi: ROTATING_SAVINGS_ABI, functionName, args });
  const [marker, required, locked, token, member, kicked, state] = await Promise.all([
    read('collateralPolicyVersion').then(data => ({ data }), error => ({ error })),
    read('cirBtcCollateralAmount'), read('cirBtcCollateral', [account]), read('cirBtcToken'),
    read('isMember', [account]), read('isKicked', [account]), read('state'),
  ]);
  const policy = classifyCollateralPolicy(marker);
  if (policy !== 'enforced' && policy !== 'legacy') throw new Error('Collateral policy is unavailable. Retry the check.');
  if (typeof required !== 'bigint' || typeof locked !== 'bigint' || typeof token !== 'string' || !isAddress(token) || token === zeroAddress || typeof member !== 'boolean' || typeof kicked !== 'boolean' || (typeof state !== 'number' && typeof state !== 'bigint') || !Number.isInteger(Number(state)) || Number(state) < 0 || Number(state) > 3) throw new Error('Collateral data is unavailable. Retry the check.');
  const [balance, allowance] = await Promise.all([
    client.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [account] }),
    client.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [account, group] }),
  ]);
  if (typeof balance !== 'bigint' || typeof allowance !== 'bigint' || allowance < 0n) throw new Error('Collateral balance or allowance is unavailable.');
  return { ...collateralAmounts(required, locked, balance), group, account, token, policy, allowance, member, kicked, state: Number(state) };
}

export interface CollateralView {
  policy: CollateralPolicy;
  quote?: CollateralQuote;
  error?: string;
  refresh: () => Promise<CollateralQuote | undefined>;
  review: (requireBalance?: boolean) => Promise<CollateralQuote>;
}

/** Reads and reviews always use the Arc client and the selected club/account. */
export function useCollateralPolicy(group: `0x${string}`, account: `0x${string}` | undefined): CollateralView {
  const client = usePublicClient({ chainId: ARC_TESTNET_CHAIN_ID });
  const key = `${group.toLowerCase()}:${account?.toLowerCase() ?? ''}`;
  const context = useRef(key);
  context.current = key;
  const sequence = useRef(0);
  const [result, setResult] = useState<{ key: string; policy: CollateralPolicy; quote?: CollateralQuote; error?: string }>({ key, policy: 'loading' });
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setResult({ key, policy: 'loading' });
    try {
      if (!client || !account) throw new Error('Connect a wallet to review collateral.');
      const quote = await readCollateralQuote(client, group, account);
      if (context.current !== key || request !== sequence.current) return undefined;
      setResult({ key, policy: quote.policy, quote });
      return quote;
    } catch (error) {
      if (context.current === key && request === sequence.current) setResult({ key, policy: 'unknown', error: error instanceof Error ? error.message : String(error) });
      return undefined;
    }
  }, [client, key, group, account]);
  useEffect(() => { void refresh(); return () => { sequence.current++; }; }, [refresh]);
  const current = result.key === key ? result : { key, policy: 'loading' as const };
  const review = async (requireBalance = true) => {
    const previous = current.quote;
    if (!previous || current.policy === 'loading' || current.policy === 'unknown') throw new Error('Review the current collateral amounts before signing.');
    const fresh = await refresh();
    if (!fresh || context.current !== key) throw new Error('Collateral context is unavailable or changed. Review and retry.');
    if (!sameCollateralQuote(previous, fresh)) throw new Error('Collateral amounts changed. Review the updated preview and click again.');
    if (requireBalance && fresh.deficit > 0n) throw new Error('Insufficient CirBTC for the required collateral.');
    return fresh;
  };
  return { policy: current.policy, quote: current.quote, error: current.error, refresh, review };
}
