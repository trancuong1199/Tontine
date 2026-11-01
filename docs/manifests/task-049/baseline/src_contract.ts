import { CIRBTC_ADDRESS as DEFAULT_CIRBTC_ADDRESS } from "./config/arc-constants.ts";
import artifact from "../contracts/out/RotatingSavings.sol/RotatingSavings.json" with { type: "json" };
import { getUsdc, requireChain } from "./onchain-facts.ts";
import { formatUnitsFixed, parseAmount } from "./onchain-money.ts";

export const ROTATING_SAVINGS_ADDRESS =
  "0x6afaa0825d2e05ef00d571d4a043ab5dcc03534b" as const;

export const COLLATERAL_ABI_ITEMS = [
  {
    type: "function",
    name: "cirBtcCollateralAmount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "cirBtcCollateral",
    inputs: [{ name: "member", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimableCirBtc",
    inputs: [{ name: "member", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSlashedCirBtc",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "claimCollateral",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setCollateralAmount",
    inputs: [{ name: "collateralAmount_", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "depositCollateral",
    inputs: [{ name: "amount_", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getMemberCollateralStatus",
    inputs: [{ name: "member", type: "address" }],
    outputs: [
      { name: "lockedCollateral", type: "uint256" },
      { name: "claimableReward", type: "uint256" },
      { name: "eligibleToClaim", type: "bool" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "voteCancelGroup",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelVoteCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "requiredCancelVotes",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasVotedCancel",
    inputs: [{ name: "member", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "startNewCycle",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const ROTATING_SAVINGS_ABI = [
  ...artifact.abi,
  ...COLLATERAL_ABI_ITEMS,
];
export const ROTATING_SAVINGS_BYTECODE = artifact.bytecode.object as `0x${string}`;

const arcTestnetFact = requireChain(5042002);
const arcUsdcFact = getUsdc(5042002);
if (!arcUsdcFact) throw new Error("USDC is not configured for Arc Testnet");

export const ARC_TESTNET_CHAIN_ID = arcTestnetFact.chainId as 5042002;
export const USDC_ADDRESS = arcUsdcFact.address as `0x${string}`;
export const USDC_DECIMALS = arcUsdcFact.decimals;

// TASK-043: Circle Wrapped Bitcoin on Arc Testnet (configurable via VITE_CIRBTC_ADDRESS_TESTNET)
const envCirBtcAddress =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_CIRBTC_ADDRESS_TESTNET;
export function getCirBtcDeploymentAddress(override = envCirBtcAddress): `0x${string}` {
  if (override !== undefined && (!/^0x[0-9a-fA-F]{40}$/.test(override) || /^0x0{40}$/.test(override))) {
    throw new Error("VITE_CIRBTC_ADDRESS_TESTNET must be a nonzero token address");
  }
  return (override ?? DEFAULT_CIRBTC_ADDRESS) as `0x${string}`;
}
// Default only for new deployments; existing clubs read their own cirBtcToken getter.
export const CIRBTC_ADDRESS = DEFAULT_CIRBTC_ADDRESS;
export const CIRBTC_DECIMALS = 8;

export function formatCirBtc(raw: bigint): string {
  const fixed6 = formatUnitsFixed(raw, CIRBTC_DECIMALS, 6);
  const [intPart, fracPart = "000000"] = fixed6.split(".");
  const trimmedFrac = fracPart.replace(/0+$/, "").padEnd(4, "0");
  const groupedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${groupedInt}.${trimmedFrac}`;
}

export function parseCirBtc(amount: string): bigint {
  if (typeof amount !== "string") return 0n;
  const trimmed = amount.trim();
  if (!trimmed) return 0n;
  if (!/^\d+(\.\d+)?$/.test(trimmed) && !/^\.\d+$/.test(trimmed)) {
    return 0n;
  }
  const [wholePart = "0", fracPart = ""] = trimmed.includes(".")
    ? trimmed.startsWith(".") ? ["0", trimmed.slice(1)] : trimmed.split(".")
    : [trimmed, ""];
  const paddedFrac = fracPart.slice(0, CIRBTC_DECIMALS).padEnd(CIRBTC_DECIMALS, "0");
  const cleanWhole = wholePart.replace(/^0+/, "") || "0";
  return BigInt(cleanWhole) * 10n ** BigInt(CIRBTC_DECIMALS) + BigInt(paddedFrac);
}

// GroupState enum values from contract
export const GROUP_STATE = {
  OPEN: 0,
  ACTIVE: 1,
  COMPLETED: 2,
  CANCELLED: 3,
} as const;

export type GroupStateKey = keyof typeof GROUP_STATE;

export { formatUsdc } from "./onchain-money.ts";

export function parseUsdc(amount: string): bigint {
  if (typeof amount !== "string") return 0n;
  const trimmed = amount.trim();
  if (!trimmed) return 0n;
  if (!/^\d+(\.\d+)?$/.test(trimmed) && !/^\.\d+$/.test(trimmed)) {
    return 0n;
  }
  const normalized = trimmed.startsWith(".") ? `0${trimmed}` : trimmed;
  const [wholePart = "0", fracPart] = normalized.split(".");
  const capped =
    fracPart !== undefined
      ? `${wholePart}.${fracPart.slice(0, USDC_DECIMALS)}`
      : wholePart;
  try {
    return parseAmount(ARC_TESTNET_CHAIN_ID, capped).raw;
  } catch {
    return 0n;
  }
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
  if (msg.includes("at least one account") || msg.includes("must has at least one account")) {
    return "Ví của bạn chưa mở khóa hoặc chưa kết nối tài khoản. Vui lòng mở tiện ích ví OKX/MetaMask trên trình duyệt, mở khóa ví và chọn tài khoản, sau đó thử lại.";
  }
  if (msg.includes("failed to fetch")) {
    return "Lỗi kết nối RPC Arc Testnet trên ví. Vui lòng mở Arc AppKit -> Đồng bộ RPC, hoặc kiểm tra RPC URL ví là https://rpc.testnet.arc.io.";
  }
  if (msg.includes("erc20insufficientallowance") || msg.includes("insufficient allowance")) {
    return "Chưa cấp quyền (Approve) đủ USDC. Vui lòng bấm Cấp quyền trước khi đóng tiền.";
  }
  if (msg.includes("notmember")) return "Địa chỉ ví của bạn không phải là thành viên của nhóm hụi này.";
  if (msg.includes("alreadymember")) return "Bạn đã là thành viên rồi.";
  if (msg.includes("groupnotopen")) return "Nhóm không còn mở để tham gia.";
  if (msg.includes("groupnotactive")) return "Nhóm chưa bắt đầu.";
  if (msg.includes("alreadycontributed")) return "Bạn đã đóng góp rồi.";
  if (msg.includes("roundstillopen")) return "Vòng hụi chưa kết thúc, chưa thể quyết toán.";
  if (msg.includes("roundended")) return "Thời gian đóng tiền của vòng này đã kết thúc. Vui lòng bấm Kết thúc vòng để chuyển sang vòng tiếp theo.";
  if (msg.includes("alreadywon")) return "Thành viên này đã nhận hụi trong chu kỳ hiện tại; không thể đặt bid hoặc bị loại bằng thao tác này.";
  if (msg.includes("insufficientbid")) return "Bid phải cao hơn bid hiện tại.";
  if (msg.includes("nopayout")) return "Không có tiền để nhận.";
  if (msg.includes("maxmembersreached")) return "Nhóm đã đủ thành viên.";
  if (msg.includes("insufficient funds") || msg.includes("exceeds balance")) return "Không đủ USDC. Hãy lấy test USDC từ sidebar.";
  if (msg.includes("reverted")) return "Giao dịch thất bại.";
  return "Có lỗi xảy ra. Thử lại nhé.";
}
