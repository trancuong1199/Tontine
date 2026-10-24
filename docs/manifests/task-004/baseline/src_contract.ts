import artifact from "../contracts/out/RotatingSavings.sol/RotatingSavings.json" with { type: "json" };

export const ROTATING_SAVINGS_ADDRESS =
  "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b" as const;

export const ROTATING_SAVINGS_ABI = artifact.abi;

export const ARC_TESTNET_CHAIN_ID = 5042002 as const;
export const USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as const;
export const USDC_DECIMALS = 6;

// GroupState enum values from contract
export const GROUP_STATE = {
  OPEN: 0,
  ACTIVE: 1,
  COMPLETED: 2,
  CANCELLED: 3,
} as const;

export type GroupStateKey = keyof typeof GROUP_STATE;

export function formatUsdc(raw: bigint): string {
  const n = Number(raw) / 10 ** USDC_DECIMALS;
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseUsdc(amount: string): bigint {
  if (typeof amount !== "string") return 0n;
  const trimmed = amount.trim();
  if (!trimmed) return 0n;
  if (!/^\d+(\.\d+)?$/.test(trimmed) && !/^\.\d+$/.test(trimmed)) {
    return 0n;
  }
  const [wholePart = "0", fracPart = ""] = trimmed.includes(".")
    ? trimmed.startsWith(".") ? ["0", trimmed.slice(1)] : trimmed.split(".")
    : [trimmed, ""];
  const paddedFrac = fracPart.slice(0, USDC_DECIMALS).padEnd(USDC_DECIMALS, "0");
  const cleanWhole = wholePart.replace(/^0+/, "") || "0";
  return BigInt(cleanWhole) * 10n ** BigInt(USDC_DECIMALS) + BigInt(paddedFrac);
}

export function isValidAddress(address: unknown): address is `0x${string}` {
  if (typeof address !== "string") return false;
  const trimmed = address.trim();
  return /^0x[0-9a-fA-F]{40}$/.test(trimmed);
}

export function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatCountdown(endTime: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(endTime) - now;
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function stateLabel(state: number): string {
  switch (state) {
    case GROUP_STATE.OPEN: return "Mở tham gia";
    case GROUP_STATE.ACTIVE: return "Đang chạy";
    case GROUP_STATE.COMPLETED: return "Hoàn thành";
    case GROUP_STATE.CANCELLED: return "Đã huỷ";
    default: return "Không rõ";
  }
}

export function parseContractError(error: unknown): string {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? "";
  if (msg.includes("user rejected") || msg.includes("user denied")) return "Đã huỷ giao dịch.";
  if (msg.includes("notmember")) return "Bạn chưa là thành viên của nhóm này.";
  if (msg.includes("alreadymember")) return "Bạn đã là thành viên rồi.";
  if (msg.includes("groupnotopen")) return "Nhóm không còn mở để tham gia.";
  if (msg.includes("groupnotactive")) return "Nhóm chưa bắt đầu.";
  if (msg.includes("alreadycontributed")) return "Bạn đã đóng góp rồi.";
  if (msg.includes("roundstillopen")) return "Vòng chưa kết thúc.";
  if (msg.includes("alreadywon")) return "Bạn đã thắng một vòng rồi.";
  if (msg.includes("insufficientbid")) return "Bid phải cao hơn bid hiện tại.";
  if (msg.includes("nopayout")) return "Không có tiền để nhận.";
  if (msg.includes("maxmembersreached")) return "Nhóm đã đủ thành viên.";
  if (msg.includes("insufficient funds") || msg.includes("exceeds balance")) return "Không đủ USDC. Hãy lấy test USDC từ sidebar.";
  if (msg.includes("reverted")) return "Giao dịch thất bại.";
  return "Có lỗi xảy ra. Thử lại nhé.";
}
