/** Resolve the switch before any transaction, including approval follow-ups. */
export async function ensureArcChain({ getChainId, switchChain, chainId }: {
  getChainId: () => number | undefined;
  switchChain: (chainId: number) => Promise<{ id: number }>;
  chainId: number;
}): Promise<void> {
  if (getChainId() === chainId) return;
  const chain = await switchChain(chainId);
  if (chain.id !== chainId) throw new Error("Wallet did not switch to Arc Testnet");
}
