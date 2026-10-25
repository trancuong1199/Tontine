import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { getContractError, RpcRequestError, ContractFunctionZeroDataError, ContractFunctionRevertedError, parseAbi } from "viem";
import { t } from "../src/lib/i18n.ts";
import { classifyCycleCapability as classify } from "../src/lib/cycleCapabilities.ts";

const require = createRequire(import.meta.url);
const ACCOUNT = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";
const CLUB = "0x3333333333333333333333333333333333333333";
const NEXT_CLUB = "0x4444444444444444444444444444444444444444";
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred<T = any>() { let resolve!: (value: T) => void, reject!: (reason: any) => void; const promise = new Promise<T>((a,b) => { resolve=a;reject=b; });return {promise,resolve,reject}; }
async function productionModule(file: string, mocks: Record<string, string> = {}) {
  const result = await build({ entryPoints: [file], bundle: true, write: false, format: "cjs", platform: "node", packages: "external", logLevel: "silent", define: { "import.meta.env": "{}" }, plugins: [{ name: "qa-cycle-boundaries", setup(builder) {
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
    useEffect(fn: any, deps: any[]) { const i = cursor++; if (!slots[i] || changed(slots[i].deps, deps)) { const old = slots[i]; slots[i] = { deps }; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  return {
    render(updates = {}) { cursor = 0; (globalThis as any).__task048Hooks = hooks; return component({ ...initialProps, ...updates }); },
    async flush() { const pending = effects; effects = []; pending.forEach(effect => effect()); await tick(); },
  };
}
const reactBoundary = `export const useState=(x)=>globalThis.__task048Hooks.useState(x); export const useEffect=(f,d)=>globalThis.__task048Hooks.useEffect(f,d); export const useRef=(x)=>globalThis.__task048Hooks.useRef(x); export const useMemo=(f,d)=>globalThis.__task048Hooks.useMemo(f,d); export const useCallback=(f,d)=>globalThis.__task048Hooks.useCallback(f,d); export default {useRef};`;
const getterAbi = parseAbi(["function cycleStartRound() view returns(uint256)"]);
const getterError = (code: number, message: string) => getContractError(new RpcRequestError({ body: { method: "eth_call" }, error: { code, message }, url: "https://rpc.test.invalid" }), { abi: getterAbi, args: [], address: CLUB, functionName: "cycleStartRound" });
const basePanelProps = {
  state: 2, currentRound: 2n, contributionAmount: 10000000n, isMember: true,
  hasWon: true, isKicked: false, hasContributed: false, allowance: 100000000n,
  account: { address: ACCOUNT }, bundler: {}, contractAddress: CLUB, onSuccess() {},
  language: "en", claimable: 1000000n, claimableCirBtc: 10000n, lockedCollateral: 100000n,
};

test("T048 classifier distinguishes positive capability, definite missing getter and wrapped transport failures", async () => {
  for (const data of [0n, 1n, 50n]) assert.equal(classify({ data }), "supported");
  assert.equal(classify({ isPending: true }), "checking");
  assert.equal(classify({ data: 1n, isFetching: true }), "checking", "retry pending must not leave restart enabled");
  const legacy = getterError(3, "execution reverted");
  assert.ok(legacy.cause instanceof ContractFunctionRevertedError);
  assert.equal(classify({ error: legacy }), "unsupported");
  assert.equal(classify({ error: new ContractFunctionZeroDataError({ functionName: "cycleStartRound" }) }), "unsupported");
  const internal = getterError(-32603, "Upstream RPC unavailable");
  assert.ok(internal.cause instanceof ContractFunctionRevertedError, "fixture reproduces viem's generic internal RPC wrapping");
  for (const error of [internal, getterError(-32005, "rate limited"), Error("execution reverted due to unavailable upstream"), Error("timeout"), new ContractFunctionRevertedError({ abi: getterAbi, functionName: "cycleStartRound", message: "RPC internal failure" })]) {
    assert.equal(classify({ error }), "error");
    assert.equal(classify({ data: 1n, error }), "error", "stale cached success cannot mask failed verification");
  }
  assert.notEqual(classify({ data: "0x" }), "supported");
});

test("T048 actual capability hook pins selected club on Arc and does not reuse previous club data", async () => {
  const calls: any[] = []; let current: any = { data: 0n, isPending: false, isFetching: false }; let retries = 0;
  (globalThis as any).__task048Read = (args: any) => { calls.push(args); return { ...current, refetch: () => { retries++; } }; };
  try {
    const mod = await productionModule("src/hooks/useSavingsClub.ts", { wagmi: "export const useReadContract=(x)=>globalThis.__task048Read(x); export const useReadContracts=()=>{throw Error('unexpected club multicall')};" });
    assert.equal(mod.useCycleCapability(CLUB).capability, "supported");
    assert.equal(calls.at(-1).address, CLUB); assert.equal(calls.at(-1).chainId, 5042002);
    assert.equal(calls.at(-1).functionName, "cycleStartRound"); assert.equal(calls.at(-1).query.retry, false);
    assert.equal(calls.at(-1).query.placeholderData({ data: 1n }), undefined);
    current = { data: undefined, isPending: true, isFetching: true };
    assert.equal(mod.useCycleCapability(NEXT_CLUB).capability, "checking"); assert.equal(calls.at(-1).address, NEXT_CLUB);
    current = { error: getterError(3, "execution reverted"), isPending: false, isFetching: false };
    assert.equal(mod.useCycleCapability(NEXT_CLUB).capability, "unsupported");
    current = { error: Error("offline"), isPending: false, isFetching: false };
    const failed = mod.useCycleCapability(NEXT_CLUB); assert.equal(failed.capability, "error"); failed.refetch(); assert.equal(retries, 1);
    current = { data: 2n, isPending: false, isFetching: false };
    assert.equal(mod.useCycleCapability(NEXT_CLUB).capability, "supported");
  } finally { delete (globalThis as any).__task048Read; }
});

test("T048 both real completed panels distinguish4states in VI/EN while claims and create remain usable", async () => {
  try {
    for (const name of ["ActionPanel", "PasskeyActionPanel"]) {
      const mod = await productionModule(`src/components/savings/${name}.tsx`, {
        react: reactBoundary,
        wagmi: `export const useAccount=()=>({address:'${ACCOUNT}',chainId:5042002}); export const useSwitchChain=()=>({switchChain(){}}); export const useWaitForTransactionReceipt=()=>({isLoading:false,isSuccess:false});`,
        connectkit: "export const useModal=()=>({setOpen(){}});",
        sonner: "export const toast={success(){},error(){}};",
        "../../hooks/useArcWriteContract": "export const useArcWriteContract=()=>({writeContract:(x)=>globalThis.__task048PanelWrites.push(x),reset(){},isPending:false});",
      });
      for (const language of ["vi", "en"]) for (const cycleCapability of ["supported", "unsupported", "checking", "error"]) {
        let create = 0, payout = 0, collateral = 0, retry = 0;
        (globalThis as any).__task048PanelWrites = [];
        const ui = lifecycle(mod[name], { ...basePanelProps, language, cycleCapability, onOpenCreateModal: () => { create++; }, onClaimPayout: () => { payout++; }, onClaimCollateral: () => { collateral++; }, onRetryCycleCapability: () => { retry++; } });
        const tree = ui.render(); const content = textOf(tree);
        const restart = nodes(tree).find(n => n.type === "button" && /Start New Cycle|Mở Chu Kỳ/i.test(textOf(n)));
        if (name === "ActionPanel" && cycleCapability === "supported") { assert.ok(restart && !restart.props.disabled); restart.props.onClick(); assert.equal((globalThis as any).__task048PanelWrites[0].functionName, "startNewCycle"); }
        else { assert.ok(!restart || restart.props.disabled, `${name}/${cycleCapability}: cannot restart`); assert.equal((globalThis as any).__task048PanelWrites.length, 0); }
        if (cycleCapability === "supported") assert.ok(content.includes(t("actionPanel.cycleRestartNotice", language)));
        else assert.ok(!content.includes(t("actionPanel.cycleRestartNotice", language)), `${name}/${cycleCapability}: no false restart promise`);
        if (cycleCapability === "unsupported") assert.match(content, language === "en" ? /does not support|doesn't support|not support/i : /không hỗ trợ/i);
        if (cycleCapability === "checking") assert.match(content, language === "en" ? /checking|verifying/i : /đang kiểm tra|đang xác minh/i);
        if (cycleCapability === "error") assert.match(content, language === "en" ? /could not|unable|cannot verify|unavailable/i : /chưa thể|không thể|chưa xác minh/i);
        const createBtn = nodes(tree).find(n => n.type === "button" && n.props.onClick && /Create.*Club|Tạo.*Nhóm/i.test(textOf(n)));
        assert.ok(createBtn, `${name}/${cycleCapability}: existing create flow available`); createBtn.props.onClick(); assert.equal(create, 1);
        const claimBtn = nodes(tree).find(n => n.type === "button" && textOf(n) === t("actionPanel.claimNowBtn", language).replace("{amount}", "1.00"));
        assert.ok(claimBtn && !claimBtn.props.disabled, `${name}/${cycleCapability}: payout remains usable`); claimBtn.props.onClick(); assert.equal(payout, 1);
        const collateralBtn = nodes(tree).find(n => n.type === "button" && /claim|rút|nhận/i.test(textOf(n)) && /collateral|ký quỹ/i.test(textOf(n)));
        assert.ok(collateralBtn && !collateralBtn.props.disabled, `${name}/${cycleCapability}: collateral remains usable`); collateralBtn.props.onClick(); assert.equal(collateral, 1);
        if (cycleCapability === "error") { const button = nodes(tree).find(n => n.type === "button" && /retry|check again|thử lại|kiểm tra lại/i.test(textOf(n))); assert.ok(button); button.props.onClick(); assert.equal(retry, 1); }
        if (cycleCapability === "checking") { const button = nodes(tree).find(n => n.type === "button" && /check again|kiểm tra lại/i.test(textOf(n))); assert.ok(button?.props.disabled); }
      }
    }
  } finally { delete (globalThis as any).__task048Hooks; delete (globalThis as any).__task048PanelWrites; }
});

test("T048 actual write hook preflights restart after chain guard and blocks stale, failed or duplicate submissions", async () => {
  let account = { address: ACCOUNT, chainId: 1 }; const events: any[] = [];
  let switchWait = deferred<any>(), simulateWait = deferred<any>();
  let switchFailure: Error | undefined, simulateFailure: Error | undefined;
  (globalThis as any).__task048Wallet = {
    getAccount: () => account,
    switchChain: async (_config: any, args: any) => { events.push(["switch", args]); if (switchFailure) throw switchFailure; await switchWait.promise; account = { ...account, chainId: args.chainId }; return { id: args.chainId }; },
    simulateContract: async (_config: any, args: any) => { events.push(["simulate", args]); if (simulateFailure) throw simulateFailure; await simulateWait.promise; return { request: args }; },
    writeContract: (args: any, options: any) => events.push(["write", args, options]),
    error: (message: any) => events.push(["error", message]),
  };
  try {
    const mod = await productionModule("src/hooks/useArcWriteContract.ts", {
      react: reactBoundary,
      wagmi: "export const useConfig=()=>({}); export const useWriteContract=()=>({writeContract:(...x)=>globalThis.__task048Wallet.writeContract(...x),reset(){},isPending:false});",
      "@wagmi/core": "export const getAccount=(...x)=>globalThis.__task048Wallet.getAccount(...x); export const switchChain=(...x)=>globalThis.__task048Wallet.switchChain(...x); export const simulateContract=(...x)=>globalThis.__task048Wallet.simulateContract(...x);",
      sonner: "export const toast={error:(...x)=>globalThis.__task048Wallet.error(...x)};",
    });
    const ui = lifecycle(() => mod.useArcWriteContract(), {});
    let hook = ui.render();
    const request = { address: CLUB, abi: parseAbi(["function startNewCycle()"]), functionName: "startNewCycle", chainId: 5042002, args: [] };
    let settled = 0;
    const options = { onSuccess() {}, onSettled() { settled++; } };
    hook.writeContract(request, options); hook.writeContract(request, options);
    await tick(); assert.deepEqual(events.map(e => e[0]), ["switch"]); assert.equal(ui.render().isPending, true);
    switchWait.resolve(undefined); await tick();
    assert.deepEqual(events.map(e => e[0]), ["switch", "simulate"]);
    assert.equal(events[1][1].account, ACCOUNT); assert.equal(events[1][1].address, CLUB); assert.equal(events[1][1].chainId, 5042002); assert.equal(events[1][1].functionName, "startNewCycle"); assert.deepEqual(events[1][1].args, []);
    simulateWait.resolve(undefined); await tick();
    assert.deepEqual(events.map(e => e[0]), ["switch", "simulate", "write"]);
    assert.equal(events[2][1].address, CLUB); assert.equal(events[2][1].functionName, "startNewCycle"); assert.equal(events[2][2].onSuccess, options.onSuccess);
    for (const key of ["gas", "gasPrice", "maxFeePerGas", "maxPriorityFeePerGas"]) assert.equal(events[2][1][key], undefined);
    assert.equal(ui.render().isPending, false);
    ui.render().writeContract(request); await tick(); assert.equal(events.filter(e => e[0] === "write").length, 1, "submission lock covers wallet mutation render gap");
    events[2][2].onSettled(); assert.equal(settled, 1);

    for (const failure of [Error("execution reverted"), Error("RPC offline")]) {
      events.length = 0; simulateFailure = failure; hook = ui.render(); hook.writeContract(request); await tick();
      assert.deepEqual(events.map(e => e[0]), ["simulate", "error"]); assert.equal(ui.render().isPending, false); assert.ok(ui.render().error);
    }
    simulateFailure = undefined; events.length = 0; hook = ui.render(); hook.writeContract(request); await tick();
    assert.deepEqual(events.map(e => e[0]), ["simulate", "write"], "retry after failed preflight succeeds");
    events[1][2].onSettled();

    for (const context of [{ address: OTHER, chainId: 5042002 }, { address: ACCOUNT, chainId: 1 }]) {
      account = { address: ACCOUNT, chainId: 5042002 }; events.length = 0; simulateWait = deferred();
      hook = ui.render(); hook.writeContract(request); await tick(); assert.equal(events[0][0], "simulate");
      account = context; simulateWait.resolve(undefined); await tick();
      assert.equal(events.filter(e => e[0] === "write").length, 0, "stale account/chain preflight cannot write"); assert.equal(events.at(-1)[0], "error"); assert.equal(ui.render().isPending, false);
    }
    account = { address: ACCOUNT, chainId: 5042002 }; events.length = 0;
    ui.render().writeContract({ ...request, account: OTHER }); await tick(); assert.deepEqual(events.map(e => e[0]), ["error"], "requested sender cannot differ from connected account");
    account = { address: ACCOUNT, chainId: 1 }; events.length = 0; switchWait = deferred();
    ui.render().writeContract(request); await tick(); account = { address: OTHER, chainId: 1 }; switchWait.resolve(undefined); await tick();
    assert.deepEqual(events.map(e => e[0]), ["switch", "error"], "account changed while switching cannot start simulation");
    account = { address: ACCOUNT, chainId: 1 }; events.length = 0; switchFailure = Error("User rejected switch");
    ui.render().writeContract(request); await tick(); assert.deepEqual(events.map(e => e[0]), ["switch", "error"]); assert.equal(ui.render().isPending, false);
    switchFailure = undefined; account = { address: ACCOUNT, chainId: 5042002 }; events.length = 0;
    for (const functionName of ["approve", "contribute", "claimPayout", "claimCollateral"]) { ui.render().writeContract({ ...request, functionName }); await tick(); }
    assert.deepEqual(events.map(e => e[0]), ["write", "write", "write", "write"], "other operations do not receive restart simulation");
  } finally { delete (globalThis as any).__task048Hooks; delete (globalThis as any).__task048Wallet; }
});

test("T048 App supplies current club capability and retry to both wallet panels", () => {
  const source = fs.readFileSync("src/App.tsx", "utf8");
  assert.match(source, /useCycleCapability\(contractAddress\)/);
  assert.equal(source.match(/cycleCapability=\{cycleSupport\.capability\}/g)?.length, 2);
  assert.equal(source.match(/onRetryCycleCapability=\{\(\) => \{ void cycleSupport\.refetch\(\); \}\}/g)?.length, 2);
});
