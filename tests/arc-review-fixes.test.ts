import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { encodeDeployData, decodeAbiParameters } from "viem";
import {
  formatUsdc, parseUsdc, formatCirBtc, parseContractError,
  getCirBtcDeploymentAddress, USDC_ADDRESS, USDC_DECIMALS, ARC_TESTNET_CHAIN_ID,
  ROTATING_SAVINGS_ABI, ROTATING_SAVINGS_BYTECODE,
} from "../src/contract.ts";
import { getUsdc, requireChain } from "../src/onchain-facts.ts";
import { ensureArcChain } from "../src/lib/arcWallet.ts";
import { historyRoundIds } from "../src/lib/roundHistory.ts";

const require = createRequire(import.meta.url);
const read = (p: string) => fs.readFileSync(p, "utf8");

// Execute compiled production modules with only browser/wallet boundaries replaced.
async function productionModule(entry: string, mocks: Record<string, string>) {
  const result = await build({
    entryPoints: [entry], bundle: true, write: false, platform: "node", format: "cjs",
    packages: "external", logLevel: "silent",
    plugins: [{ name: "qa-boundaries", setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: "qa-boundary" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "qa-boundary" }, args => ({ contents: mocks[args.path], loader: "js" }));
    } }],
  });
  const module = { exports: {} as any };
  new Function("module", "exports", "require", result.outputFiles[0].text)(module, module.exports, require);
  return module.exports;
}

test("T044-MONEY: actual bigint parsing and half-up formatting preserve large values", () => {
  assert.equal(parseUsdc("9007199254740993.123456"), 9007199254740993123456n);
  assert.equal(formatUsdc(9007199254740993123456n), "9,007,199,254,740,993.12");
  assert.equal(formatUsdc(1999999n), "2.00");
  assert.equal(formatUsdc(1004999n), "1.00");
  assert.equal(formatUsdc(1005000n), "1.01");
  assert.equal(formatUsdc(0n), "0.00");
  assert.equal(parseUsdc(" .5 "), 500000n);
  assert.equal(parseUsdc("00012.3456789"), 12345678n);
  for (const input of ["", "bad", "-1", "1e3", "Infinity", "1,000", "1.2.3"]) assert.equal(parseUsdc(input), 0n, input);
  assert.equal(formatCirBtc(900719925474099312345678n), "9,007,199,254,740,993.123456");
});

test("T044-ERROR-FACTS: error semantics and registry constants", () => {
  const ended = parseContractError(new Error("RoundEnded"));
  const stillOpen = parseContractError(new Error("RoundStillOpen"));
  assert.notEqual(ended, stillOpen);
  assert.match(ended, /đã kết thúc/i);
  assert.match(stillOpen, /chưa kết thúc/i);
  assert.equal(USDC_ADDRESS, getUsdc(ARC_TESTNET_CHAIN_ID)?.address);
  assert.equal(USDC_DECIMALS, 6);
  assert.equal(ARC_TESTNET_CHAIN_ID, requireChain(5042002).chainId);
});

test("T044-DEPLOY: seven-argument artifact encodes configured collateral token and rejects invalid override", () => {
  const token = "0x1111111111111111111111111111111111111111";
  assert.equal(getCirBtcDeploymentAddress(token), token);
  for (const value of ["", "garbage", "0x1234", "0x0000000000000000000000000000000000000000"]) {
    assert.throws(() => getCirBtcDeploymentAddress(value), /nonzero token address/);
  }
  const ctor = ROTATING_SAVINGS_ABI.find((x: any) => x.type === "constructor")!;
  assert.equal(ctor.inputs.length, 7);
  assert.equal(ctor.inputs[5].name, "cirBtcToken_");
  const args = [USDC_ADDRESS, 10_000_000n, 3n, 86400n, "QA club", token, 0n] as const;
  const encoded = encodeDeployData({ abi: ROTATING_SAVINGS_ABI, bytecode: ROTATING_SAVINGS_BYTECODE, args });
  const decoded = decodeAbiParameters(ctor.inputs, `0x${encoded.slice(ROTATING_SAVINGS_BYTECODE.length)}`);
  assert.deepEqual(decoded, args);
  assert.match(ROTATING_SAVINGS_BYTECODE, /^0x[0-9a-f]+$/i);
  assert.ok(ROTATING_SAVINGS_BYTECODE.length > 1000);
});

test("T044-CHAIN: switching must resolve before continuation; reject and wrong result block continuation", async () => {
  let resolveSwitch!: (value: { id: number }) => void;
  const pending = new Promise<{ id: number }>(resolve => { resolveSwitch = resolve; });
  const order: string[] = [];
  const action = ensureArcChain({ getChainId: () => 1, chainId: 5042002, switchChain: async id => {
    assert.equal(id, 5042002); order.push("switch"); return pending;
  } }).then(() => order.push("write"));
  await Promise.resolve(); assert.deepEqual(order, ["switch"]);
  resolveSwitch({ id: 5042002 }); await action; assert.deepEqual(order, ["switch", "write"]);
  let writes = 0;
  await assert.rejects(ensureArcChain({ getChainId: () => 1, chainId: 5042002, switchChain: async () => { throw Error("rejected"); } }).then(() => writes++), /rejected/);
  await assert.rejects(ensureArcChain({ getChainId: () => 1, chainId: 5042002, switchChain: async () => ({ id: 1 }) }).then(() => writes++), /did not switch/);
  await ensureArcChain({ getChainId: () => 5042002, chainId: 5042002, switchChain: async () => { throw Error("unexpected switch"); } }).then(() => writes++);
  assert.equal(writes, 1);
});

test("T044-HISTORY: real hook caps calls and maps sparse results to original round IDs", async () => {
  for (const n of [undefined, 0n, 1n, 49n, 50n, 51n, 100n, 9007199254740993n]) {
    const ids = historyRoundIds(n);
    assert.equal(ids.length, !n ? 0 : Number(n > 50n ? 50n : n));
    if (n) { assert.equal(ids.at(-1), n); assert.equal(ids[0], n > 50n ? n - 49n : 1n); }
  }
  let captured: any;
  const summary = (settled: boolean) => [1n, 2n, "0x1111111111111111111111111111111111111111", 10n, 2n, settled];
  (globalThis as any).__task044Reads = (options: any) => {
    captured = options;
    return { data: [{ result: summary(true) }, { status: "failure", error: Error("RPC") }, { result: summary(false) }, { result: summary(true) }], isLoading: false, refetch() {} };
  };
  try {
    const hooks = await productionModule("src/hooks/useSavingsClub.ts", {
      wagmi: "export const useReadContracts = (...args) => globalThis.__task044Reads(...args); export const useReadContract = useReadContracts;",
    });
    const result = hooks.useRoundHistory(100n);
    assert.equal(captured.contracts.length, 50);
    assert.deepEqual(captured.contracts[0].args, [51n]);
    assert.deepEqual(result.settledRounds.map((round: any) => round.roundId), [51n, 54n]);
    assert.equal(result.historyStartRound, 51n); assert.equal(result.isHistoryLimited, true);
    hooks.useRoundHistory(undefined); assert.equal(captured.contracts.length, 0); assert.equal(captured.query.enabled, false);
  } finally { delete (globalThis as any).__task044Reads; }
});

test("T044-SESSION: fresh restore reads valid public metadata, purges legacy, tolerates storage failures", async () => {
  const session = new Map<string, string>(); const local = new Map<string, string>();
  let persistentWrites = 0;
  const priorSession = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const priorLocal = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const storage = (map: Map<string, string>) => ({ getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v), removeItem: (k: string) => map.delete(k) });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage(session) });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { ...storage(local), setItem() { persistentWrites++; } } });
  try {
    const mod = await productionModule("src/lib/passkeySession.ts", {});
    const credential = { id: "qa-credential", publicKey: `0x${"11".repeat(64)}` };
    local.set(mod.CREDENTIAL_KEY, JSON.stringify(credential));
    assert.equal(mod.loadStoredCredential(), null); assert.equal(local.has(mod.CREDENTIAL_KEY), false);
    mod.saveCredential({ ...credential, raw: { private: "must never persist" } });
    assert.deepEqual(JSON.parse(session.get(mod.CREDENTIAL_KEY)!), credential);
    const fresh = await productionModule("src/lib/passkeySession.ts", {});
    assert.deepEqual(fresh.loadStoredCredential(), credential, "reload has no memory fallback to mask malformed validator");
    fresh.clearCredential(); assert.equal(session.has(mod.CREDENTIAL_KEY), false);
    session.set(mod.CREDENTIAL_KEY, "{malformed"); assert.equal(fresh.loadStoredCredential(), null);
    session.set(mod.CREDENTIAL_KEY, JSON.stringify({ id: "bad", publicKey: "0x12" })); assert.equal(fresh.loadStoredCredential(), null);
    const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); }, removeItem() { throw Error("blocked"); } };
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: blocked });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: blocked });
    assert.doesNotThrow(() => fresh.saveCredential(credential)); assert.deepEqual(fresh.loadStoredCredential(), credential);
    assert.doesNotThrow(() => fresh.clearCredential()); assert.equal(fresh.loadStoredCredential(), null);
    assert.equal(persistentWrites, 0);
  } finally {
    if (priorSession) Object.defineProperty(globalThis, "sessionStorage", priorSession); else delete (globalThis as any).sessionStorage;
    if (priorLocal) Object.defineProperty(globalThis, "localStorage", priorLocal); else delete (globalThis as any).localStorage;
  }
});

test("T044-EXISTING-CLUB: collateral reads use selected contract token instead of deployment default", async () => {
  const selectedClub = "0x2222222222222222222222222222222222222222";
  const selectedToken = "0x3333333333333333333333333333333333333333";
  let getter: any; let reads: any;
  (globalThis as any).__task044SingleRead = (args: any) => { getter = args; return { data: selectedToken }; };
  (globalThis as any).__task044Reads = (args: any) => { reads = args; return { data: [], refetch() {} }; };
  try {
    const hooks = await productionModule("src/hooks/useSavingsClub.ts", {
      wagmi: "export const useReadContracts=(...a)=>globalThis.__task044Reads(...a); export const useReadContract=(...a)=>globalThis.__task044SingleRead(...a);",
    });
    const result = hooks.useMemberStatus("0x4444444444444444444444444444444444444444", selectedClub);
    assert.equal(getter.address, selectedClub); assert.equal(getter.functionName, "cirBtcToken");
    assert.equal(result.collateralToken, selectedToken);
    for (const read of reads.contracts.filter((x: any) => ["balanceOf", "allowance"].includes(x.functionName))) {
      assert.equal(read.address, selectedToken);
    }
    const allowance = reads.contracts.find((x: any) => x.functionName === "allowance");
    assert.equal(allowance.args[1], selectedClub);
  } finally { delete (globalThis as any).__task044SingleRead; delete (globalThis as any).__task044Reads; }
});

test("T044-GUARDED-HOOK: production wrapper waits, reports rejected switch and rechecks approval follow-up", async () => {
  let chainId = 1; let reject = false; let release!: () => void;
  const events: any[] = []; let pending = new Promise<void>(resolve => { release = resolve; });
  (globalThis as any).__task044Wallet = {
    getAccount: () => ({ chainId }),
    switchChain: async (_config: unknown, args: any) => { events.push(["switch", args.chainId]); await pending; if (reject) throw Error("User rejected switch"); chainId = args.chainId; return { id: chainId }; },
    writeContract: (args: any) => events.push(["write", args.chainId, args.functionName]),
    toast: (message: string) => events.push(["error", message]),
  };
  try {
    const mod = await productionModule("src/hooks/useArcWriteContract.ts", {
      react: "export const useRef = value => ({current:value}); export const useState = value => [value, () => {}]; export const useEffect = effect => effect();",
      wagmi: "export const useConfig=()=>({}); export const useWriteContract=()=>({writeContract:(...a)=>globalThis.__task044Wallet.writeContract(...a), reset(){}});",
      "@wagmi/core": "export const getAccount=(...a)=>globalThis.__task044Wallet.getAccount(...a); export const switchChain=(...a)=>globalThis.__task044Wallet.switchChain(...a); export const simulateContract=()=>{throw Error('unexpected restart simulation in non-restart regression')};",
      sonner: "export const toast={error:(...a)=>globalThis.__task044Wallet.toast(...a)};",
    });
    const hook = mod.useArcWriteContract();
    hook.writeContract({ functionName: "approve", chainId: 5042002 });
    await Promise.resolve(); assert.deepEqual(events, [["switch", 5042002]]);
    release(); await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(events.at(-1), ["write", 5042002, "approve"]);
    chainId = 1; reject = true; pending = Promise.resolve();
    hook.writeContract({ functionName: "contribute", chainId: 5042002 });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(events.filter(x => x[0] === "write").length, 1);
    assert.equal(events.at(-1)[0], "error");
    chainId = 5042002; reject = false;
    hook.writeContract({ functionName: "claimPayout", chainId: 5042002 });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(events.at(-1), ["write", 5042002, "claimPayout"]);
    assert.equal(events.filter(x => x[0] === "switch").length, 2);
  } finally { delete (globalThis as any).__task044Wallet; }
});

test("T044-INTEGRATION: guarded write hook and registry transport are wired into savings entry points", () => {
  for (const file of ["src/App.tsx", "src/components/savings/ActionPanel.tsx"]) {
    const source = read(file);
    assert.match(source, /useArcWriteContract/);
    assert.doesNotMatch(source, /useWriteContract\s*\(/);
  }
  const config = read("src/config.ts");
  assert.match(config, /requireChain/); assert.doesNotMatch(config, /https:\/\/rpc\.testnet\.arc\.io/);
  const passkey = read("src/hooks/usePasskeyWallet.ts");
  assert.match(passkey, /toModularTransport/); assert.match(passkey, /toPasskeyTransport/);
  assert.match(passkey, /createBundlerClient\(\{ chain: arcTestnet, transport: modularTransport \}\)/);
  assert.doesNotMatch(passkey, /RPC_PROXY_TOKEN|localStorage\.setItem/);
  const savings = read("src/hooks/useSavingsClub.ts");
  assert.doesNotMatch(savings, /useBalance\(/);
  assert.match(savings, /functionName: "balanceOf"/);
});
