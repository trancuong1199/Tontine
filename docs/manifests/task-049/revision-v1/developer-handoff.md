# Task-049 Developer handoff

LOCAL ONLY. Source frozen across 21 assigned paths in manifest.json. Baseline snapshots predate changes, including the additionally authorized useArcWriteContract.ts entry merged without replacing earlier snapshots. implementation.diff compares all files (including ignored deployment scripts) to their actual snapshots. New source: collateralPolicy.ts, useCollateralPolicy.ts, CollateralPreview.tsx.

Implemented constructor argument 7 (requiredCollateral), marker1, two nonReentrant join entrypoints sharing atomic exact-shortfall collection; marker1 UI uses joinGroupWithCollateral(expectedRequirement) so a changed requirement reverts even with a prior large allowance. Deposit accepts only positive amounts up to remaining requirement. startRounds checks all member collateral; contribution/bid require funded locked collateral. Restart, claim/kicked rules, slashing/allocation and payouts retain existing semantics.

Creation requires explicit none/custom, strict exact8 uint256 validation, and submitted name/initial requirement snapshot for receipt metadata. Metadata remains inert: no local storage fallback supplies requirement/debit/allowance/security. Owner none/custom is restricted to confirmed OPEN/zero-members and rechecks chain/context before writing; failed userOps and failed receipts do not produce success. Drafts reset on account/club changes.

A shared Arc-only quote reads policy, token, required, locked, wallet balance, allowance and membership/state. Bigint preview shows exact8 values, deficits and estimated balance; unknown or changed data blocks actions and stale account/club responses are discarded. Legacy and unknown are distinct. The current-account/current-club quote is read again before actions and differences require another review. Newpolicy expectedRequirement also binds the mined join; legacy warning explains that frontend review cannot upgrade old contract semantics or guarantee its debit if requirement changes after review with prior approvals.

EOA approval is exactly shortfall and never auto-submits a collateral transfer after receipt; a new explicit click is required. Passkey uses one reviewed batch containing exact approval only if needed and one join/topup. Both support partial-shortfall topup while OPEN/ACTIVE, block zero deposits, insufficient/unknown balances and double submission, and retain claims/history. Explicit-account injected requests bind account+group context across chain switching; restart-only simulation remains unchanged. USDC approval multipliers are unchanged.

Validation executed:
- Foundry build using /tmp/tontine-task-044-toolchain/node_modules/@foundry-rs/forge-linux-amd64/bin/forge build --use /tmp/tontine-task-044-toolchain/solc-0.8.28 --out /tmp/tontine-task-049-out --cache-path /tmp/tontine-task-049-cache --skip test --skip script: exit0, developer-forge.log. Only target artifact copied, then formatted with baseline2spaces. Existing timestamp lint warnings remain.
- npm run typecheck: exit0 on final source, developer-typecheck.log.
- npm run build: exit0, developer-build.log (dependency annotation and chunk-size warnings). A subsequent narrow explicit-account pending-ref guard received final typecheck; Tester must run final full build on frozen hashes.
- node --check on all six migrated deployment scripts: each exit0, developer-script-check.log; none was executed.
- git diff --check: exit0.
- manifest freeze and verify: exit0, developer-verify.log.

No tests were edited by Developer, no deployment/transaction/wallet confirmation/commit/push ran, no historical deployed metadata or review docs changed. Tester owns constructor fixtures and full independent suites, including actual panel/owner/create hooks, policy lifecycle and artifact compiler equality. Financial enforcement applies to newly compiled contracts only; deployed legacy contracts are not upgraded.
