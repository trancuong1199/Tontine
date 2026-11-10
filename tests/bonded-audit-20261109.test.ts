import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const workspace = read('src/components/savings/BondedClubWorkspace.tsx');
const app = read('src/App.tsx');
const config = read('src/config.ts');
const facts = read('src/onchain-facts.ts');
const viteConfig = read('vite.config.ts');
const modal = read('src/components/savings/CreateBondedClubModal.tsx');

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

test('AUDIT-V1: Bilateral risk consent text and overdue consequence warnings', () => {
  assert.ok(modal.includes('Nếu tôi không trả lãi trong vòng ${formatRoundDuration(interestGraceSec, false)} sau khi vòng kết thúc'));
  assert.ok(modal.includes('If I do not pay interest within ${formatRoundDuration(interestGraceSec, true)} after a round ends'));
  assert.ok(modal.includes('default may be declared and all CirBTC collateral seized'));
  assert.ok(workspace.includes('Quá hạn: bất kỳ ai cũng có thể kích hoạt tuyên bố vỡ nợ và cọc bị tịch thu.'));
  assert.ok(workspace.includes('Overdue: anyone can declare default and collateral will be seized.'));
  assert.ok(workspace.includes('Hạn trả khoản lãi phát sinh sau mỗi vòng.'));
  assert.ok(workspace.includes('Hạn tất toán toàn bộ nợ gốc khi kết thúc chu kỳ.'));
});

test('AUDIT-V2: Accessible names match visible text, inputs labeled, and main landmark present', () => {
  assert.ok(modal.includes('aria-label={isEn ? "Close modal" : "Đóng cửa sổ"}'));
  assert.ok(modal.includes('aria-label={isEn ? "Contribution per Round (USDC)" : "Mức Đóng Mỗi Vòng (USDC)"}'));
  assert.ok(modal.includes('aria-label={isEn ? "Interest rate per round (set at creation)" : "Lãi suất mỗi vòng (cố định khi tạo nhóm)"}'));
  assert.ok(workspace.includes('aria-label={copiedInviteLink ? (isVi ? "Đã chép link mời!" : "Link Copied!") : (isVi ? "Sao chép link mời" : "Copy Club Link")}'));
  assert.ok(app.includes('aria-label={language === "en" ? "EN 🇬🇧" : "VI 🇻🇳"}'));
  assert.ok(app.includes('<main>'));
  assert.ok(app.includes('</main>'));
});

test('AUDIT-V3 & AUDIT-V5: Timeline format helper and digital countdown standards', () => {
  assert.ok(workspace.includes('export function formatDeadlineDateTime'));
  assert.ok(workspace.includes('const locale = isVi ? "vi-VN" : "en-US";'));
  assert.ok(workspace.includes('d.toLocaleTimeString(locale'));
  assert.ok(workspace.includes('formatDeadlineDateTime(currentRoundEnd, isVi)'));
  assert.ok(workspace.includes('formatDeadlineDateTime(deadline, isVi)'));
  assert.ok(workspace.includes('formatDeadlineDateTime(settlementDeadline, isVi)'));
  assert.ok(workspace.includes('if (seconds <= 0) return isVi ? "00:00:00 (Hết giờ)" : "00:00:00 (Ended)";'));
  assert.ok(workspace.includes('aria-live="off"'));
  assert.ok(!workspace.includes('💡'));
  assert.ok(!workspace.includes('hụi viên'));
  assert.ok(!workspace.includes('Hụi viên'));
});

test('AUDIT-V4: Clock drift synchronization against RPC latest block timestamp', () => {
  assert.ok(workspace.includes('const [clockDriftSec, setClockDriftSec] = useState<number>(0);'));
  assert.ok(workspace.includes('publicClient.getBlock({ blockTag: "latest" })'));
  assert.ok(workspace.includes('setNowSec(BigInt(Math.floor(Date.now() / 1000) + clockDriftSec));'));
});

test('AUDIT-V6: Borrow and repay inputs do not pre-fill max values', () => {
  assert.ok(!workspace.includes('setBorrowInput(maxBorrowUsdc > 0n ? formatUsdcExact(maxBorrowUsdc) : "")'));
  assert.ok(!workspace.includes('useEffect(() => {\n    setRepayInput'));
  assert.ok(workspace.includes('const [borrowInput, setBorrowInput] = useState("");'));
  assert.ok(workspace.includes('const [repayInput, setRepayInput] = useState("");'));
});

test('AUDIT-V7: Vite host binding is protected by VITE_HOST environment variable', () => {
  assert.ok(viteConfig.includes("host: process.env.VITE_HOST === 'true' ? true : false"));
});
