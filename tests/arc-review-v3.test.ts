import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { AbiCoder, Interface } from "ethers";
import { readArcTokenBalance, readArcBalances, formatArcBalance, toApproximateChartValue, arcBalanceProvider } from "../src/lib/arcBalances.ts";
import { buildTokenHoldings, parseUnsignedRaw, normalizeExplorerTransaction, normalizeLocalTransaction, formatAnalyticsValue, formatNativeFee, sumKnownFees, usdcVolumeByDay } from "../src/lib/arcAnalytics.ts";
import * as constants from "../src/config/arc-constants.ts";
import { getUsdc, requireChain } from "../src/onchain-facts.ts";
import { parseContractError } from "../src/contract.ts";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";
const HUGE = 9007199254740993123456n;
const abi = new Interface(["function balanceOf(address) view returns (uint256)"]);
const codec = AbiCoder.defaultAbiCoder();
const read = (path: string) => fs.readFileSync(path, "utf8");
const require = createRequire(import.meta.url);

async function productionModule(file: string, mocks: Record<string, string> = {}) {
  const result = await build({ entryPoints: [file], bundle: true, write: false, format: "cjs", platform: "node", packages: "external", logLevel: "silent", define: { "import.meta.env": "{}" }, plugins: [{ name: "qa-boundaries", setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: "qa-boundary" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "qa-boundary" }, args => ({ contents: mocks[args.path], loader: "js" }));
  } }] });
  const mod = { exports: {} as any };
  new Function("module", "exports", "require", result.outputFiles[0].text)(mod, mod.exports, require);
  return mod.exports;
}

test("T046 ERC20 reader sends canonical balanceOf and preserves bigint; individual read failures remain null", async () => {
  const calls: any[] = [];
  const runner = { call: async (request: any) => {
    calls.push(request);
    assert.equal(abi.parseTransaction({ data: request.data })?.name, "balanceOf");
    assert.equal(abi.decodeFunctionData("balanceOf", request.data)[0], ACCOUNT);
    if (request.to.toLowerCase() === constants.EURC_ADDRESS.toLowerCase()) throw Error("RPC unavailable");
    return codec.encode(["uint256"], [request.to.toLowerCase() === constants.USDC_ADDRESS.toLowerCase() ? HUGE : 1n]);
  }, getBalance: async () => { throw Error("native balance must never be requested"); } };
  assert.equal(await readArcTokenBalance(ACCOUNT, "USDC", runner), HUGE);
  const result = await readArcBalances(ACCOUNT, runner);
  assert.deepEqual(result, { usdc: HUGE, eurc: null, cirbtc: 1n });
  assert.equal(calls[0].to.toLowerCase(), constants.USDC_ADDRESS.toLowerCase());
  assert.equal(arcBalanceProvider._network.chainId, 5042002n);
  assert.equal(arcBalanceProvider._getConnection().url, requireChain(5042002).rpcUrls[0]);
  await assert.rejects(readArcTokenBalance(ACCOUNT, "USDC", { call: async () => { throw Error("offline"); } }), /offline/);
  assert.deepEqual(await readArcBalances(ACCOUNT, { call: async () => { throw Error("offline"); } }), { usdc: null, eurc: null, cirbtc: null });
});

test("T046 balance display is exact before rounding and chart conversions stay finite", () => {
  assert.equal(formatArcBalance(HUGE, "USDC"), "9,007,199,254,740,993.12");
  assert.equal(formatArcBalance(1999999n, "USDC"), "2.00");
  assert.equal(formatArcBalance(0n, "USDC"), "0.00");
  assert.equal(formatArcBalance(1n, "USDC"), "0.00");
  assert.equal(formatArcBalance(null, "USDC"), "—");
  assert.match(formatArcBalance(HUGE, "EURC"), /9007199254740993/);
  assert.match(formatArcBalance(900719925474099312345678n, "cirBTC"), /9007199254740993/);
  assert.equal(toApproximateChartValue(1000123456n, 6), 1000.123456);
  assert.equal(toApproximateChartValue(1n, 6), 0.000001);
  for (const raw of [HUGE, 10n ** 400n, null]) assert.ok(Number.isFinite(toApproximateChartValue(raw, 6)));
});

test("T046 holdings use canonical token address identity, not symbol or native dual view", () => {
  const fakeUsdc = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
  const row = (address: unknown, symbol = "USDC", value: unknown = "1234567", decimals: unknown = "6") => ({ token: { address_hash: address, symbol, decimals }, value });
  const holdings = buildTokenHoldings(HUGE, [
    row(constants.USDC_ADDRESS.toUpperCase().replace("0X", "0x"), "USDC", "999999999999999999999"),
    row(constants.USDC_ADDRESS), row(fakeUsdc), row(fakeUsdc.toUpperCase().replace("0X", "0x")),
    row(constants.WUSDC_ADDRESS, "WUSDC"), row(undefined), row("bad"), row(OTHER, "BAD", "NaN"), row(OTHER, "BAD", "12", "junk"),
    row(OTHER, "BAD", "12", -1), row(OTHER, "BAD", "12", 256), null,
  ]);
  assert.equal(holdings.length, 3);
  assert.equal(holdings.filter(h => h.address === constants.USDC_ADDRESS.toLowerCase()).length, 1);
  assert.equal(holdings.find(h => h.address === constants.USDC_ADDRESS.toLowerCase())!.raw, HUGE);
  assert.equal(holdings.find(h => h.address === fakeUsdc)!.raw, 1234567n);
  assert.ok(holdings.some(h => h.address === constants.WUSDC_ADDRESS.toLowerCase()));
  assert.deepEqual(buildTokenHoldings(null, [row(constants.USDC_ADDRESS)]), [], "failed canonical read must not invent balance from duplicate explorer row");
  for (const value of ["bad", "-1", 5, "1.2", "1e6", undefined]) assert.equal(parseUnsignedRaw(value), null);
});

test("T046 explorer and local transactions preserve decimals, symbols and unknown fees", () => {
  const explorer = normalizeExplorerTransaction({ hash: "0xabc", timestamp: "2026-10-25T00:00:00Z", from: { hash: ACCOUNT }, value: "1000000000000000001", fee: { value: "1234567890123456789" }, status: "ok" })!;
  assert.equal(formatAnalyticsValue(explorer), "1.000000000000000001 USDC");
  assert.equal(formatNativeFee(explorer.feeRaw), "1.234567890123456789 USDC");
  const base = { id: "local", action: "Transfer", amount: "1.234567", from: ACCOUNT, to: OTHER, txHash: "", timestamp: Date.parse("2026-10-25T01:00:00Z"), status: "COMPLETE" as const };
  const usdc = normalizeLocalTransaction({ ...base, tokenSymbol: "USDC" })!;
  const eurc = normalizeLocalTransaction({ ...base, tokenSymbol: "EURC" })!;
  const btc = normalizeLocalTransaction({ ...base, amount: "1.23456789", tokenSymbol: "cirBTC" })!;
  const unknown = normalizeLocalTransaction(base)!;
  assert.equal(formatAnalyticsValue(usdc), "1.234567 USDC");
  assert.equal(formatAnalyticsValue(eurc), "1.234567 EURC");
  assert.equal(formatAnalyticsValue(btc), "1.23456789 cirBTC");
  assert.equal(unknown.valueRaw, null); assert.equal(unknown.isUsdc, false); assert.equal(formatAnalyticsValue(unknown), "—");
  assert.equal(usdc.feeRaw, null); assert.equal(formatNativeFee(usdc.feeRaw), "—");
  assert.equal(sumKnownFees([usdc, eurc, btc]), null);
  assert.equal(sumKnownFees([explorer, usdc, eurc, btc]), 1234567890123456789n);
  assert.deepEqual(usdcVolumeByDay([explorer, usdc, eurc, btc, unknown, { ...usdc, status: "pending" }, { ...usdc, from: { hash: OTHER } }], ACCOUNT), [{ date: "2026-10-25", raw: 2234567000000000001n }]);
  assert.equal(normalizeLocalTransaction({ ...base, timestamp: 1e20 }), null);
  assert.equal(normalizeExplorerTransaction({ hash: "x", timestamp: "invalid" }), null);
  assert.equal(normalizeLocalTransaction({ ...base, tokenSymbol: "USDC", amount: "NaN" })!.valueRaw, null);
  for (const tokenSymbol of ["__proto__", "constructor", "NotUSDC", 123]) {
    const malformed = normalizeLocalTransaction({ ...base, tokenSymbol } as any)!;
    assert.equal(malformed.valueRaw, null); assert.equal(malformed.isUsdc, false); assert.equal(malformed.decimals, null);
  }
});

test("T046 configuration retains Arc facts, token distinctions and non-Arc chain metadata", async () => {
  const fact = requireChain(5042002), usdc = getUsdc(5042002)!;
  assert.equal(constants.ARC_CHAIN_ID, BigInt(fact.chainId)); assert.equal(constants.ARC_RPC, fact.rpcUrls[0]);
  assert.equal(constants.ARC_EXPLORER, fact.explorerBase); assert.equal(constants.USDC_ADDRESS, usdc.address);
  assert.equal(constants.USDC_ERC20_DECIMALS, 6); assert.equal(constants.USDC_NATIVE_DECIMALS, 18);
  assert.equal(constants.EURC_ADDRESS, "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a");
  assert.equal(constants.CIRBTC_ADDRESS, "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF");
  assert.equal(constants.WUSDC_ADDRESS, "0x911b4000D3422F482F4062a913885f7b035382Df");
  assert.notEqual(constants.WUSDC_ADDRESS, constants.USDC_ADDRESS);
  const network = await productionModule("src/config/arcNetwork.ts");
  assert.equal(network.arcTestnet.rpcUrls.default.http[0], constants.ARC_RPC);
  assert.equal(network.arcTestnet.nativeCurrency.decimals, 18);
  assert.equal(network.ARC_USDC_ADDRESS, constants.USDC_ADDRESS);
  const chain = await productionModule("src/utils/arcChain.ts", { "@circle-fin/adapter-viem-v2": "export const createViemAdapterFromProvider=()=>{}; export const createViemAdapterFromPrivateKey=()=>{};", "@circle-fin/app-kit": "export class AppKit {}" });
  assert.equal(chain.ARC_TESTNET_CONFIG.rpcUrls[0], constants.ARC_RPC);
  assert.deepEqual(chain.SUPPORTED_CHAINS.filter((c: any) => !c.isArc).map((c: any) => c.chainIdHex), ["0x14a34", "0x66eee", "0x2a", "0xaa36a7"]);
  const requests: any[] = [];
  const provider = { request: async (request: any) => { requests.push(request); if (request.method === "wallet_switchEthereumChain") throw Error("unknown chain"); } };
  assert.equal(await chain.switchOrAddNetwork(provider, "0xaa36a7", "Ethereum Sepolia", "https://sepolia.example", "ETH", 18, "https://sepolia.explorer"), true);
  assert.deepEqual(requests[1].params[0], { chainId: "0xaa36a7", chainName: "Ethereum Sepolia", rpcUrls: ["https://sepolia.example"], nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, blockExplorerUrls: ["https://sepolia.explorer"] });
  await assert.rejects(productionModule("src/config/arc-constants.ts", { "../onchain-facts.ts": "export const requireChain=()=>({chainId:5042002}); export const getUsdc=()=>undefined;" }), /USDC is not configured/);
});

test("T046 AlreadyWon matches current-cycle bid and manual-kick restrictions", () => {
  const message = parseContractError({ message: "AlreadyWon()" });
  assert.match(message, /chu kỳ/i); assert.match(message, /bid/i); assert.match(message, /loại/i);
  assert.doesNotMatch(message, /Task-018|phiên bản.*cũ/i);
});

test("T046 all balance consumers and Merchant use shared sources without native balance reparsing", () => {
  for (const file of ["src/components/savings/ArcAppKitModal.tsx", "src/components/RightSidebar.tsx", "src/components/ArcAppKit.tsx", "src/components/Dashboard.tsx", "src/components/Analytics.tsx"]) {
    const source = read(file);
    assert.match(source, /readArcBalances|readArcTokenBalance/, file);
    assert.doesNotMatch(source, /\.getBalance\(/, `${file}: no native balance fallback`);
    assert.doesNotMatch(source, /parseFloat\(balances\.|Number\(formatUsdc\(/, `${file}: do not reparse display`);
  }
  const merchant = read("src/components/MerchantTreasury.tsx");
  assert.doesNotMatch(merchant, /0x3600000000000000000000000000000000000000/);
  assert.match(merchant, /TOKEN_ADDRESSES\.USDC/);
});

function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...nodes(tree.props?.children)];
}
function textOf(tree: any): string {
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  if (Array.isArray(tree)) return tree.map(textOf).join("");
  return tree?.props ? textOf(tree.props.children) : "";
}
function lifecycle(component: any, initialProps: any) {
  const slots: any[] = []; let cursor = 0;
  let effects: (() => void)[] = [];
  const changed = (a: any[] | undefined, b: any[] | undefined) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
  const hooks = {
    useState(initial: any) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], (v: any) => { slots[i] = typeof v === "function" ? v(slots[i]) : v; }]; },
    useRef(initial: any) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useMemo(fn: any, deps: any[]) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useCallback(fn: any, deps: any[]) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn: any, deps: any[]) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) {
      const old = slots[i]; slots[i] = { deps }; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); });
    } },
  };
  return {
    render(updates = {}) { cursor = 0; (globalThis as any).__task046Hooks = hooks; return component({ ...initialProps, ...updates }); },
    async flush() { const pending = effects; effects = []; pending.forEach(effect => effect()); await new Promise(resolve => setImmediate(resolve)); },
  };
}
const reactBoundary = `export const useState=(x)=>globalThis.__task046Hooks.useState(x); export const useEffect=(f,d)=>globalThis.__task046Hooks.useEffect(f,d); export const useRef=(x)=>globalThis.__task046Hooks.useRef(x); export const useMemo=(f,d)=>globalThis.__task046Hooks.useMemo(f,d); export const useCallback=(f,d)=>globalThis.__task046Hooks.useCallback(f,d); export default {};`;
const balanceBoundary = `export const readArcBalances=(a)=>globalThis.__task046Balance.readAll(a); export const readArcTokenBalance=(a,t)=>globalThis.__task046Balance.read(a,t); export const formatArcBalance=(...x)=>globalThis.__task046Balance.format(...x); export const toApproximateChartValue=(...x)=>globalThis.__task046Balance.chart(...x);`;

test("T046 actual Dashboard lifecycle renders exact balance, unavailable errors and ignores wrong-chain wallet reads", async () => {
  const savedWindow = (globalThis as any).window;
  (globalThis as any).window = { addEventListener() {}, removeEventListener() {} };
  try {
    let result = { usdc: HUGE, eurc: 0n, cirbtc: null };
    let calls = 0;
    (globalThis as any).__task046Balance = { format: formatArcBalance, chart: toApproximateChartValue,
      readAll: async (account: string) => { assert.equal(account, ACCOUNT); calls++; return result; } };
    const mod = await productionModule("src/components/Dashboard.tsx", {
      react: reactBoundary, "../lib/arcBalances": balanceBoundary,
      "../lib/TransactionHistory": "export const getTransactionHistory=()=>[];",
      "./RightSidebar": "export const RightSidebar=()=>null;",
      "../utils/arcChain": "export const globalRpcProvider={};",
    });
    let injectedRequests = 0;
    const ui = lifecycle(mod.Dashboard, { connectedAccount: ACCOUNT, navigateTo() {}, getProvider: () => ({ request: async () => { injectedRequests++; return "0x1"; } }) });
    ui.render(); await ui.flush(); let tree = ui.render();
    let card = nodes(tree).find(n => n.props?.symbol === "USDC" && "balance" in n.props);
    assert.equal(card.props.balance, "9,007,199,254,740,993.12"); assert.equal(card.props.loading, false);
    assert.match(textOf(card.type(card.props)), /9,007,199,254,740,993\.12/);
    assert.equal(calls, 1); assert.equal(injectedRequests, 0);
    result = { usdc: null, eurc: null, cirbtc: null } as any;
    await nodes(tree).find(n => n.type === "button" && n.props.title === "Refresh balances").props.onClick();
    tree = ui.render(); card = nodes(tree).find(n => n.props?.symbol === "USDC" && "balance" in n.props);
    assert.equal(card.props.balance, "—", "failed read cannot retain prior balance or fabricate zero");
    result = { usdc: 0n, eurc: 0n, cirbtc: 0n };
    await nodes(tree).find(n => n.type === "button" && n.props.title === "Refresh balances").props.onClick();
    assert.equal(nodes(ui.render()).find(n => n.props?.symbol === "USDC" && "balance" in n.props).props.balance, "0.00");
  } finally { (globalThis as any).window = savedWindow; delete (globalThis as any).__task046Hooks; delete (globalThis as any).__task046Balance; }
});

test("T046 actual Analytics integrates deduped chart, exact rows, unknown local fees and RPC failure", async () => {
  const savedFetch = globalThis.fetch;
  try {
    let offline = false;
    const calls: string[] = [];
    (globalThis as any).__task046Balance = { format: formatArcBalance, chart: toApproximateChartValue,
      read: async (account: string, token: string) => { assert.equal(account, ACCOUNT); assert.equal(token, "USDC"); if (offline) throw Error("offline"); return HUGE; } };
    const local = ["USDC", "EURC", "cirBTC", "Unknown"].map((symbol, i) => ({ id: `local-${i}`, txHash: `local-${i}`, action: "Transfer", tokenSymbol: symbol, amount: symbol === "cirBTC" ? "1.23456789" : "1.234567", timestamp: Date.parse("2026-10-25T01:00:00Z"), from: ACCOUNT, to: OTHER, status: "COMPLETE" }));
    globalThis.fetch = (async (url: string) => { calls.push(url); return { ok: true, json: async () => ({ items: url.endsWith("/tokens") ? [
      { token: { address_hash: constants.USDC_ADDRESS, symbol: "USDC", decimals: "6" }, value: "999000000" },
      { token: { address_hash: OTHER, symbol: "USDC", decimals: "6" }, value: "2000000" },
    ] : [{ hash: "explorer", timestamp: "2026-10-25T00:00:00Z", from: { hash: ACCOUNT }, value: "1000000000000000001", fee: { value: "1234567890123456789" }, status: "ok" }] }) }; }) as any;
    const mod = await productionModule("src/components/Analytics.tsx", { react: reactBoundary, "../lib/arcBalances": balanceBoundary,
      "../lib/TransactionHistory": `export const getTransactionHistory=()=>${JSON.stringify(local)};` });
    const ui = lifecycle(mod.Analytics, { address: ACCOUNT });
    ui.render(); await ui.flush(); let tree = ui.render();
    const stat = (label: string) => nodes(tree).find(n => n.props?.label === label)?.props.value;
    assert.equal(stat("USDC Balance"), "9,007,199,254,740,993.12 USDC");
    assert.equal(stat("Token Holdings"), "2");
    assert.equal(stat("Known Gas Fees (loaded transactions)"), "1.234567890123456789 USDC");
    const pie = nodes(tree).find(n => n.props?.dataKey === "value" && "innerRadius" in n.props);
    assert.equal(pie.props.data.length, 2); assert.equal(pie.props.data.filter((x: any) => x.name === "USDC").length, 1);
    assert.ok(pie.props.data.some((x: any) => x.name.startsWith("USDC (") && x.value === 2));
    assert.ok(pie.props.data.every((x: any) => Number.isFinite(x.value)));
    const rows = nodes(tree).filter(n => n.type === "tr").map(textOf);
    for (const exact of ["1.000000000000000001 USDC", "1.234567 USDC", "1.234567 EURC", "1.23456789 cirBTC"]) assert.ok(rows.some(row => row.includes(exact)), exact);
    const localRows = nodes(tree).filter(n => n.type === "tr" && textOf(n).includes("local-"));
    assert.equal(localRows.length, 4);
    for (const row of localRows) assert.equal(textOf(nodes(row).filter(n => n.type === "td")[5]), "—");
    const volume = nodes(tree).find(n => n.props?.data?.[0]?.date === "2026-10-25");
    assert.equal(volume.props.data[0].value, 2.234567);
    assert.match(textOf(tree), /approximate/); assert.ok(calls.every(url => url.startsWith(constants.ARC_EXPLORER)));
    offline = true;
    await nodes(tree).find(n => n.type === "button" && textOf(n).includes("Refresh")).props.onClick(); tree = ui.render();
    assert.match(textOf(tree), /unavailable/i); assert.equal(stat("USDC Balance"), undefined);
  } finally { globalThis.fetch = savedFetch; delete (globalThis as any).__task046Hooks; delete (globalThis as any).__task046Balance; }
});
