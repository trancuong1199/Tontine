import { createViemAdapterFromProvider, createViemAdapterFromPrivateKey } from "@circle-fin/adapter-viem-v2";
import { AppKit } from "@circle-fin/app-kit";
import { arcBalanceProvider } from "../lib/arcBalances";
import { ARC_CHAIN_ID_HEX, ARC_CHAIN_NAME, ARC_RPC, ARC_EXPLORER, ARC_NATIVE_SYMBOL, USDC_NATIVE_DECIMALS } from "../config/arc-constants";

export const globalRpcProvider = arcBalanceProvider;


declare global {
  interface Window {
    ethereum?: any;
  }
}

export const ARC_TESTNET_CONFIG = {
  chainId: ARC_CHAIN_ID_HEX,
  chainName: ARC_CHAIN_NAME,
  rpcUrls: [ARC_RPC],
  nativeCurrency: {
    name: ARC_NATIVE_SYMBOL,
    symbol: ARC_NATIVE_SYMBOL,
    decimals: USDC_NATIVE_DECIMALS,
  },
  blockExplorerUrls: [ARC_EXPLORER],
};

export const SUPPORTED_CHAINS = [
  { name: ARC_CHAIN_NAME, id: "Arc_Testnet", chainIdHex: ARC_CHAIN_ID_HEX, isArc: true },
  { name: "Base Sepolia", id: "Base_Sepolia", chainIdHex: "0x14a34", isArc: false },
  { name: "Arbitrum Sepolia", id: "Arbitrum_Sepolia", chainIdHex: "0x66eee", isArc: false },
  { name: "Avalanche Fuji", id: "Avalanche_Fuji", chainIdHex: "0x2a", isArc: false },
  { name: "Ethereum Sepolia", id: "Ethereum_Sepolia", chainIdHex: "0xaa36a7", isArc: false },
];

export async function forceUpdateArcRpc(provider?: any): Promise<boolean> {
  const activeProvider = provider || window.ethereum;
  if (!activeProvider) return false;
  try {
    await activeProvider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: ARC_TESTNET_CONFIG.chainId,
          chainName: ARC_TESTNET_CONFIG.chainName,
          rpcUrls: ARC_TESTNET_CONFIG.rpcUrls,
          nativeCurrency: ARC_TESTNET_CONFIG.nativeCurrency,
          blockExplorerUrls: ARC_TESTNET_CONFIG.blockExplorerUrls,
        },
      ],
    });
    return true;
  } catch (err) {
    console.error("forceUpdateArcRpc error:", err);
    return false;
  }
}

export async function switchOrAddArcNetwork(provider?: any): Promise<boolean> {
  const activeProvider = provider || window.ethereum;
  if (!activeProvider) {
    throw new Error("Wallet provider is not available");
  }

  try {
    // Try switching first
    await activeProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET_CONFIG.chainId }],
    });
    return true;
  } catch (switchError: any) {
    // Fallback: Attempt to add the network if switch fails for any reason
    try {
      await activeProvider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: ARC_TESTNET_CONFIG.chainId,
            chainName: ARC_TESTNET_CONFIG.chainName,
            rpcUrls: ARC_TESTNET_CONFIG.rpcUrls,
            nativeCurrency: ARC_TESTNET_CONFIG.nativeCurrency,
            blockExplorerUrls: ARC_TESTNET_CONFIG.blockExplorerUrls,
          },
        ],
      });
      return true;
    } catch (addError) {
      console.error("Error adding Build on Arc network", addError);
      return false;
    }
  }
}

export async function switchOrAddNetwork(provider: any, chainIdHex: string, chainName: string, rpcUrl: string, symbol: string, decimals: number, explorer: string): Promise<boolean> {
  const activeProvider = provider || window.ethereum;
  if (!activeProvider) {
    throw new Error("No wallet provider found");
  }

  try {
    await activeProvider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    // Fallback: Attempt to add the network if switch fails for any reason
    try {
      await activeProvider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: chainName,
            rpcUrls: [rpcUrl],
            nativeCurrency: { name: symbol, symbol: symbol, decimals: decimals },
            blockExplorerUrls: [explorer],
          },
        ],
      });
      return true;
    } catch (addError) {
      console.error(`Error adding network ${chainName}`, addError);
      return false;
    }
  }
}

export async function createAdapterFromMetaMask() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not available");
  }
  return await createViemAdapterFromProvider({
    provider: window.ethereum,
  });
}

export function createAdapterFromPrivateKey(privateKey: string) {
  if (!privateKey.startsWith("0x")) {
    privateKey = "0x" + privateKey;
  }
  return createViemAdapterFromPrivateKey({
    privateKey,
  });
}

export function initAppKit(): AppKit {
  return new AppKit();
}
