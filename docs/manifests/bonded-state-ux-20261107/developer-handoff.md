# Developer handoff — state-aware bonded UX

Ready for independent test against spec-v1. Eight changed source files frozen in manifest.json. Task-059 refreshed via npm run manifest:freeze using exactly the previous 22 paths, preserving baseline metadata; superseded manifest retained locally as ignored log, without retroactively asserting historical QA. Both manifests verify exit0.

Validation: npm run typecheck exit0; npm run build exit0 (existing dependency annotation/chunk warnings); focused bilingual terminal SSR/zero recovery/unknown states and exact amount-duration-coverage validation exit0; focused non-mutating lint exit0; git diff --check exit0. Raw logs are ignored local artifacts. Actual browser checks remain Tester-owned and pending.

Terminal views preserve eligible paid-interest, principal USDC+cirBTC recovery and residual owner collateral withdrawal; cancellation never offers withdrawPrincipal. Unknown balances have retry, zero recovery is explicit. Full OPEN funding is hidden; full ACTIVE eligible members still contribute with existing pre-approval and post-approval risk/context guards. Mobile controls call the same handlers, or scroll/focus the required unchecked risk control, with safe-area padding and lower z-index than modals. A synchronous action lock protects desktop/mobile duplicate clicks.

Hook snapshot additions for fixtures: financialsAvailable:true for valid financial reads; positionAvailable:true only when required wallet reads succeed; memberContributions:{lowercaseAddress:boolean|null}; memberContributionRound:currentRoundIndex only for valid ACTIVE rounds. Failed contribution reads are null; account/club context and request sequence prevent stale request overwrite.

Stable browser targets: bonded-terminal-view, terminal-position, bonded-mobile-action-bar, bonded-workspace, bonded-member-actions, bonded-owner-actions, member-payment-status, bonded-collateral-summary, create-bonded-body, create-bonded-essential-terms and create-bonded-footer. Modal body is the scrolling form; consent and submit are separate non-scrolling footer, associated via form id. Test 1440×900,390×844,390×667 and both languages with identified fixtures; no signing needed.

No contracts, tests, live oracle, service activation, Git index or commits changed by Developer. Source edits stopped after freeze.

## Duration retest handoff

Fixed the browser-discovered raw cycle duration and overdue seconds in BondedClubWorkspace only. Both now use localized human-duration formatting; handlers are unchanged. Focused duration validation and typecheck exit0. Same8-file task manifest and original22-file task059 manifest re-frozen, both verify exit0; browser retest remains Tester-owned.

Final copy-only handoff: removed the user-visible DefaultPending parenthetical from both languages, preserving human explanation and all guards. Same8 and task059same22 manifests re-frozen and verified exit0.
