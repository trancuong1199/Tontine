// task-063 independent Tester suite: partial liquidation UI (spec docs/ba/task-063/spec-v1.md, REQ-02).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const hook = read('src/hooks/useBondedClub.ts');
const workspace = read('src/components/savings/BondedClubWorkspace.tsx');
const config = read('src/config/bonded-tontine.ts');
const i18n = read('src/lib/i18n.ts');
const artifact = JSON.parse(read('contracts/out/BondedTontine.sol/BondedTontine.json')) as {
  abi: Array<{ type: string; name?: string; inputs?: Array<{ type: string }>; outputs?: Array<{ type: string }> }>;
};

const abiFn = (name: string) => artifact.abi.find((x) => x.type === 'function' && x.name === name);
const panelStart = workspace.indexOf('data-testid="bonded-partial-liquidation"');
const panel = workspace.slice(panelStart, workspace.indexOf('</details>', panelStart));
const handlerStart = workspace.indexOf('const handleLiquidate');
const handler = workspace.slice(handlerStart, workspace.indexOf('// Mock oracle price update', handlerStart));

test('AC-02 prerequisite: compiled ABI used by the frontend exposes the liquidation surface', () => {
  assert.deepEqual(abiFn('liquidate')?.inputs?.map((i) => i.type), ['uint256']);
  assert.deepEqual(abiFn('liquidate')?.outputs?.map((i) => i.type), ['uint256', 'uint256']);
  for (const name of ['liquidationThresholdBps', 'maxLiquidatableDebt', 'isLiquidatable', 'LIQUIDATION_BONUS_BPS']) {
    assert.ok(abiFn(name), name);
  }
  assert.deepEqual(abiFn('previewLiquidation')?.inputs?.map((i) => i.type), ['uint256']);
  assert.ok(artifact.abi.some((x) => x.type === 'event' && x.name === 'PartiallyLiquidated'));
  assert.ok(artifact.abi.some((x) => x.type === 'error' && x.name === 'NotLiquidatable'));
});

test('AC-02a useBondedClub reads liquidationThresholdBps and maxLiquidatableDebt, null on legacy clubs', () => {
  assert.match(hook, /liquidationThresholdBps:\s*bigint \| null;/);
  assert.match(hook, /maxLiquidatableDebt:\s*bigint \| null;/);
  assert.ok(hook.includes('readClub<bigint>("liquidationThresholdBps").catch(() => null)'));
  assert.ok(hook.includes('readClub<bigint>("maxLiquidatableDebt").catch(() => null)'));
  // initial snapshot defaults are null and both are returned in the snapshot
  assert.ok((hook.match(/liquidationThresholdBps: null,/g) ?? []).length >= 1);
  assert.ok((hook.match(/maxLiquidatableDebt: null,/g) ?? []).length >= 1);
  assert.match(hook, /liquidationThresholdBps,\s*\n\s*maxLiquidatableDebt,/);
});

test('AC-02b keeper section renders the partial-liquidation panel only for clubs that support it', () => {
  assert.ok(panelStart > 0, 'panel testid present');
  const keeperStart = workspace.indexOf('data-testid="bonded-keeper-actions"');
  assert.ok(keeperStart > 0 && keeperStart < panelStart, 'panel lives inside the keeper section');
  assert.ok(workspace.includes('const liquidationSupported = club.liquidationThresholdBps !== null && club.maxLiquidatableDebt !== null;'));
  assert.ok(workspace.includes('{club.state === BONDED_STATE.ACTIVE && (\n                <div data-testid="bonded-partial-liquidation"'));
  assert.ok(workspace.includes('open={(canFinalize || canDeclareDefault || canLiquidate) || undefined}'));
});

test('AC-02b panel shows threshold, button, amount input defaulting to max and estimated cirBTC', () => {
  assert.ok(panel.includes('formatAdaptivePercent((club.liquidationThresholdBps ?? 0n) * 10_000n)'), 'threshold shown');
  assert.ok(panel.includes('"Partial liquidation"'));
  assert.ok(panel.includes('"Thanh lý một phần cọc"'));
  assert.ok(panel.includes('onClick={handleLiquidate}'));
  assert.ok(panel.includes('disabled={isPending || !canLiquidate}'));
  assert.ok(panel.includes('value={liquidateInput}'));
  assert.ok(panel.includes('placeholder={formatUsdcExact(club.maxLiquidatableDebt ?? 0n)}'), 'max shown as default');
  assert.ok(panel.includes('displayUsdc(club.maxLiquidatableDebt ?? 0n)'));
  assert.ok(panel.includes('formatUnitsExact(liquidateEstimatedCirBtc, 8)'), 'estimated cirBTC');
  assert.ok(panel.includes('{liquidateDisabledReason && ('), 'disabled reason');
  // estimate uses the 5% bonus and is capped at the collateral
  assert.ok(workspace.includes('(liquidateRequested * 10_500n * club.collateral) / (10_000n * club.collateralValueUsdc)'));
  assert.ok(workspace.includes('return est > club.collateral ? club.collateral : est;'));
});

test('AC-02b canLiquidate gates on support, wallet, ACTIVE, fresh oracle and a positive max', () => {
  const start = workspace.indexOf('const canLiquidate =');
  const gate = workspace.slice(start, workspace.indexOf(';', start));
  for (const part of [
    'liquidationSupported',
    'Boolean(userAddress)',
    '!isPasskeyUser',
    'club.state === BONDED_STATE.ACTIVE',
    '!club.oracleError',
    '(club.maxLiquidatableDebt ?? 0n) > 0n',
  ]) {
    assert.ok(gate.includes(part), part);
  }
  const reasonStart = workspace.indexOf('const liquidateDisabledReason');
  const reasons = workspace.slice(reasonStart, workspace.indexOf('const declareDefaultDisabledReason', reasonStart));
  for (const msg of [
    'This club predates partial liquidation',
    'Club not in active state',
    'Oracle price stale or invalid',
    'Position is healthy above the liquidation threshold',
  ]) {
    assert.ok(reasons.includes(msg), msg);
  }
});

test('AC-02b handleLiquidate defaults to max, caps at max, uses exact USDC approval and calls liquidate', () => {
  assert.ok(handlerStart > 0);
  assert.ok(handler.includes('const maxRepay = club.maxLiquidatableDebt ?? 0n;'));
  assert.ok(handler.includes('let amt = maxRepay;'), 'empty input defaults to max');
  assert.ok(handler.includes('if (amt <= 0n) throw new Error();'), 'rejects non-positive');
  assert.ok(handler.includes('if (amt > maxRepay) amt = maxRepay;'), 'capped at max');
  assert.ok(handler.includes('await ensureExactUsdcApproval(amt);'), 'exact approval');
  assert.ok(!/approve[^]*maxUint256/.test(handler), 'no infinite approval');
  assert.ok(handler.includes('functionName: "liquidate"'));
  assert.ok(handler.includes('args: [amt]'));
  assert.ok(handler.indexOf('ensureExactUsdcApproval(amt)') < handler.indexOf('functionName: "liquidate"'));
});

test('AC-02c disclosure and i18n copy no longer claim price drops never trigger liquidation', () => {
  for (const banned of [
    'there is no price-based liquidation',
    'không có thanh lý theo giá',
    'price drops do not trigger liquidation',
    'giá giảm không kích hoạt thanh lý',
    'BTC price drops do not trigger liquidation',
    'Giá BTC giảm không tự kích hoạt thanh lý',
  ]) {
    assert.ok(!config.includes(banned), `config: ${banned}`);
    assert.ok(!i18n.includes(banned), `i18n: ${banned}`);
    assert.ok(!workspace.includes(banned), `workspace: ${banned}`);
  }
  assert.ok(config.includes('partially liquidate'));
  assert.ok(config.includes('thanh lý một phần'));
  assert.ok(i18n.includes('anyone can partially liquidate'));
  assert.ok(i18n.includes('ai cũng có thể thanh lý một phần'));
});
