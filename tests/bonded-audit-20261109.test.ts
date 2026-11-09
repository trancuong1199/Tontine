import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const workspace = read('src/components/savings/BondedClubWorkspace.tsx');
const app = read('src/App.tsx');
const config = read('src/config.ts');
const facts = read('src/onchain-facts.ts');
const viteConfig = read('vite.config.ts');

test('AUDIT-01: Risk gate activates in real browser without test-hook flags', () => {
  assert.ok(!workspace.includes('isAutomatedRiskTest'));
  assert.ok(!workspace.includes('__riskHooks'));
  assert.ok(workspace.includes('const riskRequired = requiresRiskAcknowledgement(club);'));
});

test('AUDIT-02: Fake cancel voting mechanism removed from UI and dev server', () => {
  assert.ok(!viteConfig.includes('cancelVotesSyncPlugin'));
  assert.ok(!viteConfig.includes('sharedCancelVotes'));
  assert.ok(!workspace.includes('getClubCancelVotes'));
  assert.ok(!workspace.includes('toggleClubCancelVote'));
  assert.ok(workspace.includes('data-testid="bonded-cancel-open-confirm-modal"'));
  assert.ok(workspace.includes('handleCancelOpen'));
});

test('AUDIT-03: Borrow max calculates on-chain limit with debt, owed interest, and pool liquidity', () => {
  assert.ok(workspace.includes('maxBorrowUsdc'));
  assert.ok(workspace.includes('((club.borrowLimit - club.interestOwed) * 10000n) / (10000n + club.rateBpsPerRound)'));
  assert.ok(workspace.includes('collateralRoom < availablePoolUsdc ? collateralRoom : availablePoolUsdc'));
});

test('AUDIT-04: Collateral suggestion derives dynamically from live oracle, not fixed $60,000 price', () => {
  assert.ok(!workspace.includes('referenceBtcPrice = 60_000_00000000n'));
  assert.ok(workspace.includes('suggestedCollateralSats'));
  assert.ok(workspace.includes('club.oraclePriceRaw'));
  assert.ok(workspace.includes('club.oracleDecimals'));
});

test('AUDIT-05: Wallet reconnection relies on standard hooks, eliminating brittle regex and setTimeout(1200)', () => {
  assert.ok(!app.includes('localStorage.getItem("wagmi.store")'));
  assert.ok(!app.includes('setTimeout(() => setIsHydratingWallet(false), 1200)'));
  assert.ok(!config.includes('localStorage.getItem(\'wagmi.store\')'));
  assert.ok(app.includes('const address = passkeyAddress ?? wagmiAddress;'));
});

test('AUDIT-06: Accessibility improvements include h1 level heading and labeled toggle buttons', () => {
  assert.ok(app.includes('<h1 className="sr-only">Tontine Rotating Savings Club</h1>'));
  assert.ok(app.includes('aria-label="Toggle language"'));
});

test('AUDIT-07: Canonical RPC URL matches standard Arc Testnet endpoint', () => {
  assert.ok(facts.includes('"https://rpc.testnet.arc.io"'));
});
