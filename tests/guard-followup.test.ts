import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { isPositiveAmount, parseSwapAmount } from "../src/lib/swapSafety.ts";
import { normalizeExplorerTransaction, normalizeLocalTransaction, usdcVolumeByDay } from "../src/lib/arcAnalytics.ts";

const require = createRequire(import.meta.url);
const ACCOUNT = "0x1111111111111111111111111111111111111111";
const invalid = ["", " ", "junk", "12junk", "NaN", "Infinity", "-Infinity", "1e3", "0", "0.000000", "-1", "-0.1", ".5", "1.", "+1", " 1", "1 ", "1,000"];
const positive = ["1", "0.5", "1.234567", "9007199254740993.123456", "0001.000000"];

async function productionModule(file: string, mocks: Record<string, string> = {}) {
  const result = await build({ entryPoints: [file], bundle: true, write: false, format: "cjs", platform: "node", packages: "external", logLevel: "silent", define: { "import.meta.env": "{}" }, plugins: [{ name: "qa-guard-boundaries", setup(builder) {
    builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: "qa-boundary" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "qa-boundary" }, args => ({ contents: mocks[args.path], loader: "js" }));
  } }] });
  const mod = { exports: {} as any };
  new Function("module", "exports", "require", result.outputFiles[0].text)(mod, mod.exports, require);
  return mod.exports;
}
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
// Controlled hook state isolates the real disabled expression. Effects are suppressed:
// balance/network side effects are deliberately outside these guard-only tests.
function guardHarness(component: any, props: any) {
  const state: any[] = [], initial: any[] = []; let cursor = 0;
  const hooks = {
    useState(value: any) { const i = cursor++; if (!(i in state)) { initial[i] = value; state[i] = typeof value === "function" ? value() : value; }
      return [state[i], (v: any) => { state[i] = typeof v === "function" ? v(state[i]) : v; }]; },
    useRef(value: any) { const i = cursor++; if (!(i in state)) state[i] = { current: value }; return state[i]; },
  };
  return {
    render(updates = {}) { cursor = 0; (globalThis as any).__task047Hooks = hooks; return component({ ...props, ...updates }); },
    setUniqueInitial(value: any, next: any) { const indexes = initial.flatMap((v, i) => Object.is(v, value) ? [i] : []); assert.equal(indexes.length, 1, `unique state initial ${value}`); state[indexes[0]] = next; },
    setFirstBoolean(next: boolean) { const index = initial.findIndex(v => v === false); assert.ok(index >= 0); state[index] = next; },
  };
}
const reactBoundary = `export const useState=(x)=>globalThis.__task047Hooks.useState(x); export const useEffect=()=>{}; export const useRef=(x)=>globalThis.__task047Hooks.useRef(x); export default {useRef};`;
const chainBoundary = `export const globalRpcProvider={}; export const switchOrAddArcNetwork=()=>{throw Error('unexpected wallet action')}; export const forceUpdateArcRpc=()=>{throw Error('unexpected wallet action')};`;

test("T047 positive-amount wrapper matches strict existing parser without floating conversion", () => {
  for (const decimals of [6, 8, 18]) {
    for (const amount of invalid) assert.equal(isPositiveAmount(amount, decimals), false, `${decimals}/${amount}`);
    for (const amount of positive) assert.equal(isPositiveAmount(amount, decimals), true, `${decimals}/${amount}`);
    const minimum = `0.${"0".repeat(decimals - 1)}1`;
    const excessNonzero = `0.${"0".repeat(decimals)}1`;
    assert.equal(parseSwapAmount(minimum, decimals), 1n); assert.equal(isPositiveAmount(minimum, decimals), true);
    assert.throws(() => parseSwapAmount(excessNonzero, decimals)); assert.equal(isPositiveAmount(excessNonzero, decimals), false);
    assert.equal(isPositiveAmount("1.0000000000000000000", decimals), true, "extra representable trailing zeros accepted by existing parser");
    assert.equal(parseSwapAmount("9007199254740993.123456", decimals), 9007199254740993n * 10n ** BigInt(decimals) + 123456n * 10n ** BigInt(decimals - 6));
  }
});

test("T047 chart volume combines USDC6 and native18 without including non-USDC, failed or incoming", () => {
  const native = normalizeExplorerTransaction({ hash: "native", timestamp: "2026-10-25T00:00:00Z", from: { hash: ACCOUNT }, value: "1000000000000000001", status: "ok" })!;
  const localBase = { id: "local", action: "Transfer", amount: "1.234567", from: ACCOUNT, to: "0x2222222222222222222222222222222222222222", timestamp: Date.parse("2026-10-25T01:00:00Z"), status: "COMPLETE" as const };
  const local = normalizeLocalTransaction({ ...localBase, tokenSymbol: "USDC" })!;
  const eurc = normalizeLocalTransaction({ ...localBase, tokenSymbol: "EURC" })!;
  const btc = normalizeLocalTransaction({ ...localBase, tokenSymbol: "cirBTC" })!;
  assert.deepEqual(usdcVolumeByDay([native, local, eurc, btc, { ...local, status: "error" }, { ...local, from: { hash: localBase.to } }], ACCOUNT), [{ date: "2026-10-25", raw: 2234567000000000001n }]);
  assert.equal(local.valueRaw, 1234567n, "normalization must not mutate ERC20 raw source units");
  assert.equal(native.valueRaw, 1000000000000000001n);
});

test("T047 actual swap submit guard uses selected token precision and preserves wallet/busy guards", async () => {
  let walletCalls = 0;
  try {
    const mod = await productionModule("src/components/savings/ArcAppKitModal.tsx", {
      react: reactBoundary,
      "../../lib/arcSwap": "export const ARC_ROUTER='0x509cF58CdA08C7aee83a2BdBb4A1Eac907343D01'; export const executeArcSwap=()=>{throw Error('unexpected swap')};",
      "../../utils/arcChain": chainBoundary,
    });
    const ui = guardHarness(mod.ArcAppKitModal, { isOpen: true, onClose() {}, language: "en", connectedAccount: ACCOUNT, connector: { getProvider: async () => { walletCalls++; throw Error("unexpected wallet access"); } } });
    let tree = ui.render();
    for (const [token, decimals] of [["USDC", 18], ["EURC", 6], ["cirBTC", 8]] as const) {
      nodes(tree).find(n => n.type === "select").props.onChange({ target: { value: token } }); tree = ui.render();
      const samples: [string, boolean][] = [...invalid.map(v => [v, true] as [string, boolean]), ...positive.map(v => [v, false] as [string, boolean]),
        [`0.${"0".repeat(decimals - 1)}1`, false], [`0.${"0".repeat(decimals)}1`, true], ["1.0000000000000000000", false]];
      for (const [amount, disabled] of samples) {
        nodes(tree).find(n => n.type === "input" && n.props.placeholder === "0.00").props.onChange({ target: { value: amount } }); tree = ui.render();
        assert.equal(nodes(tree).find(n => n.type === "button" && n.props.type === "submit").props.disabled, disabled, `${token}/${amount}`);
      }
    }
    nodes(tree).find(n => n.type === "input" && n.props.placeholder === "0.00").props.onChange({ target: { value: "1" } });
    tree = ui.render({ connectedAccount: null }); assert.equal(nodes(tree).find(n => n.type === "button" && n.props.type === "submit").props.disabled, true);
    ui.setFirstBoolean(true); tree = ui.render(); assert.equal(nodes(tree).find(n => n.type === "button" && n.props.type === "submit").props.disabled, true);
    assert.equal(walletCalls, 0);
  } finally { delete (globalThis as any).__task047Hooks; }
});

test("T047 actual Merchant withdraw-all guard rejects malformed/zero balances using ERC20 token precision", async () => {
  const savedStorage = (globalThis as any).localStorage;
  (globalThis as any).localStorage = { getItem: () => null, setItem() {} };
  let walletCalls = 0;
  try {
    const mod = await productionModule("src/components/MerchantTreasury.tsx", { react: reactBoundary, "../utils/arcChain": chainBoundary,
      "../lib/TransactionHistory": "export const saveTransaction=()=>{throw Error('unexpected transaction')};" });
    const ui = guardHarness(mod.MerchantTreasury, { connectedAccount: ACCOUNT, walletProvider: { request: async () => { walletCalls++; throw Error("unexpected wallet access"); } } });
    let tree = ui.render();
    for (const [token, decimals] of [["USDC", 6], ["EURC", 6], ["cirBTC", 8]] as const) {
      nodes(tree).find(n => n.type === "select").props.onChange({ target: { value: token } }); tree = ui.render();
      const samples: [string, boolean][] = [...invalid.map(v => [v, true] as [string, boolean]), ...positive.map(v => [v, false] as [string, boolean]),
        [`0.${"0".repeat(decimals - 1)}1`, false], [`0.${"0".repeat(decimals)}1`, true], ["1.0000000000000000000", false]];
      for (const [balance, disabled] of samples) {
        ui.setUniqueInitial("0", balance); tree = ui.render();
        assert.equal(nodes(tree).find(n => n.type === "button" && textOf(n) === "Withdraw all funds to Owner").props.disabled, disabled, `${token}/${balance}`);
      }
    }
    ui.setUniqueInitial("0", "1"); ui.setFirstBoolean(true); tree = ui.render();
    assert.equal(nodes(tree).find(n => n.type === "button" && textOf(n) === "Withdraw all funds to Owner").props.disabled, true);
    assert.equal(walletCalls, 0);
  } finally { (globalThis as any).localStorage = savedStorage; delete (globalThis as any).__task047Hooks; }
});
