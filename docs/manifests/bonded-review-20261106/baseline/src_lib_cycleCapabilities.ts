import {
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
  ExecutionRevertedError,
} from "viem";

export type CycleCapability = "checking" | "supported" | "unsupported" | "error";

/** Only definite EVM/empty-return evidence establishes an unusable getter. */
function isUnavailableGetter(error: unknown): boolean {
  const visited = new Set<object>();
  let cause = error;
  while (typeof cause === "object" && cause !== null && !visited.has(cause)) {
    visited.add(cause);
    if (cause instanceof ContractFunctionZeroDataError || cause instanceof ExecutionRevertedError) return true;
    // viem also wraps generic -32603 RPC failures as ContractFunctionRevertedError.
    // Its class/name/message alone therefore cannot establish legacy support.
    if (cause instanceof ContractFunctionRevertedError && cause.raw && /^0x[0-9a-fA-F]{8,}$/.test(cause.raw)) return true;
    if ("code" in cause && cause.code === 3) return true;
    cause = "cause" in cause ? cause.cause : undefined;
  }
  return false;
}

export function classifyCycleCapability({ data, error, isPending, isFetching }: {
  data?: unknown;
  error?: unknown;
  isPending?: boolean;
  isFetching?: boolean;
}): CycleCapability {
  if (isPending || isFetching) return "checking";
  if (error) return isUnavailableGetter(error) ? "unsupported" : "error";
  if (typeof data === "bigint" && data >= 0n) return "supported";
  return "error";
}
