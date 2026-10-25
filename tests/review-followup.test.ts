import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { formatUsdc as facadeFormatUsdc, parseUsdc } from "../src/contract.ts";
import { formatUsdc, formatUsdcExact, formatUnitsExact } from "../src/onchain-money.ts";
import { BID_PRESETS, getRaisedBidInput } from "../src/lib/bidPresets.ts";
import { t } from "../src/lib/i18n.ts";

test("T045 canonical display formatter shares function and preserves exact machine conversion", () => {
  assert.equal(facadeFormatUsdc, formatUsdc);
  for (const [raw, display] of [[0n, "0.00"], [1005000n, "1.01"], [1999999n, "2.00"], [9007199254740993123456n, "9,007,199,254,740,993.12"]] as const) {
    assert.equal(formatUsdc(raw), display);
  }
  assert.equal(formatUsdcExact(9007199254740993123456n), "9007199254740993.123456");
  assert.equal(formatUnitsExact(1999999n, 6), "1.999999");
  assert.equal(parseUsdc(".5"), 500000n);
  assert.equal(parseUsdc("invalid"), 0n);
  assert.equal(parseUsdc("1.2345678"), 1234567n);
  assert.doesNotMatch(fs.readFileSync("src/contract.ts", "utf8"), /function formatUsdc\(/);
});

test("T045 bid preset helper adds exact deltas without grouping, NaN or precision loss", () => {
  for (const [current, delta, expected] of [
    [1000000000n, "0.5", 1000500000n],
    [1234567n, "0.1", 1334567n],
    [9007199254740993123456n, "0.5", 9007199254740993623456n],
    [999999999n, "1", 1000999999n],
  ] as const) {
    const result = getRaisedBidInput(current, delta);
    assert.doesNotMatch(result, /,|NaN|[eE]/);
    assert.equal(parseUsdc(result), expected);
  }
});

const require = createRequire(import.meta.url);
async function loadPanel(file: string) {
  const mocks: Record<string, string> = {
    react: "export const useState=(initial)=>globalThis.__task045Hooks.useState(initial); export const useEffect=()=>{};",
    wagmi: "export const useAccount=()=>({address:'0x1111111111111111111111111111111111111111',chainId:5042002}); export const useSwitchChain=()=>({switchChain(){}}); export const useWaitForTransactionReceipt=()=>({isLoading:false,isSuccess:false});",
    connectkit: "export const useModal=()=>({setOpen(){}});",
    sonner: "export const toast={success(){},error(){}};",
    "../../hooks/useArcWriteContract": "export const useArcWriteContract=()=>({writeContract(){},reset(){},isPending:false});",
  };
  const result = await build({ entryPoints: [file], bundle: true, write: false, format: "cjs", platform: "node", packages: "external", logLevel: "silent", plugins: [{ name: "qa-ui-boundaries", setup(builder) {
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
  if (typeof tree === "string" || typeof tree === "number" || typeof tree === "bigint") return String(tree);
  if (Array.isArray(tree)) return tree.map(textOf).join("");
  return tree?.props ? textOf(tree.props.children) : "";
}
function harness(component: (props: any) => any, props: any) {
  const state: unknown[] = []; let cursor = 0;
  const hook = { useState(initial: unknown) {
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
    return [state[index], (value: unknown) => { state[index] = typeof value === "function" ? value(state[index]) : value; }];
  } };
  return (updates = {}) => {
    cursor = 0; (globalThis as any).__task045Hooks = hook;
    return component({ ...props, ...updates });
  };
}
const baseProps = {
  state: 1, currentRound: 2n, contributionAmount: 10_000_000n,
  isMember: true, hasWon: false, isKicked: false, hasContributed: true,
  allowance: 10n ** 40n, onSuccess() {}, language: "en", userBid: 1000000000n,
  account: { address: "0x1111111111111111111111111111111111111111" }, bundler: {},
  endTime: BigInt(Math.floor(Date.now() / 1000) + 86400), lockedCollateral: 0n,
};

test("T046 shared initial presets and permissionless notices execute in both wallet panels", async () => {
  assert.deepEqual(BID_PRESETS, ["1", "2", "5", "10"]);
  assert.ok(Object.isFrozen(BID_PRESETS));
  try {
    for (const name of ["ActionPanel", "PasskeyActionPanel"]) {
      const source = fs.readFileSync(`src/components/savings/${name}.tsx`, "utf8");
      assert.equal(source.match(/BID_PRESETS\.map/g)?.length, 2);
      const mod = await loadPanel(`src/components/savings/${name}.tsx`);
      for (const language of ["vi", "en"]) {
        const render = harness(mod[name], { ...baseProps, userBid: 0n, language });
        let tree = render();
        const notice = t("actionPanel.permissionlessNotice", language);
        assert.ok(textOf(tree).includes(notice), `${name}/${language}: notice rendered`);
        assert.match(notice, language === "en" ? /anyone/i : /bất kỳ ai/i);
        assert.match(notice, language === "en" ? /deadline/i : /hạn/i);
        assert.match(notice, language === "en" ? /does not slash/i : /không.*tịch thu|không.*trừ/i);
        for (const preset of BID_PRESETS) {
          const button = nodes(tree).find(node => node.type === "button" && textOf(node) === `+${preset} USDC`);
          assert.ok(button, `${name}: initial ${preset} preset`);
          button.props.onClick(); tree = render();
          assert.ok(nodes(tree).some(node => node.type === "input" && node.props.value === preset), `${name}: initial input ${preset}`);
        }
      }
    }
  } finally { delete (globalThis as any).__task045Hooks; }
});

test("T045 both real panel preset buttons preserve exact bigint input", async () => {
  try {
    for (const name of ["ActionPanel", "PasskeyActionPanel"]) {
      const mod = await loadPanel(`src/components/savings/${name}.tsx`);
      for (const current of [1000000000n, 1234567n, 9007199254740993123456n]) {
        const render = harness(mod[name], { ...baseProps, userBid: current });
        let tree = render();
        const toggle = nodes(tree).find(node => node.type === "button" && textOf(node) === t("actionPanel.raiseBidToggle", "en"));
        assert.ok(toggle, `${name}: raise toggle present`); toggle.props.onClick();
        tree = render();
        for (const delta of ["1", "2", "5", "10"]) {
          const button = nodes(tree).find(node => node.type === "button" && textOf(node) === `+${delta} USDC`);
          assert.ok(button, `${name}: unchanged +${delta} preset`); button.props.onClick();
          tree = render();
          const input = nodes(tree).find(node => node.type === "input" && node.props.placeholder?.startsWith("> "));
          assert.ok(input, `${name}: raise input`);
          assert.equal(parseUsdc(input.props.value), current + BigInt(delta) * 1000000n);
          assert.doesNotMatch(input.props.value, /,|NaN|[eE]/);
        }
      }
    }
  } finally { delete (globalThis as any).__task045Hooks; }
});

test("T045 completed and zero-collateral notices are rendered in both languages and wallet panels", async () => {
  try {
    for (const name of ["ActionPanel", "PasskeyActionPanel"]) {
      const mod = await loadPanel(`src/components/savings/${name}.tsx`);
      for (const language of ["vi", "en"]) {
        const render = harness(mod[name], { ...baseProps, language });
        const completed = textOf(render({ state: 2 }));
        assert.match(completed, language === "en" ? /collateral/i : /ký quỹ/i);
        assert.match(completed, language === "en" ? /not automatically|does not automatically|no automatic|not restored or deposited automatically/i : /không tự/i);
        assert.match(completed, language === "en" ? /kicked|expelled/i : /bị loại|bị kick/i);
        assert.doesNotMatch(completed, /every member wins the Pot exactly once|has completed all rounds|hoàn thành tất cả các vòng/i);
        const activeZero = textOf(render({ state: 1, lockedCollateral: 0n }));
        const activeUnknown = textOf(render({ state: 1, lockedCollateral: undefined }));
        const activeFunded = textOf(render({ state: 1, lockedCollateral: 100000n }));
        assert.notEqual(activeZero, activeUnknown, `${name}/${language}: zero balance has explicit warning`);
        assert.notEqual(activeZero, activeFunded, `${name}/${language}: funded view differs from no collateral`);
        assert.match(activeZero, language === "en" ? /no locked collateral|no collateral|zero collateral/i : /chưa có ký quỹ|không có ký quỹ/i);
        const zeroVault = render({ state: 1, lockedCollateral: 0n, collateralAmount: 100000n });
        const vaultAmount = nodes(zeroVault).find(node => node.type === "span" &&
          node.props.className?.includes("font-black") && node.props.className?.includes("text-amber-300"));
        assert.ok(vaultAmount, `${name}/${language}: vault amount rendered for configured collateral`);
        assert.equal(textOf(vaultAmount), "0.0000", `${name}/${language}: explicit zero must not display configured target as locked`);
      }
    }
  } finally { delete (globalThis as any).__task045Hooks; }
});
