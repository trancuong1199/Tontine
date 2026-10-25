export const MAX_HISTORY_ROUNDS = 50n;
export function historyRoundIds(currentRound: bigint | undefined): bigint[] {
  if (!currentRound || currentRound < 1n) return [];
  const first = currentRound > MAX_HISTORY_ROUNDS ? currentRound - MAX_HISTORY_ROUNDS + 1n : 1n;
  const ids: bigint[] = [];
  for (let round = first; round <= currentRound; round++) ids.push(round);
  return ids;
}
