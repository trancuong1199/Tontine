import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const workspace = read('src/components/savings/BondedClubWorkspace.tsx');
const summary = read('src/components/savings/BondedCollateralSummary.tsx');
const bar = read('src/components/savings/BondedMobileActionBar.tsx');

test('MIN-01 one invite-link control and one address chip in the club view', () => {
  assert.equal((workspace.match(/onClick=\{handleCopyInviteLink\}/g) ?? []).length, 1);
  assert.equal((workspace.match(/onClick=\{handleCopyContractAddress\}/g) ?? []).length, 1);
  assert.ok(!workspace.includes('Copy Club Invite Link'));
});

test('MIN-02 risk detail is consolidated into one collapsible banner in the hero', () => {
  assert.ok(workspace.includes('<BondedRiskBanner club={club} language={language} />'));
  assert.ok(!workspace.includes('<BondedCollateralSummary'));
  assert.ok(summary.includes('data-testid="bonded-risk-banner"'));
  assert.ok(summary.includes('Collateral covers'));
  assert.ok(summary.includes('Cọc bảo đảm'));
});

test('MIN-03 secondary sections are collapsible and keeper actions open when actionable', () => {
  for (const id of ['bonded-details', 'bonded-timeline', 'bonded-roster', 'bonded-keeper-actions']) {
    assert.ok(workspace.includes(`data-testid="${id}"`), id);
  }
  assert.ok(workspace.includes('open={timelineUrgent || undefined}'));
  assert.ok(workspace.includes('open={(canFinalize || canDeclareDefault || canLiquidate) || undefined}'));
});

test('MIN-04 risk acknowledgement still gates join and contribute', () => {
  assert.ok(workspace.includes('data-testid="contribution-risk-warning"'));
  assert.ok(workspace.includes('canJoinWithAcknowledgement'));
  assert.ok(workspace.includes('canContributeWithAcknowledgement'));
});

test('MIN-05 member card hides empty position and zero-claim controls', () => {
  assert.ok(workspace.includes('(club.isMember || club.userDeposit > 0n)'));
  assert.ok(workspace.includes('club.pendingInterest > 0n && ('));
  assert.ok(workspace.includes('(!isOwner || club.userDeposit > 0n || club.pendingInterest > 0n)'));
});

test('MIN-06 toolbar targets are at least 44px and icon-only links are named', () => {
  const toolbar = workspace.slice(workspace.indexOf('data-testid="bonded-toolbar"'), workspace.indexOf('Passkey Wallet Warning'));
  assert.ok((toolbar.match(/min-h-\[44px\]/g) ?? []).length >= 4);
  assert.ok(toolbar.includes('aria-label={isVi ? "Xem nhóm trên Arc Explorer" : "View club on Arc Explorer"}'));
  assert.ok(toolbar.includes('aria-label={isVi ? "Làm mới dữ liệu nhóm" : "Refresh club data"}'));
});

test('MIN-07 mobile bar renders only when there is an action', () => {
  assert.ok(bar.includes('if (!onAction) return null;'));
  assert.ok(!bar.includes('No action needed'));
});

test('MIN-08 secondary text keeps readable contrast', () => {
  assert.ok(!workspace.includes('text-slate-500'));
});
